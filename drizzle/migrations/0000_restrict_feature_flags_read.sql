DROP POLICY IF EXISTS "flags_public_read" ON public.feature_flags;
REVOKE SELECT ON public.feature_flags FROM anon;