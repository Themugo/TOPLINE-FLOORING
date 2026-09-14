-- 093 — Remove only redundant FK indexes introduced by 092; optimize auth.uid RLS predicates.
BEGIN;
ALTER TABLE public.customer_portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customer_portal_self_select ON public.customer_portal_access;
CREATE POLICY customer_portal_self_select ON public.customer_portal_access FOR SELECT TO authenticated USING (auth_user_id=(select auth.uid()));
DROP POLICY IF EXISTS notification_reads_self ON public.notification_reads;
CREATE POLICY notification_reads_self ON public.notification_reads FOR ALL TO authenticated USING (user_id=(select auth.uid())) WITH CHECK (user_id=(select auth.uid()));
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT child_ns.nspname schema_name,child.relname table_name,idx.relname duplicate_index
           FROM pg_index i JOIN pg_class idx ON idx.oid=i.indexrelid JOIN pg_class child ON child.oid=i.indrelid JOIN pg_namespace child_ns ON child_ns.oid=child.relnamespace
           WHERE child_ns.nspname='public' AND idx.relname LIKE 'idx_fk_%' AND EXISTS(
             SELECT 1 FROM pg_index j JOIN pg_class idx2 ON idx2.oid=j.indexrelid WHERE j.indrelid=i.indrelid AND idx2.relname NOT LIKE 'idx_fk_%' AND j.indisvalid AND j.indisready AND j.indpred IS NULL AND j.indexprs IS NULL AND i.indkey=j.indkey AND i.indclass=j.indclass AND i.indcollation=j.indcollation AND i.indoption=j.indoption AND i.indisunique=j.indisunique)
  LOOP EXECUTE format('DROP INDEX IF EXISTS %I.%I',r.schema_name,r.duplicate_index); END LOOP;
END $$;
COMMIT;
-- Rollback: recreate a dropped idx_fk_* index only when plan evidence requires it.
