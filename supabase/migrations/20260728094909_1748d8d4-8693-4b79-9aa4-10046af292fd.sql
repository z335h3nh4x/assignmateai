ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.plans(id),
  ADD COLUMN IF NOT EXISTS billing_interval text,
  ADD COLUMN IF NOT EXISTS provider_order_id text,
  ADD COLUMN IF NOT EXISTS provider_payment_id text,
  ADD COLUMN IF NOT EXISTS provider_signature text;

CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_payment_id_key
  ON public.payments (provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.activate_paid_subscription(
  _user_id uuid,
  _plan_id uuid,
  _provider text,
  _order_id text,
  _payment_id text,
  _signature text,
  _amount_cents integer,
  _currency text,
  _billing_interval text DEFAULT 'monthly'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  p public.plans;
  existing public.payments;
  period interval;
  now_ts timestamptz := now();
  ends timestamptz;
BEGIN
  IF current_setting('role', true) NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO existing FROM public.payments
   WHERE provider = _provider AND provider_payment_id = _payment_id;
  IF FOUND THEN
    RETURN jsonb_build_object('activated', false, 'already_processed', true, 'payment_id', existing.id);
  END IF;

  SELECT * INTO p FROM public.plans WHERE id = _plan_id;
  IF p.id IS NULL THEN RAISE EXCEPTION 'plan not found'; END IF;

  period := CASE WHEN _billing_interval = 'yearly' THEN interval '365 days' ELSE interval '30 days' END;
  ends := now_ts + period;

  INSERT INTO public.payments (
    user_id, plan_id, billing_interval, amount_cents, currency, provider, status,
    description, provider_order_id, provider_payment_id, provider_signature
  ) VALUES (
    _user_id, p.id, _billing_interval, GREATEST(_amount_cents, 0), COALESCE(_currency, p.currency),
    _provider, 'completed', p.name || ' plan (' || _billing_interval || ')',
    _order_id, _payment_id, _signature
  );

  INSERT INTO public.subscriptions (
    user_id, plan, plan_id, status, billing_interval, started_at, renewal_at,
    current_period_end, cancelled_at, payment_method, lifetime_spending_cents, updated_at
  ) VALUES (
    _user_id, p.slug, p.id, 'active', _billing_interval, now_ts, ends,
    ends, NULL, _provider, GREATEST(_amount_cents, 0), now_ts
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = EXCLUDED.plan,
    plan_id = EXCLUDED.plan_id,
    status = 'active',
    billing_interval = EXCLUDED.billing_interval,
    started_at = EXCLUDED.started_at,
    renewal_at = EXCLUDED.renewal_at,
    current_period_end = EXCLUDED.current_period_end,
    cancelled_at = NULL,
    payment_method = EXCLUDED.payment_method,
    lifetime_spending_cents = public.subscriptions.lifetime_spending_cents + GREATEST(_amount_cents, 0),
    updated_at = now_ts;

  INSERT INTO public.usage_counters (user_id, cycle_started_at, month_used, credits_used, updated_at)
  VALUES (_user_id, now_ts, 0, 0, now_ts)
  ON CONFLICT (user_id) DO UPDATE SET
    cycle_started_at = now_ts,
    month_used = 0,
    credits_used = 0,
    updated_at = now_ts;

  RETURN jsonb_build_object(
    'activated', true,
    'already_processed', false,
    'plan', jsonb_build_object('id', p.id, 'slug', p.slug, 'name', p.name),
    'period_end', ends
  );
END; $$;

REVOKE ALL ON FUNCTION public.activate_paid_subscription(uuid, uuid, text, text, text, text, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_paid_subscription(uuid, uuid, text, text, text, text, integer, text, text) TO service_role;