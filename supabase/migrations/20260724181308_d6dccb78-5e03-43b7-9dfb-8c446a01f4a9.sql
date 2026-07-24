
-- Allow anon/authenticated to read the public-safe settings sections.
DROP POLICY IF EXISTS "settings_public_sections_read" ON public.platform_settings;
CREATE POLICY "settings_public_sections_read"
ON public.platform_settings
FOR SELECT
TO anon, authenticated
USING (
  key LIKE 'general.%'
  OR key LIKE 'branding.%'
  OR key LIKE 'landing.%'
);

-- Storage RLS: admins can manage the branding bucket; reads happen via signed URLs.
DROP POLICY IF EXISTS "branding_admin_read" ON storage.objects;
CREATE POLICY "branding_admin_read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "branding_admin_insert" ON storage.objects;
CREATE POLICY "branding_admin_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "branding_admin_update" ON storage.objects;
CREATE POLICY "branding_admin_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "branding_admin_delete" ON storage.objects;
CREATE POLICY "branding_admin_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));
