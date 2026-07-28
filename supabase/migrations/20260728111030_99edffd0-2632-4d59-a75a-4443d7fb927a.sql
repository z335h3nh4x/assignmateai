REVOKE EXECUTE ON FUNCTION public.get_entitlements(uuid) FROM authenticated, anon, PUBLIC;

CREATE POLICY payments_no_client_insert ON public.payments AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY payments_no_client_update ON public.payments AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY payments_no_client_delete ON public.payments AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);