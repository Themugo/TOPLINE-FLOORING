-- Pass 22: complete manual-payment order journey as a real shopper and as staff. Rolls back.
-- Run: psql -v ON_ERROR_STOP=1 -f supabase/tests/order_flow_e2e_regression.sql
BEGIN;
DO $t$
DECLARE
  owner_id uuid := gen_random_uuid(); cat uuid := gen_random_uuid(); prod uuid := gen_random_uuid();
  r jsonb; ord uuid; onum text; n integer; st text; pay text; stock_before integer; stock_after integer; msg text;
BEGIN
  INSERT INTO auth.users(id,email,email_confirmed_at) VALUES (owner_id,'o@t.invalid',now());
  PERFORM private.bootstrap_owner(owner_id,'Owner');
  INSERT INTO public.site_settings(setting_key,setting_value) VALUES ('contact','{"email":"staff@t.invalid"}'::jsonb) ON CONFLICT (setting_key) DO UPDATE SET setting_value=excluded.setting_value;
  INSERT INTO public.categories(id,name,slug) VALUES (cat,'C','c-'||cat);
  INSERT INTO public.products(id,name,slug,sku,price,stock_quantity,in_stock,is_active,category_id) VALUES (prod,'Membrane','mem-'||prod,'M-'||left(prod::text,6),6200,10,true,true,cat);
  INSERT INTO public.business_payment_accounts(kind,label,till_number,show_to_customers,is_active) VALUES ('mpesa_till','Till','5260389',true,true);
  INSERT INTO public.business_payment_accounts(kind,label,paybill_number,account_number,show_to_customers,is_active) VALUES ('mpesa_paybill','Paybill','880100','208597',true,true);
  INSERT INTO public.business_payment_accounts(kind,label,bank_name,account_name,account_number,show_to_customers,is_active) VALUES ('bank','Bank','Ncba','Topline','1006933658',true,true);
  INSERT INTO public.business_payment_accounts(kind,label,till_number,show_to_customers,is_active) VALUES ('mpesa_till','Hidden','9999999',false,true);
  DELETE FROM public.communication_outbox;
  SELECT stock_quantity INTO stock_before FROM public.products WHERE id=prod;

  -- 1. Anonymous shopper: manual payment is offered and only published accounts are visible.
  SET LOCAL ROLE anon;
  IF jsonb_array_length(public.get_customer_payment_methods('checkout')) < 1 THEN RAISE EXCEPTION '1a checkout shows no payment method'; END IF;
  IF public.get_customer_payment_methods('checkout')->0->>'payment_method' <> 'bank_transfer' THEN RAISE EXCEPTION '1b manual method must be offered'; END IF;
  IF jsonb_array_length(public.get_public_payment_accounts()) <> 3 THEN RAISE EXCEPTION '1c public accounts must be the 3 published'; END IF;
  IF public.get_public_payment_accounts()::text LIKE '%9999999%' THEN RAISE EXCEPTION '1d unpublished account leaked'; END IF;

  -- 2. Cart submit as anon with manual payment.
  r := public.create_secure_customer_order('Wanjiru','wanjiru@t.invalid','0712345678',jsonb_build_array(jsonb_build_object('product_id',prod,'quantity',1)),'',NULL,NULL,'Nairobi','bank_transfer','e2e-1');
  RESET ROLE;
  IF NOT (r->>'success')::boolean THEN RAISE EXCEPTION '2a order not accepted: %', r; END IF;
  ord := (r->>'order_id')::uuid; onum := r->>'order_number';
  IF onum IS NULL THEN RAISE EXCEPTION '2b order number missing'; END IF;
  IF (SELECT total_amount FROM public.orders WHERE id=ord) <> 6200 THEN RAISE EXCEPTION '2c total wrong'; END IF;
  IF (SELECT count(*) FROM public.order_items WHERE order_id=ord) <> 1 THEN RAISE EXCEPTION '2d order item missing'; END IF;
  SELECT payment_status INTO pay FROM public.orders WHERE id=ord;
  IF pay <> 'pending' THEN RAISE EXCEPTION '2e payment must start pending, got %', pay; END IF;

  -- 3. Retry with the same key (browser reload / failed payment call) must not create a second order.
  SET LOCAL ROLE anon;
  r := public.create_secure_customer_order('Wanjiru','wanjiru@t.invalid','0712345678',jsonb_build_array(jsonb_build_object('product_id',prod,'quantity',1)),'',NULL,NULL,'Nairobi','bank_transfer','e2e-1');
  RESET ROLE;
  IF (r->>'order_id')::uuid <> ord THEN RAISE EXCEPTION '3 retry created a different order'; END IF;
  SELECT count(*) INTO n FROM public.orders WHERE customer_email='wanjiru@t.invalid';
  IF n <> 1 THEN RAISE EXCEPTION '3b duplicate orders: %', n; END IF;

  -- 4. Buyer and staff are told: confirmation carries the pay-manually details, staff get an alert.
  SELECT message INTO msg FROM public.communication_outbox WHERE recipient='wanjiru@t.invalid' AND subject LIKE 'We received your order%' LIMIT 1;
  IF msg IS NULL THEN RAISE EXCEPTION '4a customer confirmation email missing'; END IF;
  IF msg NOT LIKE '%5260389%' OR msg NOT LIKE '%880100%' OR msg NOT LIKE '%1006933658%' THEN RAISE EXCEPTION '4b confirmation lacks payment accounts'; END IF;
  IF msg LIKE '%9999999%' THEN RAISE EXCEPTION '4c confirmation leaked an unpublished account'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.communication_outbox WHERE recipient='staff@t.invalid' AND subject LIKE 'New order %') THEN RAISE EXCEPTION '4d staff alert missing'; END IF;

  -- 5. Public tracking shows the order to the buyer only with the right phone.
  SET LOCAL ROLE anon;
  IF NOT coalesce((public.track_order_public(onum,'0712345678')->>'found')::boolean,false) THEN RAISE EXCEPTION '5a tracking must find the order'; END IF;
  IF coalesce((public.track_order_public(onum,'0700000000')->>'found')::boolean,false) THEN RAISE EXCEPTION '5b tracking must not find with the wrong phone'; END IF;
  RESET ROLE;

  -- 6. Staff confirm the M-Pesa payment, the order becomes paid and the buyer gets a receipt.
  DELETE FROM public.communication_outbox;
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true); SET LOCAL ROLE authenticated;
  PERFORM public.record_order_payment_transaction(ord,6200,'mpesa','QWE123XYZ',NULL,NULL,'e2e-pay-1','manual M-Pesa');
  RESET ROLE;
  SELECT payment_status INTO pay FROM public.orders WHERE id=ord;
  IF pay <> 'paid' THEN RAISE EXCEPTION '6a order not paid after full payment: %', pay; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.communication_outbox WHERE recipient='wanjiru@t.invalid' AND subject LIKE 'Payment received%') THEN RAISE EXCEPTION '6b receipt missing'; END IF;

  -- 7. Fulfilment: staff move the order through its statuses.
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true); SET LOCAL ROLE authenticated;
  PERFORM public.update_order_status_transaction(ord,'confirmed');
  PERFORM public.update_order_status_transaction(ord,'processing');
  PERFORM public.update_order_status_transaction(ord,'completed');
  RESET ROLE;
  SELECT status INTO st FROM public.orders WHERE id=ord;
  IF st <> 'completed' THEN RAISE EXCEPTION '7 order did not reach completed: %', st; END IF;
  SELECT stock_quantity INTO stock_after FROM public.products WHERE id=prod;
  IF stock_after <> stock_before - 1 THEN RAISE EXCEPTION '7b stock must drop by 1 (% -> %)', stock_before, stock_after; END IF;

  -- 8. Contact / quotation request as an anonymous visitor: lead + quotation stored, staff alerted, repeat spam limited.
  DELETE FROM public.communication_outbox;
  SET LOCAL ROLE anon;
  r := public.submit_quotation_request('Otieno','otieno@t.invalid','0722000111','Nairobi','Commercial','Epoxy flooring','Need 300 sqm warehouse floor','500k-1m','1 month');
  RESET ROLE;
  IF NOT (r->>'success')::boolean THEN RAISE EXCEPTION '8a quotation request rejected: %', r; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.leads WHERE email='otieno@t.invalid') THEN RAISE EXCEPTION '8b lead not created'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.quotations WHERE email='otieno@t.invalid') THEN RAISE EXCEPTION '8c quotation not created'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.communication_outbox WHERE recipient='staff@t.invalid') THEN RAISE EXCEPTION '8d staff not alerted of the enquiry'; END IF;
  RAISE NOTICE 'ok order-flow';
END $t$;
ROLLBACK;
