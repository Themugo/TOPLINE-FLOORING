-- Admin Authentication & Authorization 360
-- Harden authorization helpers and expose effective permissions for least-privilege UI gating.

CREATE OR REPLACE FUNCTION private.current_user_is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_profiles sp
    WHERE sp.user_id = (SELECT auth.uid()) AND sp.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION private.current_user_has_permission(p_resource text, p_action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_profiles sp
    JOIN public.staff_role_assignments ra ON ra.user_id = sp.user_id
    JOIN public.staff_roles sr ON sr.id = ra.role_id
    JOIN public.staff_role_permissions rp ON rp.role_id = sr.id
    JOIN public.staff_permissions p ON p.id = rp.permission_id
    WHERE sp.user_id = (SELECT auth.uid()) AND sp.is_active = true
      AND p.resource = p_resource
      AND (p.action = CASE WHEN lower(coalesce(p_action, '')) = 'read' THEN 'select' ELSE lower(coalesce(p_action, '')) END OR p.action = 'manage')
  );
$$;

CREATE OR REPLACE FUNCTION private.require_staff_permission(p_resource text, p_action text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user uuid := (SELECT auth.uid());
  v_action text := CASE WHEN lower(coalesce(p_action, '')) = 'read' THEN 'select' ELSE lower(coalesce(p_action, '')) END;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.staff_role_assignments ra
    JOIN public.staff_role_permissions rp ON rp.role_id = ra.role_id
    JOIN public.staff_permissions p ON p.id = rp.permission_id
    JOIN public.staff_profiles sp ON sp.user_id = ra.user_id
    WHERE sp.user_id = v_user AND sp.is_active = true
      AND p.resource = p_resource AND (p.action = v_action OR p.action = 'manage')
  ) THEN RAISE EXCEPTION 'Permission denied: %.%', p_resource, p_action; END IF;
  RETURN v_user;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_staff_profile()
RETURNS jsonb LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT coalesce(jsonb_build_object(
    'user_id', sp.user_id,
    'display_name', sp.display_name,
    'phone', sp.phone,
    'job_title', sp.job_title,
    'is_active', sp.is_active,
    'roles', coalesce((SELECT jsonb_agg(jsonb_build_object('code', sr.code, 'name', sr.name) ORDER BY sr.code)
      FROM public.staff_role_assignments sra JOIN public.staff_roles sr ON sr.id = sra.role_id
      WHERE sra.user_id = sp.user_id), '[]'::jsonb)
  ), '{}'::jsonb)
  FROM public.staff_profiles sp
  WHERE sp.user_id = (SELECT auth.uid()) AND sp.is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.get_current_staff_permissions()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('resource', p.resource, 'action', p.action) ORDER BY p.resource, p.action), '[]'::jsonb)
  FROM public.staff_profiles sp
  JOIN public.staff_role_assignments ra ON ra.user_id = sp.user_id
  JOIN public.staff_role_permissions rp ON rp.role_id = ra.role_id
  JOIN public.staff_permissions p ON p.id = rp.permission_id
  WHERE sp.user_id = (SELECT auth.uid()) AND sp.is_active = true;
$$;

REVOKE ALL ON FUNCTION public.get_current_staff_permissions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_current_staff_permissions() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_current_staff_permissions() TO authenticated;
REVOKE ALL ON FUNCTION public.get_current_staff_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_current_staff_profile() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_current_staff_profile() TO authenticated;
REVOKE ALL ON FUNCTION private.current_user_is_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_user_has_permission(text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.require_staff_permission(text,text) FROM PUBLIC;

COMMENT ON FUNCTION public.get_current_staff_permissions() IS 'Returns effective permissions for the authenticated active Topline staff user for least-privilege Admin UI gating. Database RLS/RPC checks remain authoritative.';
