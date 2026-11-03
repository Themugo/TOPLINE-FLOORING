-- Registration + email flow regression (plain psql, rolled back).
BEGIN;
DO $t$
DECLARE
  u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); u3 uuid := gen_random_uuid();
  em text := 'reg-'||gen_random_uuid()||'@t.invalid'; old_em text := 'old-'||gen_random_uuid()||'@t.invalid';
  n integer; r jsonb; oid uuid; ok boolean;
BEGIN
  -- registration: customer created unverified, portal access + marketing sync only after verification
  INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data)
    VALUES (u1,upper(em),NULL,'{"topline_customer_registration":true,"name":"New Person","phone":"0712345678","marketing_email_opt_in":true}');
  SELECT count(*) INTO n FROM public.customers WHERE lower(email)=em; IF n<>1 THEN RAISE EXCEPTION 'customer not created'; END IF;
  SELECT count(*) INTO n FROM public.customer_portal_access WHERE auth_user_id=u1; IF n<>0 THEN RAISE EXCEPTION 'access before verification'; END IF;
  SELECT count(*) INTO n FROM public.brevo_marketing_sync_queue WHERE email=em; IF n<>0 THEN RAISE EXCEPTION 'marketing sync before verification'; END IF;
  UPDATE auth.users SET email_confirmed_at=now() WHERE id=u1;
  SELECT count(*) INTO n FROM public.customer_portal_access WHERE auth_user_id=u1; IF n<>1 THEN RAISE EXCEPTION 'no access after verification'; END IF;
  SELECT count(*) INTO n FROM public.brevo_marketing_sync_queue WHERE email=em AND action='subscribe'; IF n<>1 THEN RAISE EXCEPTION 'opt-in not queued'; END IF;
  -- existing customer registering must not be duplicated
  INSERT INTO public.customers(name,email,phone) VALUES ('Old',old_em,'0700000003');
  INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES (u2,upper(old_em),now(),'{"topline_customer_registration":true,"name":"Old C","phone":"0700000003"}');
  SELECT count(*) INTO n FROM public.customers WHERE lower(email)=old_em; IF n<>1 THEN RAISE EXCEPTION 'duplicate customer'; END IF;
  -- missing phone -> no customer from the trigger
  INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES (u3,'nophone-'||u3||'@t.invalid',now(),'{"topline_customer_registration":true,"name":"No Phone"}');
  SELECT count(*) INTO n FROM public.customers WHERE email='nophone-'||u3||'@t.invalid'; IF n<>0 THEN RAISE EXCEPTION 'customer without phone created'; END IF;

  -- enquiry emails: customer ack always; staff alert only with an address (communications setting, then Site Settings contact)
  DELETE FROM public.communication_outbox; DELETE FROM public.site_settings WHERE setting_key='contact';
  SET LOCAL ROLE anon;
  r := public.submit_quotation_request('Buyer One','b1-'||u1||'@t.invalid','0712345678','Nairobi','Epoxy','Floor','Need a quote for floors please','1m','asap');
  RESET ROLE;
  IF NOT (r->>'success')::boolean THEN RAISE EXCEPTION 'quotation request: %', r; END IF;
  SELECT count(*) INTO n FROM public.communication_outbox; IF n<>1 THEN RAISE EXCEPTION 'expected only the customer acknowledgement, got %', n; END IF;
  DELETE FROM public.communication_outbox;
  INSERT INTO public.site_settings(setting_key,setting_value) VALUES ('contact','{"email":"sales@t.invalid, owner@t.invalid"}');
  SET LOCAL ROLE anon;
  r := public.submit_quotation_request('Buyer Two','b2-'||u1||'@t.invalid','0712345678','Nairobi','Epoxy','Floor','Another quote for floors please','1m','asap');
  RESET ROLE;
  SELECT count(*) INTO n FROM public.communication_outbox WHERE recipient IN ('sales@t.invalid','owner@t.invalid') AND reply_to = 'b2-'||u1||'@t.invalid';
  IF n<>2 THEN RAISE EXCEPTION 'staff alerts via Site Settings contact not queued (%)', n; END IF;

  -- provider events: delivered updates the outbox row; replay is harmless; hard bounce suppresses the address
  SELECT id INTO oid FROM public.communication_outbox WHERE recipient='b2-'||u1||'@t.invalid';
  PERFORM set_config('request.jwt.claim.role','service_role',true); SET LOCAL ROLE service_role;
  PERFORM public.complete_communication_delivery_worker(oid,'brevo','<m1@brevo>','<m1@brevo>');
  ok := public.record_provider_delivery_event_worker('brevo','email','delivered','<m1@brevo>','<m1@brevo>','x@t.invalid','{"event":"delivered"}'::jsonb);
  ok := public.record_provider_delivery_event_worker('brevo','email','delivered','<m1@brevo>','<m1@brevo>','x@t.invalid','{"event":"delivered"}'::jsonb);
  PERFORM public.record_provider_delivery_event_worker('brevo','email','hard_bounce','<m2@brevo>','<m2@brevo>','bounce-'||u1||'@t.invalid',jsonb_build_object('event','hard_bounce','email','bounce-'||u1||'@t.invalid'));
  RESET ROLE; PERFORM set_config('request.jwt.claim.role','',true);
  SELECT count(*) INTO n FROM public.communication_outbox WHERE id=oid AND delivery_status='delivered'; IF n<>1 THEN RAISE EXCEPTION 'delivered event not applied'; END IF;
  SELECT count(*) INTO n FROM public.communication_provider_events WHERE provider_message_id='<m1@brevo>'; IF n<>1 THEN RAISE EXCEPTION 'replayed event duplicated (%)', n; END IF;
  SELECT count(*) INTO n FROM public.communication_suppressions WHERE email='bounce-'||u1||'@t.invalid' AND reason='hard_bounce'; IF n<>1 THEN RAISE EXCEPTION 'bounce not suppressed'; END IF;
  DELETE FROM public.communication_outbox;
  SET LOCAL ROLE anon;
  PERFORM public.submit_quotation_request('Buyer Three','bounce-'||u1||'@t.invalid','0712345678','Nairobi','Epoxy','Floor','Quote after a bounce please','1m','asap');
  RESET ROLE;
  SELECT count(*) INTO n FROM public.communication_outbox WHERE recipient='bounce-'||u1||'@t.invalid'; IF n<>0 THEN RAISE EXCEPTION 'acknowledgement sent to a bounced address'; END IF;
END
$t$;
SELECT 'registration_email_flow_regression: OK' AS result;
ROLLBACK;
