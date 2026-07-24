
CREATE TABLE public.promo_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL CHECK (event IN ('impression','click','dismiss')),
  placement text NOT NULL,
  content_hash text NOT NULL,
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX promo_events_created_at_idx ON public.promo_events (created_at DESC);
CREATE INDEX promo_events_event_idx ON public.promo_events (event);

GRANT INSERT ON public.promo_events TO anon, authenticated;
GRANT SELECT ON public.promo_events TO authenticated;
GRANT ALL ON public.promo_events TO service_role;

ALTER TABLE public.promo_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log promo events"
  ON public.promo_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read promo events"
  ON public.promo_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
