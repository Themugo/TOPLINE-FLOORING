-- 092 — Foreign-key index architecture. Additive only; no data changes.
BEGIN;
DO $$ DECLARE r record; cols text; idx_name text; BEGIN
  FOR r IN SELECT con.oid,con.conrelid,con.conkey,c.relname child_table,n.nspname child_schema,con.conname
           FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE con.contype='f' AND n.nspname='public' LOOP
    SELECT string_agg(format('%I',a.attname),', ' ORDER BY k.ord) INTO cols
    FROM unnest(r.conkey) WITH ORDINALITY k(attnum,ord) JOIN pg_attribute a ON a.attrelid=r.conrelid AND a.attnum=k.attnum;
    IF NOT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid=r.conrelid AND i.indisvalid AND i.indisready AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indnkeyatts=cardinality(r.conkey) AND (i.indkey::smallint[])[1:cardinality(r.conkey)]=r.conkey) THEN
      idx_name := left('idx_fk_'||md5(r.child_schema||'.'||r.child_table||':'||r.conname),63);
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I.%I (%s)',idx_name,r.child_schema,r.child_table,cols);
    END IF;
  END LOOP;
END $$;
COMMIT;
-- Rollback: drop only indexes created by this migration after query-plan review.
