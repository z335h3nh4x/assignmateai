CREATE OR REPLACE FUNCTION public.consume_export_slot(_assignment_id uuid, _max_exports integer DEFAULT 5)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  cur integer;
  nxt integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.assignments
     SET exports_count = COALESCE(exports_count, 0) + 1
   WHERE id = _assignment_id
     AND user_id = uid
     AND COALESCE(exports_count, 0) < GREATEST(_max_exports, 0)
  RETURNING exports_count INTO nxt;

  IF nxt IS NOT NULL THEN
    RETURN jsonb_build_object('allowed', true, 'exports_count', nxt, 'max', _max_exports);
  END IF;

  SELECT COALESCE(exports_count, 0) INTO cur
    FROM public.assignments
   WHERE id = _assignment_id AND user_id = uid;

  IF cur IS NULL THEN
    RAISE EXCEPTION 'assignment not found';
  END IF;

  RETURN jsonb_build_object('allowed', false, 'exports_count', cur, 'max', _max_exports);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_export_slot(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_export_slot(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_export_slot(uuid, integer) TO service_role;