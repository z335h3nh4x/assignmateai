ALTER TABLE public.usage_counters ADD COLUMN IF NOT EXISTS cycle_started_at timestamptz;

CREATE OR REPLACE FUNCTION public.reserve_assignment_slot(_user_id uuid, _credits integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  p public.plans; ctr public.usage_counters;
  month_lim int; cred_lim int;
  cycle_len interval := interval '30 days';
  cycle_end timestamptz;
BEGIN
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
END; $$;

CREATE OR REPLACE FUNCTION public.get_entitlements(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  p public.plans; ctr public.usage_counters;
  m_used int:=0; c_used int:=0;
  cycle_start timestamptz; cycle_end timestamptz;
  cycle_len interval := interval '30 days';
BEGIN
  p := public._resolve_user_plan(_user_id);
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
    'usage', jsonb_build_object('month_used',m_used,'credits_used',c_used),
    'remaining', jsonb_build_object(
      'monthly', CASE WHEN p.monthly_limit>0 THEN GREATEST(0,p.monthly_limit-m_used) ELSE NULL END,
      'credits', CASE WHEN p.credits>0 THEN GREATEST(0,p.credits-c_used) ELSE NULL END
    ),
    'resets', jsonb_build_object('monthly',cycle_end)
  );
END; $$;

CREATE OR REPLACE FUNCTION public.refund_assignment_slot(_user_id uuid, _credits integer DEFAULT 0)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  ctr public.usage_counters;
  cycle_len interval := interval '30 days';
BEGIN
  SELECT * INTO ctr FROM public.usage_counters WHERE user_id=_user_id FOR UPDATE;
  IF NOT FOUND OR ctr.cycle_started_at IS NULL OR now() >= ctr.cycle_started_at + cycle_len THEN
    RETURN;
  END IF;
  UPDATE public.usage_counters SET
    month_used = GREATEST(0, month_used - 1),
    credits_used = GREATEST(0, credits_used - GREATEST(_credits,0)),
    updated_at = now()
  WHERE user_id = _user_id;
END; $$;