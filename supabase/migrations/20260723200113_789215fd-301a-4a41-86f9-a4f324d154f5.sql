
CREATE TABLE IF NOT EXISTS public.usage_counters (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  day_key date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  day_used int NOT NULL DEFAULT 0,
  month_key date NOT NULL DEFAULT date_trunc('month', now() AT TIME ZONE 'utc')::date,
  month_used int NOT NULL DEFAULT 0,
  credits_used int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.usage_counters TO authenticated;
GRANT ALL ON public.usage_counters TO service_role;

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own usage" ON public.usage_counters
  FOR SELECT USING (auth.uid() = user_id);

-- Resolve the user's effective plan (subscription -> plan_id, else slug, else free).
CREATE OR REPLACE FUNCTION public._resolve_user_plan(_user_id uuid)
RETURNS public.plans
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE
  s record;
  p public.plans;
BEGIN
  SELECT plan, plan_id, status INTO s FROM public.subscriptions WHERE user_id = _user_id;
  IF s.plan_id IS NOT NULL AND (s.status IS NULL OR s.status IN ('active','trialing')) THEN
    SELECT * INTO p FROM public.plans WHERE id = s.plan_id;
    IF p.id IS NOT NULL THEN RETURN p; END IF;
  END IF;
  IF s.plan IS NOT NULL AND (s.status IS NULL OR s.status IN ('active','trialing')) THEN
    SELECT * INTO p FROM public.plans WHERE slug = s.plan;
    IF p.id IS NOT NULL THEN RETURN p; END IF;
  END IF;
  SELECT * INTO p FROM public.plans WHERE slug = 'free';
  RETURN p;
END; $$;

GRANT EXECUTE ON FUNCTION public._resolve_user_plan(uuid) TO service_role;

-- Atomic quota reservation.
CREATE OR REPLACE FUNCTION public.reserve_assignment_slot(_user_id uuid, _credits int DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  today date := (now() AT TIME ZONE 'utc')::date;
  this_month date := date_trunc('month', now() AT TIME ZONE 'utc')::date;
  p public.plans;
  ctr public.usage_counters;
  day_lim int; month_lim int; cred_lim int;
  next_day timestamptz := ((today + 1)::timestamp AT TIME ZONE 'utc');
  next_month timestamptz := ((this_month + interval '1 month')::timestamp AT TIME ZONE 'utc');
BEGIN
  p := public._resolve_user_plan(_user_id);
  day_lim := COALESCE(p.daily_limit, 0);
  month_lim := COALESCE(p.monthly_limit, 0);
  cred_lim := COALESCE(p.credits, 0);

  INSERT INTO public.usage_counters(user_id) VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO ctr FROM public.usage_counters WHERE user_id = _user_id FOR UPDATE;

  IF ctr.day_key <> today THEN
    ctr.day_key := today; ctr.day_used := 0;
  END IF;
  IF ctr.month_key <> this_month THEN
    ctr.month_key := this_month; ctr.month_used := 0; ctr.credits_used := 0;
  END IF;

  IF day_lim > 0 AND ctr.day_used >= day_lim THEN
    UPDATE public.usage_counters SET day_key = ctr.day_key, day_used = ctr.day_used,
      month_key = ctr.month_key, month_used = ctr.month_used, credits_used = ctr.credits_used,
      updated_at = now() WHERE user_id = _user_id;
    RETURN jsonb_build_object('allowed', false, 'reason', 'daily_limit',
      'plan_name', p.name, 'plan_slug', p.slug,
      'limit', day_lim, 'used', ctr.day_used, 'remaining', 0, 'resets_at', next_day);
  END IF;

  IF month_lim > 0 AND ctr.month_used >= month_lim THEN
    UPDATE public.usage_counters SET day_key = ctr.day_key, day_used = ctr.day_used,
      month_key = ctr.month_key, month_used = ctr.month_used, credits_used = ctr.credits_used,
      updated_at = now() WHERE user_id = _user_id;
    RETURN jsonb_build_object('allowed', false, 'reason', 'monthly_limit',
      'plan_name', p.name, 'plan_slug', p.slug,
      'limit', month_lim, 'used', ctr.month_used, 'remaining', 0, 'resets_at', next_month);
  END IF;

  IF cred_lim > 0 AND ctr.credits_used + GREATEST(_credits, 0) > cred_lim THEN
    UPDATE public.usage_counters SET day_key = ctr.day_key, day_used = ctr.day_used,
      month_key = ctr.month_key, month_used = ctr.month_used, credits_used = ctr.credits_used,
      updated_at = now() WHERE user_id = _user_id;
    RETURN jsonb_build_object('allowed', false, 'reason', 'credits',
      'plan_name', p.name, 'plan_slug', p.slug,
      'limit', cred_lim, 'used', ctr.credits_used,
      'remaining', GREATEST(0, cred_lim - ctr.credits_used), 'resets_at', next_month);
  END IF;

  UPDATE public.usage_counters SET
    day_key = today,
    day_used = ctr.day_used + 1,
    month_key = this_month,
    month_used = ctr.month_used + 1,
    credits_used = ctr.credits_used + GREATEST(_credits, 0),
    updated_at = now()
  WHERE user_id = _user_id;

  RETURN jsonb_build_object('allowed', true,
    'plan_name', p.name, 'plan_slug', p.slug,
    'day_used', ctr.day_used + 1, 'day_limit', day_lim,
    'month_used', ctr.month_used + 1, 'month_limit', month_lim,
    'credits_used', ctr.credits_used + GREATEST(_credits, 0), 'credits_limit', cred_lim,
    'resets', jsonb_build_object('daily', next_day, 'monthly', next_month));
END; $$;

GRANT EXECUTE ON FUNCTION public.reserve_assignment_slot(uuid, int) TO service_role;

CREATE OR REPLACE FUNCTION public.refund_assignment_slot(_user_id uuid, _credits int DEFAULT 0)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  today date := (now() AT TIME ZONE 'utc')::date;
  this_month date := date_trunc('month', now() AT TIME ZONE 'utc')::date;
BEGIN
  UPDATE public.usage_counters SET
    day_used = GREATEST(0, day_used - CASE WHEN day_key = today THEN 1 ELSE 0 END),
    month_used = GREATEST(0, month_used - CASE WHEN month_key = this_month THEN 1 ELSE 0 END),
    credits_used = GREATEST(0, credits_used - CASE WHEN month_key = this_month THEN GREATEST(_credits, 0) ELSE 0 END),
    updated_at = now()
  WHERE user_id = _user_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.refund_assignment_slot(uuid, int) TO service_role;

CREATE OR REPLACE FUNCTION public.get_entitlements(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE
  today date := (now() AT TIME ZONE 'utc')::date;
  this_month date := date_trunc('month', now() AT TIME ZONE 'utc')::date;
  p public.plans;
  ctr public.usage_counters;
  d_used int := 0; m_used int := 0; c_used int := 0;
BEGIN
  p := public._resolve_user_plan(_user_id);
  SELECT * INTO ctr FROM public.usage_counters WHERE user_id = _user_id;
  IF FOUND THEN
    d_used := CASE WHEN ctr.day_key = today THEN ctr.day_used ELSE 0 END;
    m_used := CASE WHEN ctr.month_key = this_month THEN ctr.month_used ELSE 0 END;
    c_used := CASE WHEN ctr.month_key = this_month THEN ctr.credits_used ELSE 0 END;
  END IF;

  RETURN jsonb_build_object(
    'plan', jsonb_build_object(
      'id', p.id, 'slug', p.slug, 'name', p.name,
      'features', COALESCE(p.features, '{}'::jsonb),
      'daily_limit', p.daily_limit, 'monthly_limit', p.monthly_limit,
      'credits', p.credits, 'max_upload_mb', p.max_upload_mb, 'max_upload_pages', p.max_upload_pages
    ),
    'usage', jsonb_build_object(
      'day_used', d_used, 'month_used', m_used, 'credits_used', c_used
    ),
    'remaining', jsonb_build_object(
      'daily', CASE WHEN p.daily_limit > 0 THEN GREATEST(0, p.daily_limit - d_used) ELSE NULL END,
      'monthly', CASE WHEN p.monthly_limit > 0 THEN GREATEST(0, p.monthly_limit - m_used) ELSE NULL END,
      'credits', CASE WHEN p.credits > 0 THEN GREATEST(0, p.credits - c_used) ELSE NULL END
    ),
    'resets', jsonb_build_object(
      'daily', ((today + 1)::timestamp AT TIME ZONE 'utc'),
      'monthly', ((this_month + interval '1 month')::timestamp AT TIME ZONE 'utc')
    )
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.get_entitlements(uuid) TO authenticated, service_role;
