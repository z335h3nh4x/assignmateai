-- 1. platform_settings: replace broad prefix-based public reads with an explicit allow-list
DROP POLICY IF EXISTS settings_public_read ON public.platform_settings;
DROP POLICY IF EXISTS settings_public_sections_read ON public.platform_settings;

CREATE POLICY settings_public_allowlist_read
ON public.platform_settings
FOR SELECT
TO anon, authenticated
USING (
  key IN (
    'general.platform_name',
    'general.website_url',
    'general.footer_text',
    'general.copyright_text',
    'general.maintenance_mode',
    'general.support_email',
    'general.contact_email',
    'branding.logo_url',
    'branding.logo_dark_url',
    'branding.favicon_url'
  )
);

-- 2. usage_counters: explicitly fail closed for API writes (writes happen only via
--    trusted SECURITY DEFINER routines running as service_role)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.usage_counters FROM authenticated;
REVOKE ALL ON public.usage_counters FROM anon;
GRANT SELECT ON public.usage_counters TO authenticated;
GRANT ALL ON public.usage_counters TO service_role;

CREATE POLICY usage_counters_no_client_insert
ON public.usage_counters
AS RESTRICTIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY usage_counters_no_client_update
ON public.usage_counters
AS RESTRICTIVE
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY usage_counters_no_client_delete
ON public.usage_counters
AS RESTRICTIVE
FOR DELETE
TO anon, authenticated
USING (false);

-- 3. promo_events: replace the always-true insert policy with scoped ones
DROP POLICY IF EXISTS "Anyone can log promo events" ON public.promo_events;

CREATE POLICY promo_events_anon_insert
ON public.promo_events
FOR INSERT
TO anon
WITH CHECK (
  user_id IS NULL
  AND event IN ('impression', 'click', 'dismiss')
  AND placement IN ('dashboard', 'workspace', 'sidebar', 'bottom', 'homepage')
  AND length(content_hash) BETWEEN 1 AND 128
);

CREATE POLICY promo_events_auth_insert
ON public.promo_events
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND event IN ('impression', 'click', 'dismiss')
  AND placement IN ('dashboard', 'workspace', 'sidebar', 'bottom', 'homepage')
  AND length(content_hash) BETWEEN 1 AND 128
);

-- 4. SECURITY DEFINER routines: keep them out of the client-callable API surface
REVOKE ALL ON FUNCTION public._resolve_user_plan(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_assignment_slot(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_assignment_slot(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._resolve_user_plan(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_assignment_slot(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_assignment_slot(uuid, integer) TO service_role;

-- get_entitlements stays callable by signed-in users (MCP tool + app), but can now
-- only ever return the caller's own entitlements.
CREATE OR REPLACE FUNCTION public.get_entitlements(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p public.plans; ctr public.usage_counters;
  m_used int:=0; c_used int:=0;
  cycle_start timestamptz; cycle_end timestamptz;
  cycle_len interval := interval '30 days';
BEGIN
  IF auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF auth.uid() IS NULL AND current_setting('role', true) NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

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
END; $function$;

REVOKE ALL ON FUNCTION public.get_entitlements(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_entitlements(uuid) TO authenticated, service_role;