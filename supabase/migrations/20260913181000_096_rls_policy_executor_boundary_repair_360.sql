-- Repair the RLS execution boundary exposed by least-privilege function revocation.
REVOKE EXECUTE ON FUNCTION private.current_user_has_permission(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_user_has_permission(text,text) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.current_user_is_staff() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.require_staff_permission(text,text) FROM PUBLIC, anon, authenticated;
