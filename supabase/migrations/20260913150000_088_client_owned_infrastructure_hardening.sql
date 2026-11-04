-- Operation 16: Client-owned infrastructure hardening
-- The migration is intentionally narrow: the Supabase bootstrap helper is not an application RPC.
-- Keep it unavailable through the PostgREST API surface.
-- The helper only exists on projects created with "Automatically enable RLS" turned on, so a brand new
-- project may not have it. Revoke only when it is present.
DO $$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
  END IF;
END $$;
