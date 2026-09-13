-- Operation 16: Client-owned infrastructure hardening
-- The migration is intentionally narrow: the Supabase bootstrap helper is not an application RPC.
-- Keep it unavailable through the PostgREST API surface.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
