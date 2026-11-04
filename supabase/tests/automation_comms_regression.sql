-- Pass 19: scheduler, worker controls and communication gaps. Run: psql -v ON_ERROR_STOP=1 -f supabase/tests/automation_comms_regression.sql
-- Rolls back; needs the full migration chain and the vault/net/cron stubs (or the real extensions).
BEGIN;
DO $t$
DECLARE
  owner_id uuid := gen_random_uuid(); jane uuid := gen_random_uuid(); jane_c uuid := gen_random_uuid(); stranger uuid := gen_random_uuid();
  cat uuid := gen_random_uuid(); prod uuid := gen_random_uuid(); r jsonb; ord uuid; n integer; denied boolean; inv uuid := gen_random_uuid(); inv2 uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users(id,email,email_confirmed_at) VALUES (owner_id,'o@t.invalid',now()),(jane,'jane@t.invalid',now()),(stranger,'x@t.invalid',now());
  PERFORM private.bootstrap_owner(owner_id,'Owner');
  INSERT INTO public.site_settings(setting_key,setting_value) VALUES ('contact','{"email":"staff@t.invalid"}'::jsonb) ON CONFLICT (setting_key) DO UPDATE SET setting_value=excluded.setting_value;
  INSERT INTO public.customers(id,name,email,phone) VALUES (jane_c,'Jane','jane@t.invalid','0700000001');
  DELETE FROM public.communication_outbox; DELETE FROM public.notification_events;

  -- 1. Dispatcher without secrets leaves one visible failed run (rate limited) and does not raise.
  r := private.dispatch_automation_job('deliver_communications','pg_cron');
  IF (r->>'ok')::boolean THEN RAISE EXCEPTION '1a dispatcher must fail without secrets: %', r; END IF;
  PERFORM private.dispatch_automation_job('deliver_communications','pg_cron');
  SELECT count(*) INTO n FROM public.automation_job_runs WHERE job_key='deliver_communications' AND status='failed';
  IF n <> 1 THEN RAISE EXCEPTION '1b failed runs must be rate limited, got %', n; END IF;

  -- 2. With secrets the dispatcher calls the scheduler function with the worker secret.
  PERFORM vault.create_secret('https://proj.supabase.co','topline_project_url');
  PERFORM vault.create_secret('s3cret-value','topline_worker_secret');
  r := private.dispatch_automation_job('reconcile_communications','pg_cron');
  IF NOT (r->>'ok')::boolean THEN RAISE EXCEPTION '2a dispatcher should succeed: %', r; END IF;
  IF NOT EXISTS (SELECT 1 FROM net.requests WHERE url='https://proj.supabase.co/functions/v1/operations-scheduler'
                  AND headers->>'x-topline-worker-secret'='s3cret-value' AND body->>'job'='reconcile_communications') THEN
    RAISE EXCEPTION '2b request was not sent';
  END IF;

  -- 3. Paused jobs are skipped by cron but Run now still works.
  UPDATE public.automation_job_settings SET enabled=false WHERE job_key='reconcile_communications';
  DELETE FROM net.requests;
  r := private.dispatch_automation_job('reconcile_communications','pg_cron');
  IF NOT coalesce((r->>'skipped')::boolean,false) OR EXISTS (SELECT 1 FROM net.requests) THEN RAISE EXCEPTION '3a paused job must be skipped: %', r; END IF;
  r := private.dispatch_automation_job('reconcile_communications','manual:test');
  IF NOT EXISTS (SELECT 1 FROM net.requests) THEN RAISE EXCEPTION '3b manual run must bypass pause'; END IF;
  UPDATE public.automation_job_settings SET enabled=true WHERE job_key='reconcile_communications';

  -- 4. Schedule registration follows the settings.
  IF private.ensure_automation_schedule() <> 5 OR (SELECT count(*) FROM cron.job WHERE jobname LIKE 'topline-%') <> 5 THEN RAISE EXCEPTION '4a five schedules expected'; END IF;
  UPDATE public.automation_job_settings SET enabled=false WHERE job_key='invoice_reminders';
  PERFORM private.ensure_automation_schedule();
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='topline-invoice_reminders') THEN RAISE EXCEPTION '4b paused job must be unscheduled'; END IF;
  UPDATE public.automation_job_settings SET enabled=true WHERE job_key='invoice_reminders'; PERFORM private.ensure_automation_schedule();

  -- 5. Admin RPCs: staff allowed, others denied.
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true); SET LOCAL ROLE authenticated;
  r := public.get_automation_operations_360(7);
  IF jsonb_array_length(r->'jobs') <> 5 OR NOT (r->'scheduler'->>'worker_secret_set')::boolean THEN RAISE EXCEPTION '5a automation snapshot wrong: %', r->'scheduler'; END IF;
  PERFORM public.set_automation_job_enabled('invoice_reminders', false);
  PERFORM public.set_automation_job_enabled('invoice_reminders', true);
  PERFORM public.run_automation_job_now('deliver_communications');
  PERFORM public.sync_automation_schedule();
  RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub',stranger::text,true); SET LOCAL ROLE authenticated; denied := false;
  BEGIN PERFORM public.run_automation_job_now('deliver_communications'); EXCEPTION WHEN OTHERS THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION '5b non-staff must not run jobs'; END IF;
  denied := false;
  BEGIN PERFORM public.set_automation_job_enabled('deliver_communications', false); EXCEPTION WHEN OTHERS THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION '5c non-staff must not pause jobs'; END IF;
  RESET ROLE;

  -- 6. Staff alerts and receipt: order, payment, quotation response, service case.
  INSERT INTO public.categories(id,name,slug) VALUES (cat,'C','c-'||cat);
  INSERT INTO public.products(id,name,slug,sku,price,stock_quantity,in_stock,is_active,category_id) VALUES (prod,'Tile','tile-'||prod,'T-'||left(prod::text,6),1000,50,true,true,cat);
  DELETE FROM public.communication_outbox;
  r := public.create_secure_customer_order('Zed','zed@t.invalid','0711111111',jsonb_build_array(jsonb_build_object('product_id',prod,'quantity',2)),'',NULL,NULL,'Nairobi','mpesa','idem-a1');
  ord := (r->>'order_id')::uuid;
  IF NOT EXISTS (SELECT 1 FROM public.communication_outbox WHERE recipient='staff@t.invalid' AND subject LIKE 'New order %' AND dedupe_key LIKE '%:admin') THEN RAISE EXCEPTION '6a staff order alert missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.communication_outbox WHERE recipient='zed@t.invalid' AND subject LIKE 'We received your order%') THEN RAISE EXCEPTION '6b customer order confirmation missing'; END IF;
  IF EXISTS (SELECT 1 FROM public.communication_outbox WHERE channel IN ('sms','whatsapp')) THEN RAISE EXCEPTION '6c sms/whatsapp must not queue while disabled'; END IF;
  DELETE FROM public.communication_outbox;
  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true); SET LOCAL ROLE authenticated;
  PERFORM public.record_order_payment_transaction(ord,1000,'mpesa','R1',NULL,NULL,'idem-p1','part');
  RESET ROLE;
  IF NOT EXISTS (SELECT 1 FROM public.communication_outbox WHERE recipient='zed@t.invalid' AND subject LIKE 'Payment received%' AND message LIKE '%Balance remaining: KES 1,000.00%') THEN RAISE EXCEPTION '6d payment receipt missing/wrong'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.communication_outbox WHERE recipient='staff@t.invalid' AND subject LIKE 'Payment received:%') THEN RAISE EXCEPTION '6e staff payment alert missing'; END IF;

  -- 6f. Manual payment details reach the buyer: public RPC, gateway on by default, order email carries the accounts.
  INSERT INTO public.business_payment_accounts(kind,label,till_number) VALUES ('mpesa_till','Till','5260389');
  INSERT INTO public.business_payment_accounts(kind,label,paybill_number,account_number) VALUES ('mpesa_paybill','Paybill','880100','208597');
  IF jsonb_array_length(public.get_public_payment_accounts()) <> 2 THEN RAISE EXCEPTION '6f public accounts RPC wrong'; END IF;
  IF NOT (SELECT is_enabled FROM public.payment_gateway_methods WHERE gateway_key='bank_transfer') THEN RAISE EXCEPTION '6g manual gateway must be enabled'; END IF;
  IF private.manual_payment_instructions_text('ORD-1') NOT LIKE '%Till (Buy Goods): 5260389%' OR private.manual_payment_instructions_text('ORD-1') NOT LIKE '%Paybill: 880100, Account number: 208597%' THEN RAISE EXCEPTION '6h instructions text wrong'; END IF;

  -- 7. Stale queued messages expire instead of being sent days late.
  INSERT INTO public.communication_outbox(channel,recipient,subject,message,dedupe_key,created_at) VALUES
    ('email','old@t.invalid','Old','x','stale-e',now()-interval '80 hours'),('sms','+254700000009',NULL,'x','stale-s',now()-interval '30 hours'),
    ('email','fresh@t.invalid','Fresh','x','fresh-e',now()-interval '2 hours');
  PERFORM set_config('request.jwt.claim.role','service_role',true);
  r := public.reconcile_communications_worker_360();
  IF (r->>'expired_messages')::int <> 2 OR (SELECT status FROM public.communication_outbox WHERE dedupe_key='fresh-e') <> 'queued' THEN RAISE EXCEPTION '7 expiry wrong: %', r; END IF;

  -- 8. Invoice reminders: due soon, overdue marking, staff digest, idempotent.
  INSERT INTO public.invoices(id,invoice_number,customer_id,customer_name,customer_email,status,subtotal,total_amount,amount_paid,due_date)
  VALUES (inv,'INV-T1',jane_c,'Jane','jane@t.invalid','sent',1000,1000,0,(now() AT TIME ZONE 'Africa/Nairobi')::date + 2),
         (inv2,'INV-T2',jane_c,'Jane','jane@t.invalid','sent',500,500,0,(now() AT TIME ZONE 'Africa/Nairobi')::date - 3);
  DELETE FROM public.communication_outbox WHERE subject LIKE '%INV-T%';
  r := public.queue_invoice_reminders_worker_360();
  IF (r->>'customer_reminders')::int < 1 OR (r->>'marked_overdue')::int < 1 OR (r->>'staff_digest')::int < 1 THEN RAISE EXCEPTION '8a reminders wrong: %', r; END IF;
  IF (SELECT status FROM public.invoices WHERE id=inv2) <> 'overdue' THEN RAISE EXCEPTION '8b overdue not marked'; END IF;
  n := (SELECT count(*) FROM public.communication_outbox WHERE dedupe_key LIKE 'invoice-reminder:%' OR dedupe_key LIKE 'staff-alert:invoice-digest:%');
  PERFORM public.queue_invoice_reminders_worker_360();
  IF n <> (SELECT count(*) FROM public.communication_outbox WHERE dedupe_key LIKE 'invoice-reminder:%' OR dedupe_key LIKE 'staff-alert:invoice-digest:%') THEN RAISE EXCEPTION '8c reminders must be idempotent'; END IF;
  PERFORM set_config('request.jwt.claim.role','authenticated',true); denied := false;
  BEGIN PERFORM public.queue_invoice_reminders_worker_360(); EXCEPTION WHEN OTHERS THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION '8d reminders worker must be service-role only'; END IF;
  RAISE NOTICE 'ok 1';
END $t$;
ROLLBACK;
SELECT 'automation_comms_regression: OK' AS result;
