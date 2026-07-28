CREATE TABLE public.razorpay_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payment_id text,
  order_id text,
  status text NOT NULL DEFAULT 'received',
  error text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.razorpay_webhook_events TO service_role;
GRANT SELECT ON public.razorpay_webhook_events TO authenticated;

ALTER TABLE public.razorpay_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read webhook events"
ON public.razorpay_webhook_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER razorpay_webhook_events_set_updated_at
BEFORE UPDATE ON public.razorpay_webhook_events
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX razorpay_webhook_events_created_at_idx ON public.razorpay_webhook_events (created_at DESC);