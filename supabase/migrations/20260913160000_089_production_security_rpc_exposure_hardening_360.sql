-- 089 — Production Security / RPC Exposure Hardening 360
-- Layered on top of deployed 001–088 schema. Privilege-only; no business data changes.
BEGIN;
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid,n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) args
           FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
           WHERE n.nspname='public' AND p.prosecdef=true
  LOOP EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon',r.nspname,r.proname,r.args); END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.submit_quotation_request(text,text,text,text,text,text,text,text,text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_secure_customer_order(text,text,text,jsonb,text,uuid,uuid,text,text,text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_customer_order(text,text,text,jsonb,uuid,uuid,text,text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text,numeric) TO anon;
GRANT EXECUTE ON FUNCTION public.track_order_public(text,text) TO anon;
COMMIT;
-- Rollback: restore anonymous EXECUTE only for explicitly verified public RPCs.
