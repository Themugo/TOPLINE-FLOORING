-- Regression guard for the 2026-10-16 audit: browser roles must stay read-only everywhere except the
-- explicitly allowed public write paths. Run with: psql -v ON_ERROR_STOP=1 -f supabase/tests/public_surface_regression.sql
DO $$
DECLARE r record;
BEGIN
  -- 1. No write privileges through any view for anon/authenticated (view writes bypass base-table RLS).
  FOR r IN
    SELECT g.table_name, g.grantee, g.privilege_type
    FROM information_schema.role_table_grants g
    JOIN pg_class c ON c.relname = g.table_name AND c.relkind IN ('v','m')
    JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = g.table_schema
    WHERE g.table_schema = 'public' AND g.grantee IN ('anon','authenticated')
      AND g.privilege_type <> 'SELECT'
  LOOP
    RAISE EXCEPTION 'View public.% grants % to %', r.table_name, r.privilege_type, r.grantee;
  END LOOP;

  -- 2. TRUNCATE/TRIGGER/REFERENCES are never granted to browser roles (they are not covered by RLS).
  FOR r IN
    SELECT table_name, grantee, privilege_type FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND grantee IN ('anon','authenticated')
      AND privilege_type IN ('TRUNCATE','TRIGGER','REFERENCES')
  LOOP
    RAISE EXCEPTION 'public.% grants % to %', r.table_name, r.privilege_type, r.grantee;
  END LOOP;

  -- 3. anon writes to exactly one table: page_visits, INSERT only.
  FOR r IN
    SELECT table_name, privilege_type FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND grantee = 'anon' AND privilege_type IN ('INSERT','UPDATE','DELETE')
      AND NOT (table_name = 'page_visits' AND privilege_type = 'INSERT')
  LOOP
    RAISE EXCEPTION 'anon holds % on public.%', r.privilege_type, r.table_name;
  END LOOP;

  -- 4. Enquiries enter only through submit_quotation_request(): no public insert policies.
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename IN ('quotations','leads','contact_messages')
      AND cmd IN ('INSERT','ALL')
      AND (roles && ARRAY['anon','public']::name[] OR 'authenticated' = ANY(roles) AND policyname ILIKE '%public%')
  ) THEN
    RAISE EXCEPTION 'quotations/leads/contact_messages must not have a public insert policy';
  END IF;

  -- 5. Trigger functions are not executable by browser roles.
  FOR r IN
    SELECT p.oid::regprocedure AS fn FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prorettype = 'trigger'::regtype
      AND (has_function_privilege('anon', p.oid, 'EXECUTE') OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))
  LOOP
    RAISE EXCEPTION 'Trigger function % is executable by a browser role', r.fn;
  END LOOP;

  -- 6. The suppression list is service-role only and RLS-protected.
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.communication_suppressions'::regclass AND relrowsecurity) THEN
    RAISE EXCEPTION 'communication_suppressions must have RLS enabled';
  END IF;
  IF has_table_privilege('anon','public.communication_suppressions','SELECT')
     OR has_table_privilege('authenticated','public.communication_suppressions','SELECT') THEN
    RAISE EXCEPTION 'communication_suppressions must be service-role only';
  END IF;
END $$;

-- 7. Behavioural: acknowledgement emails contain real line breaks and the per-address limit holds.
DO $$
DECLARE v_msg text; i int; ok_count int := 0; v_res json;
BEGIN
  PERFORM set_config('request.jwt.claim.role','anon',true);
  v_res := public.submit_quotation_request('Regression Tester','regression-guard@example.org','0700000042','Nairobi','Flooring','Epoxy','guard','','');
  IF NOT coalesce((v_res->>'success')::boolean,false) THEN RAISE EXCEPTION 'baseline quotation was rejected: %', v_res; END IF;
  SELECT message INTO v_msg FROM public.communication_outbox
   WHERE recipient = 'regression-guard@example.org' AND dedupe_key LIKE 'quotation-intake:%:customer' LIMIT 1;
  IF v_msg IS NULL THEN RAISE EXCEPTION 'customer acknowledgement was not queued'; END IF;
  IF position(E'\\n' in v_msg) > 0 OR position(E'\n' in v_msg) = 0 THEN RAISE EXCEPTION 'acknowledgement email has broken line breaks'; END IF;
  FOR i IN 1..6 LOOP
    v_res := public.submit_quotation_request('Regression Tester','regression-guard@example.org','07000000'||(50+i),'Nairobi','Flooring','Epoxy','guard '||i,'','');
    IF coalesce((v_res->>'success')::boolean,false) THEN ok_count := ok_count + 1; END IF;
  END LOOP;
  IF ok_count > 2 THEN RAISE EXCEPTION 'per-email rate limit not enforced (% accepted after the first)', ok_count; END IF;
  DELETE FROM public.communication_outbox WHERE recipient = 'regression-guard@example.org';
  DELETE FROM public.quotations WHERE email = 'regression-guard@example.org';
  DELETE FROM public.leads WHERE email = 'regression-guard@example.org';
END $$;

-- 8. Outbound message and stock-hoarding guards (rolled back by the P0099 marker; assertion failures propagate).
DO $$
DECLARE v_pid uuid; v_res jsonb; v_ok int := 0; i int; v_msgs int; v_links int; v_cancelled int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'communication_outbox_volume_guard' AND tgrelid = 'public.communication_outbox'::regclass AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'communication_outbox_volume_guard trigger is missing';
  END IF;
  BEGIN
    INSERT INTO public.products(name,slug,price,stock_quantity,is_active,status,unit)
    VALUES ('Regression Tile','regression-tile-'||gen_random_uuid(),1000,500,true,'active','box') RETURNING id INTO v_pid;

    v_res := public.create_secure_customer_order(E'Click http://evil.example now','reg-order@example.org','0733000001',
      jsonb_build_array(jsonb_build_object('product_id',v_pid,'quantity',1)),'',NULL,NULL,'Nairobi','mpesa','reg-0');
    IF NOT coalesce((v_res->>'success')::boolean,false) THEN RAISE EXCEPTION 'baseline guest order was rejected: %', v_res; END IF;
    SELECT count(*), count(*) FILTER (WHERE message ~* 'http' OR position(E'\n' in message) > 0) INTO v_msgs, v_links
      FROM public.communication_outbox WHERE recipient IN ('reg-order@example.org','+254733000001');
    IF v_msgs = 0 THEN RAISE EXCEPTION 'order notifications were not queued'; END IF;
    IF v_links > 0 THEN RAISE EXCEPTION 'customer name was not sanitized in % notification(s)', v_links; END IF;

    FOR i IN 1..7 LOOP
      v_res := public.create_secure_customer_order('Hoarder','reg-order@example.org','07330001'||lpad(i::text,2,'0'),
        jsonb_build_array(jsonb_build_object('product_id',v_pid,'quantity',1)),'',NULL,NULL,'Nairobi','mpesa','reg-'||i);
      IF coalesce((v_res->>'success')::boolean,false) THEN v_ok := v_ok + 1; END IF;
    END LOOP;
    IF v_ok > 4 THEN RAISE EXCEPTION 'unpaid-order cap not enforced (% extra orders accepted)', v_ok; END IF;

    INSERT INTO public.communication_outbox(channel,recipient,message,dedupe_key)
    SELECT 'sms','+254733999999','m','reg-cap-'||g FROM generate_series(1,15) g;
    SELECT count(*) INTO v_cancelled FROM public.communication_outbox WHERE recipient = '+254733999999' AND status = 'cancelled';
    IF v_cancelled < 3 THEN RAISE EXCEPTION 'per-recipient message cap not enforced (% cancelled)', v_cancelled; END IF;

    RAISE EXCEPTION 'regression rollback' USING ERRCODE = 'P0099';
  EXCEPTION WHEN SQLSTATE 'P0099' THEN
    NULL; -- test data rolled back
  END;
END $$;

SELECT 'ok 1 - public surface regression assertions passed';
