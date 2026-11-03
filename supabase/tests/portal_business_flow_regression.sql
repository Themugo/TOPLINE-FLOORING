-- Customer portal + business flow regression (plain psql, rolled back).
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/portal_business_flow_regression.sql
-- Covers: portal claim, draft hiding, quotation response -> order/project, ownership isolation,
-- staff payment-detail save, staff read of site_settings, checkout stock rules, order tracking, payment bounds.
BEGIN;
DO $t$
DECLARE
  owner_id uuid := gen_random_uuid(); jane uuid := gen_random_uuid(); mike uuid := gen_random_uuid(); newbie uuid := gen_random_uuid();
  jane_c uuid := gen_random_uuid(); mike_c uuid := gen_random_uuid();
  qa uuid := gen_random_uuid(); qd uuid := gen_random_uuid(); qm uuid := gen_random_uuid();
  cat uuid := gen_random_uuid(); prod uuid := gen_random_uuid();
  r jsonb; n integer; failed boolean; ord uuid; onum text;
BEGIN
  INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
    (owner_id,'owner-'||owner_id||'@t.invalid',now()),(jane,'jane-'||jane||'@t.invalid',now()),
    (mike,'mike-'||mike||'@t.invalid',now()),(newbie,'newbie-'||newbie||'@t.invalid',NULL);
  PERFORM private.bootstrap_owner(owner_id,'Owner');
  INSERT INTO public.customers(id,name,email,phone) VALUES
    (jane_c,'Jane','jane-'||jane||'@t.invalid','0700000001'),(mike_c,'Mike','mike-'||mike||'@t.invalid','0700000002');
  DELETE FROM public.customer_portal_access WHERE auth_user_id IN (jane,mike);
  INSERT INTO public.quotations(id,quotation_number,name,email,phone,status,customer_id,valid_until,subtotal,total_amount) VALUES
    (qa,'RFQ-A','Jane','jane-'||jane||'@t.invalid','0700000001','sent',jane_c,current_date+7,1000,1160),
    (qd,'RFQ-D','Jane','jane-'||jane||'@t.invalid','0700000001','draft',jane_c,NULL,1,1),
    (qm,'RFQ-M','Mike','mike-'||mike||'@t.invalid','0700000002','sent',mike_c,current_date+7,5,5);
  INSERT INTO public.quotation_items(quotation_id,description,quantity,unit,unit_price) VALUES (qa,'Epoxy',10,'sqm',100);
  INSERT INTO public.invoices(invoice_number,customer_id,customer_name,status,subtotal,total_amount) VALUES ('INV-DRAFT-T',jane_c,'Jane','draft',1,1);

  -- unverified accounts cannot claim
  PERFORM set_config('request.jwt.claim.sub',newbie::text,true); SET LOCAL ROLE authenticated;
  r := public.claim_customer_portal_access();
  IF r->>'status' <> 'unverified' THEN RAISE EXCEPTION 'unverified claim: %', r; END IF;
  -- verified user links, second call idempotent
  PERFORM set_config('request.jwt.claim.sub',jane::text,true);
  r := public.claim_customer_portal_access();
  IF r->>'status' <> 'linked' THEN RAISE EXCEPTION 'claim: %', r; END IF;
  r := public.claim_customer_portal_access();
  IF r->>'status' <> 'already_linked' THEN RAISE EXCEPTION 'claim repeat: %', r; END IF;
  -- drafts hidden
  r := public.get_customer_portal_360();
  IF jsonb_array_length(r->'quotations') <> 1 OR jsonb_array_length(r->'invoices') <> 0 THEN RAISE EXCEPTION 'drafts leaked: %', r; END IF;
  -- decline needs a note; other customer's quote invisible
  failed := false; BEGIN PERFORM public.respond_to_customer_quotation(qa,'decline',NULL); EXCEPTION WHEN OTHERS THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION 'decline without note allowed'; END IF;
  failed := false; BEGIN PERFORM public.respond_to_customer_quotation(qm,'accept',NULL); EXCEPTION WHEN OTHERS THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION 'cross-customer quotation response allowed'; END IF;
  -- accept converts
  r := public.respond_to_customer_quotation(qa,'accept',NULL);
  IF r->>'status' <> 'converted' OR r->>'order_id' IS NULL OR r->>'project_id' IS NULL THEN RAISE EXCEPTION 'accept: %', r; END IF;
  failed := false; BEGIN PERFORM public.respond_to_customer_quotation(qa,'accept',NULL); EXCEPTION WHEN OTHERS THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION 'double accept allowed'; END IF;
  r := public.get_customer_portal_360();
  IF jsonb_array_length(r->'orders') <> 1 OR jsonb_array_length(r->'projects') <> 1 THEN RAISE EXCEPTION 'order/project missing: %', r; END IF;
  -- service case ownership
  PERFORM public.create_service_case(jane_c,'Crack','Hairline','warranty');
  failed := false; BEGIN PERFORM public.create_service_case(mike_c,'x','y','warranty'); EXCEPTION WHEN OTHERS THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION 'service case for another customer allowed'; END IF;
  -- customer cannot read payment accounts table or site_settings beyond allow-list
  SELECT count(*) INTO n FROM public.business_payment_accounts; IF n <> 0 THEN RAISE EXCEPTION 'customer reads payment accounts'; END IF;
  SELECT count(*) INTO n FROM public.site_settings WHERE setting_key <> 'custom_css'; IF n <> 0 THEN RAISE EXCEPTION 'customer reads private settings'; END IF;
  RESET ROLE;

  -- staff: payment details save + site settings upsert/read
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true); SET LOCAL ROLE authenticated;
  INSERT INTO public.business_payment_accounts(kind,label,bank_name,account_name,account_number) VALUES ('bank','KCB','KCB','Topline','1234567890');
  UPDATE public.business_payment_accounts SET label='KCB main';
  INSERT INTO public.site_settings(setting_key,setting_value) VALUES ('site_info','{"site_name":"T"}'::jsonb)
    ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;
  SELECT count(*) INTO n FROM public.site_settings WHERE setting_key='site_info'; IF n <> 1 THEN RAISE EXCEPTION 'staff cannot read site_settings'; END IF;
  RESET ROLE;
  SET LOCAL ROLE authenticated; PERFORM set_config('request.jwt.claim.sub',jane::text,true);
  r := public.get_customer_payment_accounts();
  IF jsonb_array_length(r) <> 1 THEN RAISE EXCEPTION 'customer should see 1 visible payment account: %', r; END IF;
  RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub','',true);

  -- checkout: stock reserved, oversell refused, replay idempotent, tracking requires phone
  INSERT INTO public.categories(id,name,slug) VALUES (cat,'Tiles','tiles-'||cat);
  INSERT INTO public.products(id,name,slug,sku,price,stock_quantity,in_stock,is_active,category_id) VALUES (prod,'Tile A','tile-'||prod,'TA-'||left(prod::text,6),1000,5,true,true,cat);
  SET LOCAL ROLE anon;
  r := public.create_secure_customer_order('Zed','zed@t.invalid','0711111111',jsonb_build_array(jsonb_build_object('product_id',prod,'quantity',2)),'',NULL,NULL,'Nairobi','mpesa','idem-reg-1');
  IF NOT (r->>'success')::boolean THEN RAISE EXCEPTION 'checkout: %', r; END IF;
  ord := (r->>'order_id')::uuid; onum := r->>'order_number';
  r := public.create_secure_customer_order('Zed','zed@t.invalid','0711111111',jsonb_build_array(jsonb_build_object('product_id',prod,'quantity',10)),'',NULL,NULL,'Nairobi','mpesa','idem-reg-2');
  IF (r->>'success')::boolean THEN RAISE EXCEPTION 'oversell allowed'; END IF;
  IF (public.track_order_public(onum,'0711111111')->>'found')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'tracking failed'; END IF;
  IF (public.track_order_public(onum,'0799999999')->>'found')::boolean IS NOT FALSE THEN RAISE EXCEPTION 'tracking leaked'; END IF;
  RESET ROLE;
  -- stock is reserved (not yet deducted): a second order cannot take what is already held
  SET LOCAL ROLE anon;
  r := public.create_secure_customer_order('Yan','yan@t.invalid','0722222222',jsonb_build_array(jsonb_build_object('product_id',prod,'quantity',4)),'',NULL,NULL,'Nairobi','mpesa','idem-reg-3');
  IF (r->>'success')::boolean THEN RAISE EXCEPTION 'reserved stock was oversold: %', r; END IF;
  r := public.create_secure_customer_order('Yan','yan@t.invalid','0722222222',jsonb_build_array(jsonb_build_object('product_id',prod,'quantity',3)),'',NULL,NULL,'Nairobi','mpesa','idem-reg-4');
  IF NOT (r->>'success')::boolean THEN RAISE EXCEPTION 'remaining stock should be orderable: %', r; END IF;
  RESET ROLE;

  -- staff payment bounds + idempotency
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true); SET LOCAL ROLE authenticated;
  PERFORM public.record_order_payment_transaction(ord,500,'mpesa','R1',NULL,NULL,'idem-p1','part');
  r := public.record_order_payment_transaction(ord,500,'mpesa','R1',NULL,NULL,'idem-p1','dup');
  IF NOT coalesce((r->>'idempotent_replay')::boolean,false) THEN RAISE EXCEPTION 'payment not idempotent: %', r; END IF;
  failed := false; BEGIN PERFORM public.record_order_payment_transaction(ord,99999,'mpesa','R2',NULL,NULL,'idem-p2','over'); EXCEPTION WHEN OTHERS THEN failed := true; END;
  IF NOT failed THEN RAISE EXCEPTION 'overpayment allowed'; END IF;
  r := public.record_order_payment_transaction(ord,1500,'bank_transfer','R3',NULL,NULL,'idem-p3','rest');
  IF r->>'payment_status' <> 'paid' THEN RAISE EXCEPTION 'order not marked paid: %', r; END IF;
  RESET ROLE;
END
$t$;
SELECT 'portal_business_flow_regression: OK' AS result;
ROLLBACK;
