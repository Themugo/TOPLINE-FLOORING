-- G-08 live role-isolation test. Requires disposable/staging fixture identities and records.
-- The runner substitutes UUID placeholders after strict validation. No rows are written.
BEGIN READ ONLY;

DO $$
DECLARE
  t text;
  v_enabled boolean;
BEGIN
  FOREACH t IN ARRAY ARRAY['customers','orders','projects','invoices','service_cases','communication_outbox','staff_profiles'] LOOP
    SELECT c.relrowsecurity INTO v_enabled
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname=t AND c.relkind IN ('r','p');
    IF v_enabled IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'G-08: RLS is not enabled on public.%', t;
    END IF;
  END LOOP;
  SELECT c.relrowsecurity INTO v_enabled
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='storage' AND c.relname='objects';
  IF v_enabled IS DISTINCT FROM true THEN RAISE EXCEPTION 'G-08: RLS is not enabled on storage.objects'; END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id='private-documents' AND public=false) THEN
    RAISE EXCEPTION 'G-08: private-documents bucket is missing or public';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects') THEN
    RAISE EXCEPTION 'G-08: storage.objects has no policies';
  END IF;
  IF NOT has_function_privilege('authenticated','private.current_user_has_permission(text,text)','EXECUTE')
     OR has_function_privilege('anon','private.current_user_has_permission(text,text)','EXECUTE') THEN
    RAISE EXCEPTION 'G-08: permission helper RPC grant boundary is incorrect';
  END IF;
  IF has_function_privilege('anon','public.claim_communication_outbox(integer)','EXECUTE')
     OR has_function_privilege('authenticated','public.claim_communication_outbox(integer)','EXECUTE')
     OR has_function_privilege('anon','public.complete_communication_delivery(uuid,text,text)','EXECUTE')
     OR has_function_privilege('authenticated','public.complete_communication_delivery(uuid,text,text)','EXECUTE')
     OR has_function_privilege('anon','public.fail_communication_delivery(uuid,text,boolean)','EXECUTE')
     OR has_function_privilege('authenticated','public.fail_communication_delivery(uuid,text,boolean)','EXECUTE') THEN
    RAISE EXCEPTION 'G-08: communication worker RPC is executable by browser roles';
  END IF;
END $$;

-- Anonymous users must not see the private fixture object.
SET LOCAL ROLE anon;
DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM storage.objects
  WHERE bucket_id='private-documents' AND name='__G08_PRIVATE_OBJECT__';
  IF v_count <> 0 THEN RAISE EXCEPTION 'G-08: anonymous role can see private storage fixture'; END IF;
END $$;
RESET ROLE;

-- Customer A must not see Customer B's order or private object.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub','__G08_CUSTOMER_A_AUTH_ID__','role','authenticated')::text, true);
DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.orders WHERE id='__G08_ORDER_B_ID__'::uuid;
  IF v_count <> 0 THEN RAISE EXCEPTION 'G-08: Customer A can read Customer B order'; END IF;
  SELECT count(*) INTO v_count FROM storage.objects
  WHERE bucket_id='private-documents' AND name='__G08_PRIVATE_OBJECT__';
  IF v_count <> 0 THEN RAISE EXCEPTION 'G-08: Customer A can read Customer B private object'; END IF;
END $$;
RESET ROLE;

-- Customer B must see its own order and private object (positive control).
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub','__G08_CUSTOMER_B_AUTH_ID__','role','authenticated')::text, true);
DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.orders WHERE id='__G08_ORDER_B_ID__'::uuid;
  IF v_count <> 1 THEN RAISE EXCEPTION 'G-08: Customer B cannot read its own fixture order (expected exactly one)'; END IF;
  SELECT count(*) INTO v_count FROM storage.objects
  WHERE bucket_id='private-documents' AND name='__G08_PRIVATE_OBJECT__';
  IF v_count <> 1 THEN RAISE EXCEPTION 'G-08: Customer B cannot read its own private object (expected exactly one)'; END IF;
END $$;
RESET ROLE;

ROLLBACK;
SELECT 'G-08 live RLS/RPC/Storage role-isolation tests PASSED' AS result;
