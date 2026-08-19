CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- A signed-in caller may only inspect their own roles; internal policy checks
  -- and service-role callers (auth.uid() IS NULL) are unaffected.
  IF auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE ALL ON FUNCTION public.consume_export_slot(uuid, integer) FROM anon, public;
REVOKE ALL ON FUNCTION public.get_entitlements(uuid) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.reserve_assignment_slot(uuid, integer) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.refund_assignment_slot(uuid, integer) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.activate_paid_subscription(uuid, uuid, text, text, text, text, integer, text, text) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public._resolve_user_plan(uuid) FROM anon, authenticated, public;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_export_slot(uuid, integer) TO authenticated, service_role;