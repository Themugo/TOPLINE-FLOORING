-- 091 — Remove implicit PUBLIC function execution while preserving the pre-existing
-- authenticated execution set; harden three mutable search paths.
BEGIN;
CREATE TEMP TABLE _auth_function_grants AS
SELECT p.oid,n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) args
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND has_function_privilege('authenticated',p.oid,'EXECUTE');
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT * FROM _auth_function_grants LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC',r.nspname,r.proname,r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated',r.nspname,r.proname,r.args);
  END LOOP;
END $$;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT p.oid,n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) args FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef=true AND NOT EXISTS(SELECT 1 FROM _auth_function_grants a WHERE a.oid=p.oid) LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, authenticated, anon',r.nspname,r.proname,r.args);
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.submit_quotation_request(text,text,text,text,text,text,text,text,text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_secure_customer_order(text,text,text,jsonb,text,uuid,uuid,text,text,text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_customer_order(text,text,text,jsonb,uuid,uuid,text,text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text,numeric) TO anon;
GRANT EXECUTE ON FUNCTION public.track_order_public(text,text) TO anon;
ALTER FUNCTION public.set_updated_at() SET search_path = public, private;
ALTER FUNCTION public.generate_order_number() SET search_path = public, private;
ALTER FUNCTION public.normalize_customer_phone(text) SET search_path = public, private;
DROP TABLE _auth_function_grants;
COMMIT;
-- Rollback: re-grant only a verified function's prior role; never restore PUBLIC wholesale.
