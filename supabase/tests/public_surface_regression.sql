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

-- 9. Unpublished catalogue stays private, internal gates are not browser-callable, public reads are an allow-list.
DO $$
DECLARE r record; v_live uuid; v_draft uuid; v_pub uuid; v_conf uuid; v_n int;
BEGIN
  IF has_function_privilege('authenticated', 'public.get_payment_provider_release_gate_360(text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.get_payment_provider_release_gate_360(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'get_payment_provider_release_gate_360 must be service-role only';
  END IF;

  -- Any browser-readable table with a bare "true" policy must be a deliberate reference table.
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND permissive = 'PERMISSIVE' AND cmd = 'SELECT'
      AND roles && ARRAY['anon','authenticated','public']::name[]
      AND (qual IS NULL OR qual = 'true')
      AND tablename NOT IN ('cms_content','product_brands','product_tags','seo_pages')
  LOOP
    RAISE EXCEPTION 'public.% policy % exposes every row to browser roles; add a visibility condition', r.tablename, r.policyname;
  END LOOP;

  BEGIN
    INSERT INTO public.products(name,slug,price,stock_quantity,is_active,status,unit) VALUES ('Reg Live','reg-live-'||gen_random_uuid(),1,1,true,'active','box') RETURNING id INTO v_live;
    INSERT INTO public.products(name,slug,price,stock_quantity,is_active,status,unit) VALUES ('Reg Draft','reg-draft-'||gen_random_uuid(),1,1,false,'draft','box') RETURNING id INTO v_draft;
    INSERT INTO public.product_variants(product_id,variant_name,is_active) VALUES (v_live,'v',true),(v_draft,'v',true);
    INSERT INTO public.product_images(product_id,image_url) VALUES (v_live,'a.jpg'),(v_draft,'b.jpg');
    INSERT INTO public.product_documents(product_id,document_name,document_url) VALUES (v_live,'a','u'),(v_draft,'b','u');
    INSERT INTO public.projects(title,slug,is_active) VALUES ('Reg Public','reg-public-'||gen_random_uuid(),true) RETURNING id INTO v_pub;
    INSERT INTO public.projects(title,slug,is_active) VALUES ('Reg Confidential','reg-conf-'||gen_random_uuid(),false) RETURNING id INTO v_conf;
    INSERT INTO public.project_images(project_id,image_url) VALUES (v_pub,'a.jpg'),(v_conf,'b.jpg');
    INSERT INTO public.site_settings(setting_key,setting_value) VALUES ('reg_internal_setting','"x"'::jsonb);

    EXECUTE 'SET LOCAL ROLE anon';
    SELECT count(*) INTO v_n FROM public.product_variants WHERE product_id IN (v_live, v_draft);
    IF v_n <> 1 THEN RAISE EXCEPTION 'anon sees % variants (expected 1: live product only)', v_n; END IF;
    SELECT count(*) INTO v_n FROM public.product_images WHERE product_id IN (v_live, v_draft);
    IF v_n <> 1 THEN RAISE EXCEPTION 'anon sees % product images (expected 1)', v_n; END IF;
    SELECT count(*) INTO v_n FROM public.product_documents WHERE product_id IN (v_live, v_draft);
    IF v_n <> 1 THEN RAISE EXCEPTION 'anon sees % product documents (expected 1)', v_n; END IF;
    SELECT count(*) INTO v_n FROM public.project_images WHERE project_id IN (v_pub, v_conf);
    IF v_n <> 1 THEN RAISE EXCEPTION 'anon sees % project images (expected 1: published project only)', v_n; END IF;
    SELECT count(*) INTO v_n FROM public.site_settings WHERE setting_key = 'reg_internal_setting';
    IF v_n <> 0 THEN RAISE EXCEPTION 'anon can read a non-allow-listed site setting'; END IF;
    EXECUTE 'RESET ROLE';

    RAISE EXCEPTION 'regression rollback' USING ERRCODE = 'P0099';
  EXCEPTION WHEN SQLSTATE 'P0099' THEN
    NULL;
  END;
END $$;

-- 10. Inbound content is size-bounded (anyone can email or text the inbound addresses).
DO $$
DECLARE v_len int; v_marker text; v_normal text;
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claim.role', 'service_role', true);
    PERFORM public.record_inbound_communication_worker('brevo_inbound','email', repeat('s',400) || '@example.org', NULL,
      repeat('subject ', 200), repeat('x', 2000000), 'reg-big', NULL, NULL, jsonb_build_object('blob', repeat('y', 1000000)));
    SELECT length(message), payload->>'truncated' INTO v_len, v_marker FROM public.communication_inbound WHERE provider_message_id = 'reg-big';
    IF v_len IS NULL THEN RAISE EXCEPTION 'oversized inbound message was not recorded'; END IF;
    IF v_len > 20000 THEN RAISE EXCEPTION 'inbound message body is not bounded (% characters stored)', v_len; END IF;
    IF v_marker IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'oversized raw payload was stored in full'; END IF;
    IF (SELECT length(sender) FROM public.communication_inbound WHERE provider_message_id = 'reg-big') > 320 THEN
      RAISE EXCEPTION 'inbound sender is not bounded';
    END IF;

    PERFORM public.record_inbound_communication_worker('brevo_inbound','email','reg-normal@example.org', NULL, 'Hello', 'A normal message.', 'reg-normal', NULL, NULL, '{"k":"v"}'::jsonb);
    SELECT message INTO v_normal FROM public.communication_inbound WHERE provider_message_id = 'reg-normal';
    IF v_normal IS DISTINCT FROM 'A normal message.' THEN RAISE EXCEPTION 'normal inbound message was altered'; END IF;

    RAISE EXCEPTION 'regression rollback' USING ERRCODE = 'P0099';
  EXCEPTION WHEN SQLSTATE 'P0099' THEN
    NULL;
  END;
END $$;

-- 11. Registration, consent and guest-to-registered continuity (rolled back by the P0099 marker).
DO $$
DECLARE
  v_user uuid := gen_random_uuid(); v_user2 uuid := gen_random_uuid(); v_user3 uuid := gen_random_uuid(); v_user4 uuid := gen_random_uuid();
  v_pid uuid; v_cust uuid; v_n int; v_portal jsonb; v_q text;
BEGIN
  BEGIN
    -- consent recorded at registration is visible to the portal and an opt-out is always honoured
    INSERT INTO auth.users(id,email,raw_user_meta_data,email_confirmed_at)
    VALUES (v_user,'reg-consent@example.org','{"topline_customer_registration":true,"name":"Reg Consent","phone":"0700810810","marketing_email_opt_in":true}'::jsonb, NULL);
    SELECT count(*) INTO v_n FROM public.brevo_marketing_sync_queue WHERE email = 'reg-consent@example.org';
    IF v_n <> 0 THEN RAISE EXCEPTION 'unverified signup was queued for marketing'; END IF;
    UPDATE auth.users SET email_confirmed_at = now() WHERE id = v_user;
    SELECT customer_id INTO v_cust FROM public.customer_portal_access WHERE auth_user_id = v_user;
    IF v_cust IS NULL THEN RAISE EXCEPTION 'verified registration was not linked to a customer'; END IF;
    IF NOT coalesce((SELECT marketing_email_enabled FROM public.customer_notification_preferences WHERE customer_id = v_cust), false) THEN
      RAISE EXCEPTION 'registration opt-in was not recorded in the customer preferences the portal reads';
    END IF;
    SELECT count(*) INTO v_n FROM public.brevo_marketing_sync_queue WHERE email = 'reg-consent@example.org' AND action = 'subscribe' AND status = 'queued';
    IF v_n <> 1 THEN RAISE EXCEPTION 'expected exactly one queued subscribe, found %', v_n; END IF;
    -- first-ever preference row saved as "off" after a subscribe must queue an unsubscribe
    DELETE FROM public.customer_notification_preferences WHERE customer_id = v_cust;
    INSERT INTO public.customer_notification_preferences(customer_id, marketing_email_enabled) VALUES (v_cust, false);
    SELECT count(*) INTO v_n FROM public.brevo_marketing_sync_queue WHERE email = 'reg-consent@example.org' AND action = 'unsubscribe' AND status = 'queued';
    IF v_n <> 1 THEN RAISE EXCEPTION 'explicit opt-out did not queue an unsubscribe (found %)', v_n; END IF;
    SELECT count(*) INTO v_n FROM public.brevo_marketing_sync_queue WHERE email = 'reg-consent@example.org' AND action = 'subscribe' AND status = 'queued';
    IF v_n <> 0 THEN RAISE EXCEPTION 'a stale subscribe is still queued after the opt-out'; END IF;

    -- guest who ordered twice then registers: one customer record, linked, orders visible
    INSERT INTO public.products(name,slug,price,stock_quantity,is_active,status,unit) VALUES ('Reg Cont Tile','reg-cont-'||gen_random_uuid(),500,50,true,'active','box') RETURNING id INTO v_pid;
    PERFORM public.create_secure_customer_order('Guest Reg','Guest.Reg@Example.org','0700820820',jsonb_build_array(jsonb_build_object('product_id',v_pid,'quantity',1)),'',NULL,NULL,'Nairobi','mpesa','reg-cont-1');
    PERFORM public.create_secure_customer_order('Guest Reg','guest.reg@example.org','+254700820820',jsonb_build_array(jsonb_build_object('product_id',v_pid,'quantity',1)),'',NULL,NULL,'Nairobi','mpesa','reg-cont-2');
    SELECT count(*) INTO v_n FROM public.customers WHERE lower(email) = 'guest.reg@example.org';
    IF v_n <> 1 THEN RAISE EXCEPTION 'returning guest created % customer records (expected 1)', v_n; END IF;
    PERFORM public.submit_quotation_request('Guest Reg','guest.reg@example.org','0700820820','Nairobi','Flooring','Epoxy','asked before registering','','');
    INSERT INTO auth.users(id,email,raw_user_meta_data,email_confirmed_at)
    VALUES (v_user2,'guest.reg@example.org','{"topline_customer_registration":true,"name":"Guest Reg","phone":"0700820820","marketing_email_opt_in":false}'::jsonb, NULL);
    UPDATE auth.users SET email_confirmed_at = now() WHERE id = v_user2;
    PERFORM set_config('request.jwt.claim.sub', v_user2::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    v_portal := public.get_customer_portal_data();
    IF jsonb_array_length(coalesce(v_portal->'orders','[]'::jsonb)) <> 2 THEN RAISE EXCEPTION 'portal shows % orders (expected 2)', jsonb_array_length(coalesce(v_portal->'orders','[]'::jsonb)); END IF;
    IF jsonb_array_length(coalesce(v_portal->'quotations','[]'::jsonb)) <> 1 THEN RAISE EXCEPTION 'portal does not show the quotation requested before registering'; END IF;

    -- legacy duplicates of the same person (same email AND phone, created before the order fix) still link
    PERFORM set_config('request.jwt.claim.sub', '', true); PERFORM set_config('request.jwt.claim.role', 'service_role', true);
    INSERT INTO public.customers(name,email,phone) VALUES ('Legacy Dup','legacy-dup@example.org','0700860860'),('Legacy Dup','Legacy-Dup@Example.org','+254700860860');
    INSERT INTO auth.users(id,email,raw_user_meta_data,email_confirmed_at)
    VALUES (v_user4,'legacy-dup@example.org','{"topline_customer_registration":true,"name":"Legacy Dup","phone":"0700860860","marketing_email_opt_in":false}'::jsonb, NULL);
    UPDATE auth.users SET email_confirmed_at = now() WHERE id = v_user4;
    SELECT count(*) INTO v_n FROM public.customer_portal_access WHERE auth_user_id = v_user4;
    IF v_n <> 1 THEN RAISE EXCEPTION 'same-person legacy duplicate customer records were not linked to the registered account'; END IF;

    -- different people sharing one email (different phones) are not linked automatically
    PERFORM set_config('request.jwt.claim.sub', '', true); PERFORM set_config('request.jwt.claim.role', 'service_role', true);
    PERFORM public.create_secure_customer_order('Person One','shared-reg@example.org','0700830830',jsonb_build_array(jsonb_build_object('product_id',v_pid,'quantity',1)),'',NULL,NULL,'Nairobi','mpesa','reg-shared-1');
    PERFORM public.create_secure_customer_order('Person Two','shared-reg@example.org','0700840840',jsonb_build_array(jsonb_build_object('product_id',v_pid,'quantity',1)),'',NULL,NULL,'Nairobi','mpesa','reg-shared-2');
    INSERT INTO auth.users(id,email,raw_user_meta_data,email_confirmed_at)
    VALUES (v_user3,'shared-reg@example.org','{"topline_customer_registration":true,"name":"Person One","phone":"0700830830","marketing_email_opt_in":false}'::jsonb, NULL);
    UPDATE auth.users SET email_confirmed_at = now() WHERE id = v_user3;
    SELECT count(*) INTO v_n FROM public.customer_portal_access WHERE auth_user_id = v_user3;
    IF v_n <> 0 THEN RAISE EXCEPTION 'an ambiguous shared email was linked automatically'; END IF;

    RAISE EXCEPTION 'regression rollback' USING ERRCODE = 'P0099';
  EXCEPTION WHEN SQLSTATE 'P0099' THEN
    NULL;
  END;
END $$;

-- 12. Customers are not sent internal pipeline states or draft invoices.
DO $$
DECLARE v_cust uuid; v_inv uuid; v_n int;
BEGIN
  BEGIN
    INSERT INTO public.customers(name,email,phone) VALUES ('Noise Reg','noise-reg@example.org','0700850850') RETURNING id INTO v_cust;
    DELETE FROM public.communication_outbox;
    INSERT INTO public.invoices(customer_id, invoice_number, customer_name, customer_email, customer_phone, subtotal, total_amount, due_date)
    VALUES (v_cust,'INV-REG-'||substr(gen_random_uuid()::text,1,8),'Noise Reg','noise-reg@example.org','0700850850',100,100,current_date+7) RETURNING id INTO v_inv;
    SELECT count(*) INTO v_n FROM public.communication_outbox;
    IF v_n <> 0 THEN RAISE EXCEPTION 'a draft invoice notified the customer (% messages)', v_n; END IF;
    UPDATE public.invoices SET status = 'sent' WHERE id = v_inv;
    SELECT count(*) INTO v_n FROM public.communication_outbox;
    IF v_n < 1 THEN RAISE EXCEPTION 'a sent invoice did not notify the customer'; END IF;
    RAISE EXCEPTION 'regression rollback' USING ERRCODE = 'P0099';
  EXCEPTION WHEN SQLSTATE 'P0099' THEN
    NULL;
  END;
END $$;

SELECT 'ok 1 - public surface regression assertions passed';
