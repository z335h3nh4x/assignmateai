-- 1. Shared validity rule
CREATE OR REPLACE FUNCTION public.subscription_is_valid(_status text, _period_end timestamptz)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(_status, '') IN ('active', 'trialing')
     AND (_period_end IS NULL OR now() < _period_end);
$$;

REVOKE ALL ON FUNCTION public.subscription_is_valid(text, timestamptz) FROM PUBLIC, anon, authenticated;

-- 2. Lazy per-user reconciliation (idempotent)
CREATE OR REPLACE FUNCTION public.expire_subscription_if_due(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s record;
  ends timestamptz;
BEGIN
  SELECT * INTO s FROM public.subscriptions WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;

  ends := COALESCE(s.current_period_end, s.renewal_at);
  IF ends IS NULL THEN RETURN false; END IF;
  IF s.status NOT IN ('active', 'trialing') THEN RETURN false; END IF;
  IF now() < ends THEN RETURN false; END IF;

  UPDATE public.subscriptions
     SET status = 'expired', updated_at = now()
   WHERE user_id = _user_id;

  INSERT INTO public.audit_logs (action, entity_type, entity_id, target_user_id, metadata)
  VALUES ('subscription.expired', 'subscription', _user_id::text, _user_id,
          jsonb_build_object('plan', s.plan, 'plan_id', s.plan_id, 'period_end', ends));

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_subscription_if_due(uuid) FROM PUBLIC, anon, authenticated;

-- 3. Bulk reconciliation (for scheduled runs)
CREATE OR REPLACE FUNCTION public.reconcile_expired_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  FOR r IN
    SELECT user_id FROM public.subscriptions
     WHERE status IN ('active','trialing')
       AND COALESCE(current_period_end, renewal_at) IS NOT NULL
       AND COALESCE(current_period_end, renewal_at) <= now()
  LOOP
    IF public.expire_subscription_if_due(r.user_id) THEN n := n + 1; END IF;
  END LOOP;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_expired_subscriptions() FROM PUBLIC, anon, authenticated;

-- 4. Plan resolution honours expiry
CREATE OR REPLACE FUNCTION public._resolve_user_plan(_user_id uuid)
RETURNS plans
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s record;
  p public.plans;
  valid boolean := false;
BEGIN
  SELECT plan, plan_id, status, current_period_end, renewal_at INTO s
    FROM public.subscriptions WHERE user_id = _user_id;

  IF FOUND THEN
    valid := public.subscription_is_valid(s.status, COALESCE(s.current_period_end, s.renewal_at));
  END IF;

  IF valid AND s.plan_id IS NOT NULL THEN
    SELECT * INTO p FROM public.plans WHERE id = s.plan_id;
    IF p.id IS NOT NULL THEN RETURN p; END IF;
  END IF;
  IF valid AND s.plan IS NOT NULL THEN
    SELECT * INTO p FROM public.plans WHERE slug = s.plan;
    IF p.id IS NOT NULL THEN RETURN p; END IF;
  END IF;

  SELECT * INTO p FROM public.plans WHERE slug = 'free';
  RETURN p;
END;
$$;

REVOKE ALL ON FUNCTION public._resolve_user_plan(uuid) FROM PUBLIC, anon, authenticated;

-- 5. Entitlements: lazy expiry + subscription state in the payload
CREATE OR REPLACE FUNCTION public.get_entitlements(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.plans; ctr public.usage_counters; s record;
  m_used int:=0; c_used int:=0;
  cycle_start timestamptz; cycle_end timestamptz;
  cycle_len interval := interval '30 days';
  period_end timestamptz;
  sub_status text := 'none';
BEGIN
  IF auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF auth.uid() IS NULL AND current_setting('role', true) NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  PERFORM public.expire_subscription_if_due(_user_id);

  p := public._resolve_user_plan(_user_id);

  SELECT status, current_period_end, renewal_at INTO s
    FROM public.subscriptions WHERE user_id = _user_id;
  IF FOUND THEN
    sub_status := s.status;
    period_end := COALESCE(s.current_period_end, s.renewal_at);
  END IF;

  SELECT * INTO ctr FROM public.usage_counters WHERE user_id=_user_id;
  IF FOUND AND ctr.cycle_started_at IS NOT NULL AND now() < ctr.cycle_started_at + cycle_len THEN
    m_used := ctr.month_used;
    c_used := ctr.credits_used;
    cycle_start := ctr.cycle_started_at;
  ELSE
    cycle_start := now();
  END IF;
  cycle_end := cycle_start + cycle_len;

  RETURN jsonb_build_object(
    'plan', jsonb_build_object('id',p.id,'slug',p.slug,'name',p.name,'features',COALESCE(p.features,'{}'::jsonb),'monthly_limit',p.monthly_limit,'credits',p.credits,'max_upload_mb',p.max_upload_mb,'max_upload_pages',p.max_upload_pages),
    'subscription', jsonb_build_object(
      'status', sub_status,
      'period_end', period_end,
      'valid', public.subscription_is_valid(sub_status, period_end),
      'is_paid', COALESCE(p.slug,'free') <> 'free'
    ),
    'usage', jsonb_build_object('month_used',m_used,'credits_used',c_used),
    'remaining', jsonb_build_object(
      'monthly', CASE WHEN p.monthly_limit>0 THEN GREATEST(0,p.monthly_limit-m_used) ELSE NULL END,
      'credits', CASE WHEN p.credits>0 THEN GREATEST(0,p.credits-c_used) ELSE NULL END
    ),
    'resets', jsonb_build_object('monthly',cycle_end),
    'server_time', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_entitlements(uuid) FROM PUBLIC, anon, authenticated;

-- 6. Quota reservation reconciles first, so protected endpoints enforce Free limits
CREATE OR REPLACE FUNCTION public.reserve_assignment_slot(_user_id uuid, _credits integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.plans; ctr public.usage_counters;
  month_lim int; cred_lim int;
  cycle_len interval := interval '30 days';
  cycle_end timestamptz;
BEGIN
  PERFORM public.expire_subscription_if_due(_user_id);

  p := public._resolve_user_plan(_user_id);
  month_lim := COALESCE(p.monthly_limit,0);
  cred_lim := COALESCE(p.credits,0);
  INSERT INTO public.usage_counters(user_id) VALUES(_user_id) ON CONFLICT(user_id) DO NOTHING;
  SELECT * INTO ctr FROM public.usage_counters WHERE user_id=_user_id FOR UPDATE;

  IF ctr.cycle_started_at IS NULL OR now() >= ctr.cycle_started_at + cycle_len THEN
    ctr.cycle_started_at := now();
    ctr.month_used := 0;
    ctr.credits_used := 0;
  END IF;
  cycle_end := ctr.cycle_started_at + cycle_len;

  IF month_lim > 0 AND ctr.month_used >= month_lim THEN
    UPDATE public.usage_counters SET cycle_started_at=ctr.cycle_started_at, month_used=ctr.month_used, credits_used=ctr.credits_used, updated_at=now() WHERE user_id=_user_id;
    RETURN jsonb_build_object('allowed',false,'reason','monthly_limit','plan_name',p.name,'plan_slug',p.slug,'limit',month_lim,'used',ctr.month_used,'remaining',0,'resets_at',cycle_end);
  END IF;
  IF cred_lim > 0 AND ctr.credits_used + GREATEST(_credits,0) > cred_lim THEN
    UPDATE public.usage_counters SET cycle_started_at=ctr.cycle_started_at, month_used=ctr.month_used, credits_used=ctr.credits_used, updated_at=now() WHERE user_id=_user_id;
    RETURN jsonb_build_object('allowed',false,'reason','credits','plan_name',p.name,'plan_slug',p.slug,'limit',cred_lim,'used',ctr.credits_used,'remaining',GREATEST(0,cred_lim-ctr.credits_used),'resets_at',cycle_end);
  END IF;

  UPDATE public.usage_counters SET
    cycle_started_at = ctr.cycle_started_at,
    month_used = ctr.month_used + 1,
    credits_used = ctr.credits_used + GREATEST(_credits,0),
    updated_at = now()
  WHERE user_id = _user_id;

  RETURN jsonb_build_object('allowed',true,'plan_name',p.name,'plan_slug',p.slug,
    'month_used',ctr.month_used+1,'month_limit',month_lim,
    'credits_used',ctr.credits_used+GREATEST(_credits,0),'credits_limit',cred_lim,
    'resets',jsonb_build_object('monthly',cycle_end));
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_assignment_slot(uuid, integer) FROM PUBLIC, anon, authenticated;

-- 7. Optional scheduled reconciliation when pg_cron is available.
DO $do$
BEGIN
  BEGIN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_cron';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron unavailable: %', SQLERRM;
    RETURN;
  END;
  BEGIN
    PERFORM cron.unschedule('reconcile-expired-subscriptions');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  PERFORM cron.schedule('reconcile-expired-subscriptions', '0 * * * *',
                        'SELECT public.reconcile_expired_subscriptions()');
END
$do$;