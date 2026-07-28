DROP POLICY IF EXISTS settings_public_allowlist_read ON public.platform_settings;
CREATE POLICY settings_public_allowlist_read ON public.platform_settings
FOR SELECT TO anon, authenticated
USING (key = ANY (ARRAY[
  'general.platform_name','general.website_url','general.footer_text','general.copyright_text',
  'general.maintenance_mode','general.support_email','general.contact_email',
  'branding.logo_url','branding.logo_dark_url','branding.favicon_url',
  'billing.currency','billing.locale'
]));