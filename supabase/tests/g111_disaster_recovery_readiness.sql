-- G-11.1 read-only staging schema/authorization preflight. No restore is performed.
BEGIN;
SET TRANSACTION READ ONLY;
DO $$
DECLARE t text; fn record; v boolean;
BEGIN
  FOREACH t IN ARRAY ARRAY['business_continuity_plans','recovery_drills','recovery_checkpoints'] LOOP
    SELECT c.relrowsecurity INTO v FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=t;
    IF v IS DISTINCT FROM true THEN RAISE EXCEPTION 'RLS not enabled for %',t; END IF;
  END LOOP;
  IF has_table_privilege('anon','public.business_continuity_plans','SELECT') OR has_table_privilege('authenticated','public.business_continuity_plans','SELECT') THEN
    RAISE EXCEPTION 'Direct continuity plan table reads must remain revoked';
  END IF;
  FOR fn IN SELECT p.oid::regprocedure AS signature, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('create_business_continuity_plan','record_recovery_drill','record_recovery_checkpoint','get_business_continuity_360') LOOP
    IF has_function_privilege('anon',fn.signature,'EXECUTE') THEN RAISE EXCEPTION 'anon can execute %',fn.signature; END IF;
  END LOOP;
  IF NOT has_function_privilege('authenticated','public.get_business_continuity_360()','EXECUTE') THEN RAISE EXCEPTION 'Authenticated staff read RPC grant missing'; END IF;
  IF NOT has_function_privilege('authenticated','public.create_business_continuity_plan(text,text,text,uuid,integer,integer,text,timestamp with time zone)','EXECUTE') THEN RAISE EXCEPTION 'Authenticated plan RPC grant missing'; END IF;
END $$;
ROLLBACK;
