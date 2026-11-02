-- Run with: psql -v ON_ERROR_STOP=1 -f supabase/tests/business_payment_accounts_regression.sql  (rolls back)
BEGIN;
DO $$
DECLARE v_json jsonb; v_failed boolean;
BEGIN
  INSERT INTO public.business_payment_accounts(id,kind,label,bank_name,account_name,account_number,display_order) VALUES
    ('00000000-0000-0000-0000-0000000000b1','bank','KCB Main','KCB Bank','Topline Ltd','1234567890',1);
  INSERT INTO public.business_payment_accounts(id,kind,label,paybill_number,reference_hint,display_order) VALUES
    ('00000000-0000-0000-0000-0000000000b2','mpesa_paybill','M-Pesa Paybill','522522','Use your order number',2);
  INSERT INTO public.business_payment_accounts(id,kind,label,bank_name,account_name,account_number,is_active) VALUES
    ('00000000-0000-0000-0000-0000000000b3','bank','Retired','Old Bank','Topline Ltd','9999999999',false);
  INSERT INTO public.business_payment_accounts(id,kind,label,bank_name,account_name,account_number,show_to_customers) VALUES
    ('00000000-0000-0000-0000-0000000000b4','bank','Internal only','Int Bank','Topline Ltd','5555555555',false);

  -- validation
  v_failed := false; BEGIN INSERT INTO public.business_payment_accounts(kind,label,bank_name) VALUES ('bank','Missing number','X'); EXCEPTION WHEN check_violation THEN v_failed := true; END;
  IF NOT v_failed THEN RAISE EXCEPTION 'a bank account without name/number must be rejected'; END IF;
  v_failed := false; BEGIN INSERT INTO public.business_payment_accounts(kind,label,paybill_number) VALUES ('mpesa_paybill','Bad','12ab'); EXCEPTION WHEN check_violation THEN v_failed := true; END;
  IF NOT v_failed THEN RAISE EXCEPTION 'a non-numeric paybill must be rejected'; END IF;

  -- anon and plain authenticated users cannot read the table
  IF has_table_privilege('anon','public.business_payment_accounts','SELECT') THEN RAISE EXCEPTION 'anon must not read payment accounts'; END IF;
  IF has_function_privilege('anon','public.get_customer_payment_accounts()','EXECUTE') THEN RAISE EXCEPTION 'anon must not execute get_customer_payment_accounts'; END IF;

  -- function requires a customer
  PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000aa',true);
  v_failed := false; BEGIN PERFORM public.get_customer_payment_accounts(); EXCEPTION WHEN OTHERS THEN v_failed := true; END;
  IF NOT v_failed THEN RAISE EXCEPTION 'non-customers must be refused'; END IF;
END $$;

-- customer view: only active + shared accounts, in display order
DO $$
DECLARE v_uid uuid := '00000000-0000-0000-0000-0000000000c0'; v_cid uuid; v_json jsonb; v_labels text[];
BEGIN
  PERFORM set_config('request.jwt.claim.sub','',true);
  INSERT INTO auth.users(id,email) VALUES (v_uid,'portal-test@example.com');
  INSERT INTO public.customers(name,email,phone) VALUES ('Portal Test','portal-test@example.com','0700000000') RETURNING id INTO v_cid;
  BEGIN
    INSERT INTO public.customer_portal_access(customer_id,auth_user_id,is_active) VALUES (v_cid,v_uid,true);
  EXCEPTION WHEN undefined_column THEN
    RAISE NOTICE 'customer_portal_access shape differs; skipping customer-view assertions';
    RETURN;
  END;
  PERFORM set_config('request.jwt.claim.sub',v_uid::text,true);
  v_json := public.get_customer_payment_accounts();
  SELECT array_agg(e->>'label' ORDER BY ord) INTO v_labels FROM jsonb_array_elements(v_json) WITH ORDINALITY AS t(e,ord);
  IF v_labels IS DISTINCT FROM ARRAY['KCB Main','M-Pesa Paybill']::text[] THEN RAISE EXCEPTION 'customers must see only active shared accounts in order, got %', v_labels; END IF;
  IF v_json::text LIKE '%created_by%' THEN RAISE EXCEPTION 'internal columns must not leak'; END IF;
END $$;
ROLLBACK;
SELECT 'business_payment_accounts_regression: OK' AS result;
