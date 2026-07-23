
-- Remove daily assignment limits from the entitlement system.

-- 1. Drop the daily_limit column from plans
ALTER TABLE public.plans DROP COLUMN IF EXISTS daily_limit;

-- 2. Drop day tracking columns from usage_counters
ALTER TABLE public.usage_counters DROP COLUMN IF EXISTS day_key;
ALTER TABLE public.usage_counters DROP COLUMN IF EXISTS day_used;

-- 3. Recreate reserve_assignment_slot without daily logic
CREATE OR REPLACE FUNCTION public.reserve_assignment_slot(_user_id uuid, _credits integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  this_month date := date_trunc('month', now() AT TIME ZONE 'utc')::date;
  p public.plans;
  ctr public.usage_counters;
  month_lim int; cred_lim int;
  next_month timestamptz := ((this_month + interval '1 month')::timestamp AT TIME ZONE 'utc');
BEGIN
  p := public._resolve_user_plan(_user_id);
  month_lim := COALESCE(p.monthly_limit, 0);
  cred_lim := COALESCE(p.credits, 0);

  INSERT INTO public.usage_counters(user_id) VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO ctr FROM public.usage_counters WHERE user_id = _user_id FOR UPDATE;

  IF ctr.month_key <> this_month THEN
    ctr.month_key := this_month; ctr.month_used := 0; ctr.credits_used := 0;
  END IF;

  IF month_lim > 0 AND ctr.month_used >= month_lim THEN
    UPDATE public.usage_counters SET
      month_key = ctr.month_key, month_used = ctr.month_used, credits_used = ctr.credits_used,
      updated_at = now() WHERE user_id = _user_id;
    RETURN jsonb_build_object('allowed', false, 'reason', 'monthly_limit',
      'plan_name', p.name, 'plan_slug', p.slug,
      'limit', month_lim, 'used', ctr.month_used, 'remaining', 0, 'resets_at', next_month);
  END IF;

  IF cred_lim > 0 AND ctr.credits_used + GREATEST(_credits, 0) > cred_lim THEN
    UPDATE public.usage_counters SET
      month_key = ctr.month_key, month_used = ctr.month_used, credits_used = ctr.credits_used,
      updated_at = now() WHERE user_id = _user_id;
    RETURN jsonb_build_object('allowed', false, 'reason', 'credits',
      'plan_name', p.name, 'plan_slug', p.slug,
      'limit', cred_lim, 'used', ctr.credits_used,
      'remaining', GREATEST(0, cred_lim - ctr.credits_used), 'resets_at', next_month);
  END IF;

  UPDATE public.usage_counters SET
    month_key = this_month,
    month_used = ctr.month_used + 1,
    credits_used = ctr.credits_used + GREATEST(_credits, 0),
    updated_at = now()
  WHERE user_id = _user_id;

  RETURN jsonb_build_object('allowed', true,
    'plan_name', p.name, 'plan_slug', p.slug,
    'month_used', ctr.month_used + 1, 'month_limit', month_lim,
    'credits_used', ctr.credits_used + GREATEST(_credits, 0), 'credits_limit', cred_lim,
    'resets', jsonb_build_object('monthly', next_month));
END; $function$;

-- 4. Recreate refund_assignment_slot without daily logic
CREATE OR REPLACE FUNCTION public.refund_assignment_slot(_user_id uuid, _credits integer DEFAULT 0)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  this_month date := date_trunc('month', now() AT TIME ZONE 'utc')::date;
BEGIN
  UPDATE public.usage_counters SET
    month_used = GREATEST(0, month_used - CASE WHEN month_key = this_month THEN 1 ELSE 0 END),
    credits_used = GREATEST(0, credits_used - CASE WHEN month_key = this_month THEN GREATEST(_credits, 0) ELSE 0 END),
    updated_at = now()
  WHERE user_id = _user_id;
END; $function$;

-- 5. Recreate get_entitlements without daily fields
CREATE OR REPLACE FUNCTION public.get_entitlements(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  this_month date := date_trunc('month', now() AT TIME ZONE 'utc')::date;
  p public.plans;
  ctr public.usage_counters;
  m_used int := 0; c_used int := 0;
BEGIN
  p := public._resolve_user_plan(_user_id);
  SELECT * INTO ctr FROM public.usage_counters WHERE user_id = _user_id;
  IF FOUND THEN
    m_used := CASE WHEN ctr.month_key = this_month THEN ctr.month_used ELSE 0 END;
    c_used := CASE WHEN ctr.month_key = this_month THEN ctr.credits_used ELSE 0 END;
  END IF;

  RETURN jsonb_build_object(
    'plan', jsonb_build_object(
      'id', p.id, 'slug', p.slug, 'name', p.name,
      'features', COALESCE(p.features, '{}'::jsonb),
      'monthly_limit', p.monthly_limit,
      'credits', p.credits, 'max_upload_mb', p.max_upload_mb, 'max_upload_pages', p.max_upload_pages
    ),
    'usage', jsonb_build_object(
      'month_used', m_used, 'credits_used', c_used
    ),
    'remaining', jsonb_build_object(
      'monthly', CASE WHEN p.monthly_limit > 0 THEN GREATEST(0, p.monthly_limit - m_used) ELSE NULL END,
      'credits', CASE WHEN p.credits > 0 THEN GREATEST(0, p.credits - c_used) ELSE NULL END
    ),
    'resets', jsonb_build_object(
      'monthly', ((this_month + interval '1 month')::timestamp AT TIME ZONE 'utc')
    )
  );
END; $function$;
