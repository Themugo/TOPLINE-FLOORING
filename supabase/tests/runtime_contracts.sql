-- Topline runtime contract tests (pgTAP, run by `supabase test db --local` and by psql).
-- Run against a disposable/local database after all migrations are applied, e.g.
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/runtime_contracts.sql
-- Everything runs inside one transaction that is rolled back, so no data is left behind.
-- The test exercises code that static checks cannot: it fails loudly if a function raises at
-- call time (missing helper, write inside a STABLE function, wrong permission resource).

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(1);

SELECT lives_ok($runtime$
DO $body$
DECLARE
  v_user    uuid := gen_random_uuid();
  v_staff   uuid := gen_random_uuid();
  v_outbox  uuid;
  v_cust    uuid := gen_random_uuid();
  v_product uuid;
  v_order   uuid;
  v_result  jsonb;
  v_status  text;
  v_count   integer;
BEGIN
  -- Fixtures -------------------------------------------------------------------------------
  INSERT INTO auth.users (id, email) VALUES (v_user, 'runtime-contract-' || v_user || '@test.invalid');
  INSERT INTO public.customers (id, name, email, phone)
    VALUES (v_cust, 'Runtime Contract', 'runtime-contract-' || v_cust || '@test.invalid', '+254700000099');
  INSERT INTO public.customer_portal_access (auth_user_id, customer_id, is_active) VALUES (v_user, v_cust, true);
  INSERT INTO public.products (name, slug, price, is_active, in_stock, stock_quantity, unit)
    VALUES ('Runtime Contract Product', 'runtime-contract-' || v_user, 1000, true, true, 10, 'unit')
    RETURNING id INTO v_product;

  -- 1. Checkout RPC (anonymous) --------------------------------------------------------------
  SET LOCAL ROLE anon;
  v_result := public.create_secure_customer_order(
    'Runtime Contract', 'runtime@test.invalid', '+254700000099',
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 2)),
    '', NULL, NULL, NULL, 'mpesa', 'runtime-contract-' || v_user);
  RESET ROLE;
  IF (v_result ->> 'success')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'checkout RPC failed: %', v_result; END IF;
  v_order := (v_result ->> 'order_id')::uuid;
  IF (v_result ->> 'total')::numeric <> 2000 THEN RAISE EXCEPTION 'checkout total must be priced server-side, got %', v_result ->> 'total'; END IF;

  -- 2. Provider payment event: must hash its payload, apply once, and be idempotent -----------
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  SET LOCAL ROLE service_role;
  v_result := public.apply_payment_provider_event('mpesa', 'runtime-evt-' || v_user, 'payment.succeeded', 'completed',
                2000, 'KES', v_order::text, 'TX-' || v_user, 'REF-' || v_user, '{}'::jsonb);
  IF (v_result ->> 'payment_status') <> 'paid' THEN RAISE EXCEPTION 'provider event must mark the order paid: %', v_result; END IF;
  v_result := public.apply_payment_provider_event('mpesa', 'runtime-evt-' || v_user, 'payment.succeeded', 'completed',
                2000, 'KES', v_order::text, 'TX-' || v_user, 'REF-' || v_user, '{}'::jsonb);
  IF (v_result ->> 'idempotent_replay')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'replayed provider event must be idempotent: %', v_result; END IF;
  RESET ROLE;
  SELECT count(*) INTO v_count FROM public.payment_transactions WHERE order_id = v_order AND status = 'successful';
  IF v_count <> 1 THEN RAISE EXCEPTION 'exactly one successful transaction expected, found %', v_count; END IF;

  -- 3. Customer portal RPCs for a signed-in customer ------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', v_user::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  SET LOCAL ROLE authenticated;
  v_result := public.get_customer_portal_data();
  IF (v_result -> 'customer' ->> 'id')::uuid <> v_cust THEN RAISE EXCEPTION 'get_customer_portal_data returned the wrong customer'; END IF;
  v_result := public.get_customer_portal_360();
  IF v_result IS NULL THEN RAISE EXCEPTION 'get_customer_portal_360 returned nothing'; END IF;
  -- The customer must not be able to apply provider events themselves.
  BEGIN
    PERFORM public.apply_payment_provider_event('mpesa', 'forged', 'payment.succeeded', 'completed', 1, 'KES', v_order::text, 'TX-F', 'R', '{}'::jsonb);
    RAISE EXCEPTION 'customer must not be able to call apply_payment_provider_event';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;

  -- 4. Staff payment recording needs the `finance` permission resource ------------------------
  SELECT count(*) INTO v_count FROM public.staff_permissions WHERE resource = 'finance' AND action = 'update';
  IF v_count <> 1 THEN RAISE EXCEPTION 'finance.update permission must exist (payment RPCs require it)'; END IF;

  -- 5. Public quotation form: an AFTER trigger resolves the customer for every quotation write ------
  SET LOCAL ROLE anon;
  v_result := public.submit_quotation_request('Runtime Contract', 'runtime-quote@test.invalid', '+254700000098',
                'Nairobi', 'Epoxy', 'Industrial floor', 'Runtime contract test', '1M-2M', '1 month');
  RESET ROLE;
  IF (v_result ->> 'success')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'quotation submission failed: %', v_result; END IF;

  -- 6. Customer sign-up: the auth.users trigger must create or link the customer ---------------------
  INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (gen_random_uuid(), 'runtime-signup-' || v_user || '@test.invalid',
            jsonb_build_object('topline_customer_registration', true, 'name', 'Runtime Signup', 'phone', '+254700000097'));
  SELECT count(*) INTO v_count FROM public.customers WHERE email = 'runtime-signup-' || v_user || '@test.invalid';
  IF v_count <> 1 THEN RAISE EXCEPTION 'customer registration trigger must create exactly one customer, found %', v_count; END IF;

  -- 7. Staff dashboards must run (they raised at call time when columns/functions did not exist) -----
  INSERT INTO auth.users (id, email) VALUES (v_staff, 'runtime-staff-' || v_staff || '@test.invalid');
  INSERT INTO public.staff_profiles (user_id, display_name, is_active) VALUES (v_staff, 'Runtime Staff', true);
  INSERT INTO public.staff_role_assignments (user_id, role_id) SELECT v_staff, id FROM public.staff_roles WHERE code = 'owner';
  PERFORM set_config('request.jwt.claim.sub', v_staff::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  SET LOCAL ROLE authenticated;
  PERFORM public.get_communications_release_gate_360();
  PERFORM public.get_customer_lifecycle_360(NULL);
  PERFORM public.get_customer_lifecycle_operations_360();
  PERFORM public.get_data_governance_360();
  PERFORM public.get_hse_site_compliance_360();
  PERFORM public.get_quality_assurance_360();
  RESET ROLE;

  -- 8. Staff message -> outbox -> worker -> provider callback ---------------------------------------
  PERFORM set_config('request.jwt.claim.sub', v_staff::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  SET LOCAL ROLE authenticated;
  v_outbox := public.queue_customer_message(v_cust, 'email', 'runtime-contract-' || v_cust || '@test.invalid', 'runtime body', 'runtime subject');
  RESET ROLE;
  IF v_outbox IS NULL THEN RAISE EXCEPTION 'queue_customer_message returned no outbox id'; END IF;
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  SET LOCAL ROLE service_role;
  SELECT count(*) INTO v_count FROM public.claim_communication_outbox_worker(50) WHERE id = v_outbox;
  IF v_count <> 1 THEN RAISE EXCEPTION 'worker must claim the queued message, claimed %', v_count; END IF;
  PERFORM public.record_communication_delivery_attempt_worker(v_outbox, 1, 'brevo', 'email', gen_random_uuid(), 'accepted', 201, 'rt-msg-' || v_user, NULL, '{}'::jsonb);
  PERFORM public.complete_communication_delivery_worker(v_outbox, 'brevo', 'rt-msg-' || v_user);
  PERFORM public.record_provider_delivery_event_worker('brevo', 'email', 'delivered', 'rt-msg-' || v_user, 'rt-msg-' || v_user, NULL, '{}'::jsonb);
  PERFORM public.record_inbound_communication_worker('brevo_inbound', 'email', 'runtime-contract-' || v_cust || '@test.invalid', NULL, 'Re: runtime', 'reply', NULL, NULL, NULL, '{}'::jsonb);
  RESET ROLE;
  SELECT status INTO v_status FROM public.communication_outbox WHERE id = v_outbox;
  IF v_status <> 'sent' THEN RAISE EXCEPTION 'completed message must be sent, got %', v_status; END IF;

  RAISE NOTICE 'runtime contracts passed';
END $body$;
$runtime$, 'checkout, provider payment events, quotations, customer sign-up, staff messaging worker pipeline, portal and staff dashboard RPCs behave at runtime');

SELECT * FROM finish();
ROLLBACK;
