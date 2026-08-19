DROP POLICY IF EXISTS "promo_events_anon_insert" ON public.promo_events;
DROP POLICY IF EXISTS "promo_events_auth_insert" ON public.promo_events;

CREATE POLICY "promo_events_no_client_insert"
  ON public.promo_events
  AS RESTRICTIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

GRANT ALL ON public.promo_events TO service_role;