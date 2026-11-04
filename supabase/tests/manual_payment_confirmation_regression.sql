-- Staff confirm manual payments; guarded, receipted, and safe alongside automatic provider payments. Rolls back.
BEGIN;
DO $t$
DECLARE
  owner_id uuid := gen_random_uuid(); sales_id uuid := gen_random_uuid(); cat uuid := gen_random_uuid(); prod uuid := gen_random_uuid();
  r jsonb; ord uuid; ord2 uuid; pay text; failed boolean; pid uuid; n integer; ev jsonb;
BEGIN
  INSERT INTO auth.users(id,email,email_confirmed_at) VALUES (owner_id,'o@t.invalid',now()),(sales_id,'s@t.invalid',now());
  PERFORM private.bootstrap_owner(owner_id,'Owner');
  INSERT INTO public.categories(id,name,slug) VALUES (cat,'C','c-'||cat);
  INSERT INTO public.products(id,name,slug,sku,price,stock_quantity,in_stock,is_active,category_id) VALUES (prod,'Membrane','mem-'||prod,'M-'||left(prod::text,6),1000,50,true,true,cat);
  SET LOCAL ROLE anon;
  r := public.create_secure_customer_order('Amina','amina@t.invalid','0711000222',jsonb_build_array(jsonb_build_object('product_id',prod,'quantity',3)),'',NULL,NULL,'Nairobi','bank_transfer','mp-1');
  RESET ROLE; ord := (r->>'order_id')::uuid;
  SET LOCAL ROLE anon;
  r := public.create_secure_customer_order('Brian','brian@t.invalid','0711000333',jsonb_build_array(jsonb_build_object('product_id',prod,'quantity',1)),'',NULL,NULL,'Nairobi','bank_transfer','mp-2');
  RESET ROLE; ord2 := (r->>'order_id')::uuid;
  DELETE FROM public.communication_outbox;

  -- 1. A shopper / non-finance user cannot confirm payments.
  failed := false;
  SET LOCAL ROLE anon; BEGIN PERFORM public.confirm_manual_order_payment(ord,3000,'bank_transfer','BANKREF1'); EXCEPTION WHEN OTHERS THEN failed := true; END; RESET ROLE;
  IF NOT failed THEN RAISE EXCEPTION '1a anon confirmed a payment'; END IF;
  failed := false;
  PERFORM set_config('request.jwt.claim.sub',sales_id::text,true); SET LOCAL ROLE authenticated;
  BEGIN PERFORM public.confirm_manual_order_payment(ord,3000,'bank_transfer','BANKREF1'); EXCEPTION WHEN OTHERS THEN failed := true; END; RESET ROLE;
  IF NOT failed THEN RAISE EXCEPTION '1b user without staff role confirmed a payment'; END IF;

  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true); SET LOCAL ROLE authenticated;
  -- 2. Reference is mandatory for bank / M-Pesa.
  failed := false; BEGIN PERFORM public.confirm_manual_order_payment(ord,1000,'mpesa',''); EXCEPTION WHEN OTHERS THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION '2 payment without reference accepted'; END IF;
  -- 3. Partial payment, receipt queued, balance reported.
  r := public.confirm_manual_order_payment(ord,1000,'mpesa','qwe123xyz','Till 5260389','first part');
  RESET ROLE;
  IF NOT (r->>'success')::boolean OR NOT (r->>'receipt_emailed')::boolean THEN RAISE EXCEPTION '3a partial not receipted: %', r; END IF;
  IF (r->>'balance')::numeric <> 2000 THEN RAISE EXCEPTION '3b balance wrong: %', r; END IF;
  SELECT payment_status INTO pay FROM public.orders WHERE id=ord; IF pay <> 'partial' THEN RAISE EXCEPTION '3c status %', pay; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.communication_outbox WHERE recipient='amina@t.invalid' AND message LIKE '%QWE123XYZ%' AND message LIKE '%Balance remaining: KES 2,000.00%') THEN RAISE EXCEPTION '3d receipt text'; END IF;
  pid := (r->>'payment_id')::uuid;

  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true); SET LOCAL ROLE authenticated;
  -- 4. Same reference again (same or another order) is refused: no double crediting.
  failed := false; BEGIN PERFORM public.confirm_manual_order_payment(ord,1000,'mpesa','QWE123XYZ'); EXCEPTION WHEN OTHERS THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION '4a duplicate reference on same order'; END IF;
  failed := false; BEGIN PERFORM public.confirm_manual_order_payment(ord2,1000,'mpesa','qwe123xyz'); EXCEPTION WHEN OTHERS THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION '4b duplicate reference on other order'; END IF;
  -- 5. Overpayment refused.
  failed := false; BEGIN PERFORM public.confirm_manual_order_payment(ord,5000,'bank_transfer','BANKREF9'); EXCEPTION WHEN OTHERS THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION '5 overpayment accepted'; END IF;
  -- 6. Balance paid: order becomes paid and confirmed; resend works.
  r := public.confirm_manual_order_payment(ord,2000,'bank_transfer','BANKREF2','NCBA');
  PERFORM public.resend_payment_receipt(pid);
  RESET ROLE;
  SELECT payment_status INTO pay FROM public.orders WHERE id=ord; IF pay <> 'paid' THEN RAISE EXCEPTION '6a not paid: %', pay; END IF;
  IF (SELECT status FROM public.orders WHERE id=ord) <> 'confirmed' THEN RAISE EXCEPTION '6b order not confirmed'; END IF;
  SELECT count(*) INTO n FROM public.communication_outbox WHERE recipient='amina@t.invalid' AND subject LIKE 'Payment received%'; IF n <> 3 THEN RAISE EXCEPTION '6c expected 3 receipts (2 payments + resend), got %', n; END IF;

  -- 7. An automatic provider payment (Daraja style) on the other order uses the same ledger and receipt.
  PERFORM set_config('request.jwt.claim.role','service_role',true);
  ev := public.apply_payment_provider_event('mpesa','evt-1','payment.success','successful',1000,'KES',ord2::text,'SJK9Z8Y7X6','SJK9Z8Y7X6','{"k":1}'::jsonb);
  PERFORM set_config('request.jwt.claim.role','',true);
  IF NOT (ev->>'success')::boolean THEN RAISE EXCEPTION '7a provider event failed: %', ev; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.communication_outbox WHERE recipient='brian@t.invalid' AND subject LIKE 'Payment received%') THEN RAISE EXCEPTION '7b provider payment not receipted'; END IF;
  -- 8. Staff can no longer confirm the same M-Pesa code manually.
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true); SET LOCAL ROLE authenticated;
  failed := false; BEGIN PERFORM public.confirm_manual_order_payment(ord2,1,'mpesa','SJK9Z8Y7X6'); EXCEPTION WHEN OTHERS THEN failed := true; END;
  RESET ROLE;
  IF NOT failed THEN RAISE EXCEPTION '8 auto-paid code accepted manually'; END IF;
  RAISE NOTICE 'ok 1 manual-payment';
END $t$;
ROLLBACK;
\echo ' manual_payment_confirmation_regression: OK'
