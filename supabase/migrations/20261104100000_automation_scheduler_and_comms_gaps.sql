-- Pass 19: automation scheduler, worker controls and the missing communication areas.
--
-- 1. A scheduler that lives inside Supabase (pg_cron + pg_net + Vault). Nothing external is needed to run the workers.
-- 2. Admin controls: Run now, Pause/Resume, and an honest scheduler health report for all five jobs.
-- 3. Staff alerts for new orders, successful payments, quotation responses and service cases.
-- 4. A payment receipt for the customer.
-- 5. SMS/WhatsApp rows are only queued when that channel is switched on; queued messages expire instead of going out days late.
-- 6. An invoice reminder job (due soon, overdue, follow-ups, staff digest).

DO $$ BEGIN
  BEGIN CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'pg_cron not available: %', SQLERRM; END;
  BEGIN CREATE EXTENSION IF NOT EXISTS pg_net; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'pg_net not available: %', SQLERRM; END;
END $$;

-- ---------------------------------------------------------------- job settings
CREATE TABLE IF NOT EXISTS public.automation_job_settings (
  job_key text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  cron_expression text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.automation_job_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.automation_job_settings FROM PUBLIC, anon, authenticated;

INSERT INTO public.automation_job_settings(job_key,title,description,cron_expression) VALUES
 ('deliver_communications','Send queued messages','Sends queued emails, SMS and WhatsApp messages through the connected providers.','* * * * *'),
 ('reconcile_communications','Communication health check','Releases stuck locks and expires messages that waited too long to be sent.','*/5 * * * *'),
 ('expire_inventory_reservations','Release stock reservations','Frees stock held for unpaid orders after the reservation window.','*/5 * * * *'),
 ('reconcile_payment_provider_events','Payment event check','Re-processes payment provider callbacks that did not finish.','*/15 * * * *'),
 ('invoice_reminders','Invoice reminders','Reminds customers about invoices that are due or overdue and sends staff a daily overdue digest.','0 5 * * *')
ON CONFLICT (job_key) DO NOTHING;

-- Allow the new job in the worker boundary.
CREATE OR REPLACE FUNCTION public.start_automation_job(p_job_key text, p_lock_seconds integer DEFAULT 300, p_trigger_source text DEFAULT 'scheduler'::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'private'
AS $function$
DECLARE
  v_now timestamptz:=now(); v_lock public.automation_job_locks%ROWTYPE; v_run_id uuid;
  v_lock_seconds integer:=greatest(30,least(coalesce(p_lock_seconds,300),3600));
  v_job text:=lower(trim(coalesce(p_job_key,'')));
BEGIN
  IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Automation worker boundary is service-role only'; END IF;
  IF v_job NOT IN ('deliver_communications','expire_inventory_reservations','reconcile_payment_provider_events','reconcile_communications','invoice_reminders') THEN
    RAISE EXCEPTION 'Unsupported automation job';
  END IF;
  SELECT * INTO v_lock FROM public.automation_job_locks WHERE job_key=v_job FOR UPDATE;
  IF FOUND AND v_lock.locked_until>v_now THEN
    RETURN jsonb_build_object('acquired',false,'job_key',v_job,'run_id',v_lock.run_id,'locked_until',v_lock.locked_until);
  END IF;
  IF FOUND THEN
    UPDATE public.automation_job_runs SET status='timed_out',finished_at=v_now,error_message='Worker lock expired before completion' WHERE id=v_lock.run_id AND status='running';
  END IF;
  INSERT INTO public.automation_job_runs(job_key,status,trigger_source) VALUES(v_job,'running',left(coalesce(nullif(trim(p_trigger_source),''),'scheduler'),80)) RETURNING id INTO v_run_id;
  INSERT INTO public.automation_job_locks(job_key,run_id,locked_until,updated_at)
  VALUES(v_job,v_run_id,v_now+make_interval(secs=>v_lock_seconds),v_now)
  ON CONFLICT(job_key) DO UPDATE SET run_id=excluded.run_id,locked_until=excluded.locked_until,updated_at=excluded.updated_at;
  RETURN jsonb_build_object('acquired',true,'job_key',v_job,'run_id',v_run_id,'locked_until',v_now+make_interval(secs=>v_lock_seconds));
END; $function$;

-- ---------------------------------------------------------------- dispatcher (cron -> edge function)
CREATE OR REPLACE FUNCTION private.automation_secret(p_name text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v text;
BEGIN
  IF to_regclass('vault.decrypted_secrets') IS NULL THEN RETURN NULL; END IF;
  EXECUTE 'SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = $1 ORDER BY created_at DESC LIMIT 1' INTO v USING p_name;
  RETURN nullif(btrim(v), '');
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION private.automation_secret(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.dispatch_automation_job(p_job text, p_source text DEFAULT 'pg_cron')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_job text := lower(btrim(coalesce(p_job, '')));
  v_source text := left(coalesce(nullif(btrim(p_source), ''), 'pg_cron'), 80);
  v_setting public.automation_job_settings%ROWTYPE;
  v_url text; v_secret text; v_req bigint; v_reason text;
BEGIN
  SELECT * INTO v_setting FROM public.automation_job_settings WHERE job_key = v_job;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'Unknown job'); END IF;
  IF v_source = 'pg_cron' AND NOT v_setting.enabled THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'Job is paused');
  END IF;

  v_url := private.automation_secret('topline_project_url');
  v_secret := private.automation_secret('topline_worker_secret');
  IF v_url IS NULL OR v_secret IS NULL THEN
    v_reason := 'Scheduler secrets are not set (Vault: topline_project_url, topline_worker_secret)';
  ELSIF to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') IS NULL THEN
    v_reason := 'pg_net extension is not installed';
  END IF;

  IF v_reason IS NOT NULL THEN
    -- Leave a visible failed run, at most one per job every 15 minutes, so a misconfiguration is seen but cannot flood the log.
    IF NOT EXISTS (SELECT 1 FROM public.automation_job_runs r WHERE r.job_key = v_job AND r.status = 'failed'
                    AND r.trigger_source LIKE 'dispatcher%' AND r.started_at > now() - interval '15 minutes') THEN
      INSERT INTO public.automation_job_runs(job_key, status, trigger_source, finished_at, error_message)
      VALUES (v_job, 'failed', 'dispatcher:' || left(v_source, 60), now(), v_reason);
    END IF;
    RETURN jsonb_build_object('ok', false, 'reason', v_reason);
  END IF;

  EXECUTE 'SELECT net.http_post(url := $1, body := $2, params := ''{}''::jsonb, headers := $3, timeout_milliseconds := 30000)'
    INTO v_req
    USING rtrim(v_url, '/') || '/functions/v1/operations-scheduler',
          jsonb_build_object('job', v_job, 'source', v_source),
          jsonb_build_object('Content-Type', 'application/json', 'x-topline-worker-secret', v_secret);
  RETURN jsonb_build_object('ok', true, 'request_id', v_req);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.automation_job_runs(job_key, status, trigger_source, finished_at, error_message)
  VALUES (v_job, 'failed', 'dispatcher:' || left(v_source, 60), now(), left(SQLERRM, 500));
  RETURN jsonb_build_object('ok', false, 'reason', left(SQLERRM, 300));
END $$;
REVOKE ALL ON FUNCTION private.dispatch_automation_job(text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.ensure_automation_schedule() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE s record; v_n integer := 0;
BEGIN
  IF to_regnamespace('cron') IS NULL THEN RETURN 0; END IF;
  FOR s IN SELECT * FROM public.automation_job_settings LOOP
    IF s.enabled THEN
      EXECUTE 'SELECT cron.schedule($1, $2, $3)' USING 'topline-' || s.job_key, s.cron_expression,
        format('SELECT private.dispatch_automation_job(%L, %L)', s.job_key, 'pg_cron');
      v_n := v_n + 1;
    ELSE
      EXECUTE 'SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = $1' USING 'topline-' || s.job_key;
    END IF;
  END LOOP;
  RETURN v_n;
END $$;
REVOKE ALL ON FUNCTION private.ensure_automation_schedule() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------- admin RPCs
CREATE OR REPLACE FUNCTION public.get_automation_operations_360(p_days integer DEFAULT 7)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_days integer := greatest(1, least(coalesce(p_days, 7), 90));
  v_cron boolean := to_regnamespace('cron') IS NOT NULL;
  v_net boolean := to_regnamespace('net') IS NOT NULL;
  v_url boolean := private.automation_secret('topline_project_url') IS NOT NULL;
  v_sec boolean := private.automation_secret('topline_worker_secret') IS NOT NULL;
  v_sched integer := 0;
  v_email boolean;
BEGIN
  PERFORM private.require_staff_permission('dashboard', 'select');
  IF v_cron THEN
    BEGIN EXECUTE $q$SELECT count(*) FROM cron.job WHERE jobname LIKE 'topline-%' AND active$q$ INTO v_sched;
    EXCEPTION WHEN OTHERS THEN v_sched := 0; END;
  END IF;
  SELECT coalesce(bool_or(is_enabled), false) INTO v_email FROM public.site_integration_configs WHERE integration_key = 'communications.email';
  RETURN jsonb_build_object(
    'days', v_days,
    'generated_at', now(),
    'scheduler', jsonb_build_object(
      'cron_installed', v_cron, 'net_installed', v_net,
      'project_url_set', v_url, 'worker_secret_set', v_sec,
      'schedules_registered', v_sched,
      'expected_schedules', (SELECT count(*) FROM public.automation_job_settings WHERE enabled),
      'email_integration_enabled', v_email,
      'queued_messages', (SELECT count(*) FROM public.communication_outbox WHERE status = 'queued'),
      'oldest_queued_at', (SELECT min(created_at) FROM public.communication_outbox WHERE status = 'queued'),
      'failed_messages_7d', (SELECT count(*) FROM public.communication_outbox WHERE status = 'failed' AND created_at > now() - interval '7 days')
    ),
    'jobs', coalesce((SELECT jsonb_agg(x ORDER BY x.sort_key) FROM (
      SELECT s.job_key, s.title, s.description, s.enabled, s.cron_expression,
             array_position(ARRAY['deliver_communications','reconcile_communications','expire_inventory_reservations','reconcile_payment_provider_events','invoice_reminders'], s.job_key) AS sort_key,
             l.locked_until, l.run_id AS active_run_id,
             (SELECT r.status FROM public.automation_job_runs r WHERE r.id = l.run_id) AS active_status,
             (SELECT r.started_at FROM public.automation_job_runs r WHERE r.id = l.run_id) AS active_started_at,
             (SELECT r.finished_at FROM public.automation_job_runs r WHERE r.id = l.run_id) AS active_finished_at,
             (SELECT r.status FROM public.automation_job_runs r WHERE r.job_key = s.job_key ORDER BY r.started_at DESC LIMIT 1) AS last_status,
             (SELECT r.started_at FROM public.automation_job_runs r WHERE r.job_key = s.job_key ORDER BY r.started_at DESC LIMIT 1) AS last_started_at,
             (SELECT r.finished_at FROM public.automation_job_runs r WHERE r.job_key = s.job_key ORDER BY r.started_at DESC LIMIT 1) AS last_finished_at,
             (SELECT r.error_message FROM public.automation_job_runs r WHERE r.job_key = s.job_key ORDER BY r.started_at DESC LIMIT 1) AS last_error,
             (SELECT r.started_at FROM public.automation_job_runs r WHERE r.job_key = s.job_key AND r.status = 'succeeded' ORDER BY r.started_at DESC LIMIT 1) AS last_success_at
        FROM public.automation_job_settings s
        LEFT JOIN public.automation_job_locks l ON l.job_key = s.job_key
    ) x), '[]'::jsonb),
    'recent_runs', coalesce((SELECT jsonb_agg(r ORDER BY r.started_at DESC) FROM (
      SELECT id, job_key, status, trigger_source, started_at, finished_at, result, error_message
        FROM public.automation_job_runs
       WHERE started_at >= now() - make_interval(days => v_days)
       ORDER BY started_at DESC LIMIT 100
    ) r), '[]'::jsonb)
  );
END $$;

CREATE OR REPLACE FUNCTION public.set_automation_job_enabled(p_job text, p_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_job text := lower(btrim(coalesce(p_job, '')));
BEGIN
  PERFORM private.require_staff_permission('settings', 'update');
  UPDATE public.automation_job_settings SET enabled = coalesce(p_enabled, true), updated_at = now(), updated_by = auth.uid() WHERE job_key = v_job;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown automation job'; END IF;
  PERFORM private.ensure_automation_schedule();
  RETURN jsonb_build_object('job_key', v_job, 'enabled', coalesce(p_enabled, true));
END $$;

CREATE OR REPLACE FUNCTION public.run_automation_job_now(p_job text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_job text := lower(btrim(coalesce(p_job, '')));
BEGIN
  PERFORM private.require_staff_permission('settings', 'update');
  IF NOT EXISTS (SELECT 1 FROM public.automation_job_settings WHERE job_key = v_job) THEN RAISE EXCEPTION 'Unknown automation job'; END IF;
  RETURN private.dispatch_automation_job(v_job, 'manual:' || coalesce(auth.uid()::text, 'staff'));
END $$;

CREATE OR REPLACE FUNCTION public.sync_automation_schedule()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM private.require_staff_permission('settings', 'update');
  RETURN jsonb_build_object('registered', private.ensure_automation_schedule(), 'cron_installed', to_regnamespace('cron') IS NOT NULL);
END $$;

REVOKE ALL ON FUNCTION public.get_automation_operations_360(integer), public.set_automation_job_enabled(text, boolean),
  public.run_automation_job_now(text), public.sync_automation_schedule() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_automation_operations_360(integer), public.set_automation_job_enabled(text, boolean),
  public.run_automation_job_now(text), public.sync_automation_schedule() TO authenticated;

SELECT private.ensure_automation_schedule();

-- ---------------------------------------------------------------- staff alert + customer email helpers
CREATE OR REPLACE FUNCTION private.staff_alert_recipients() RETURNS text[]
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_raw text; v_list text[];
BEGIN
  SELECT ic.public_config->>'quotation_admin_email' INTO v_raw FROM public.site_integration_configs ic WHERE ic.integration_key = 'communications.email';
  v_list := private.parse_notification_recipients(v_raw);
  IF coalesce(array_length(v_list, 1), 0) = 0 THEN
    SELECT cc.content->>'email' INTO v_raw FROM public.cms_content cc WHERE cc.page = 'contact' AND cc.section = 'info' LIMIT 1;
    v_list := private.parse_notification_recipients(v_raw);
  END IF;
  IF coalesce(array_length(v_list, 1), 0) = 0 THEN
    SELECT cc.content->>'email' INTO v_raw FROM public.cms_content cc WHERE cc.page = 'footer' AND cc.section = 'contact' LIMIT 1;
    v_list := private.parse_notification_recipients(v_raw);
  END IF;
  IF coalesce(array_length(v_list, 1), 0) = 0 THEN
    SELECT ss.setting_value->>'email' INTO v_raw FROM public.site_settings ss WHERE ss.setting_key = 'contact' LIMIT 1;
    v_list := private.parse_notification_recipients(v_raw);
  END IF;
  RETURN coalesce(v_list, ARRAY[]::text[]);
END $$;
REVOKE ALL ON FUNCTION private.staff_alert_recipients() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.queue_staff_alert(
  p_event text, p_entity_type text, p_entity_id uuid, p_dedupe text,
  p_title text, p_body text, p_reply_to text DEFAULT NULL, p_severity text DEFAULT 'info')
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_admins text[] := private.staff_alert_recipients(); v_admin text; v_i integer := 0; v_n integer := 0; v_reply text;
BEGIN
  v_reply := CASE WHEN p_reply_to ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' AND length(p_reply_to) <= 320 THEN p_reply_to ELSE NULL END;
  FOREACH v_admin IN ARRAY v_admins LOOP
    v_i := v_i + 1;
    IF (SELECT count(*) FROM public.communication_outbox o WHERE o.recipient = v_admin AND o.dedupe_key LIKE 'staff-alert:%'
         AND o.created_at > now() - interval '1 hour') < 30 THEN
      INSERT INTO public.communication_outbox(customer_id, channel, recipient, subject, message, dedupe_key, reply_to)
      VALUES (NULL, 'email', v_admin, left(p_title, 150), p_body, 'staff-alert:' || p_dedupe || ':' || v_i::text || ':admin', v_reply)
      ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
      IF FOUND THEN v_n := v_n + 1; END IF;
    END IF;
  END LOOP;
  INSERT INTO public.notification_events(event_type, entity_type, entity_id, title, message, severity, audience, metadata)
  VALUES (p_event, p_entity_type, p_entity_id, left(p_title, 150), p_body, p_severity, 'staff',
          jsonb_build_object('admin_email_queued', v_n > 0, 'admin_recipients', coalesce(array_length(v_admins, 1), 0)));
  RETURN v_n;
END $$;
REVOKE ALL ON FUNCTION private.queue_staff_alert(text, text, uuid, text, text, text, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.queue_customer_email(
  p_customer_id uuid, p_email text, p_key text, p_subject text, p_message text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_email text := lower(btrim(coalesce(p_email, ''))); v_pref boolean := true;
BEGIN
  IF v_email = '' OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.communication_suppressions s WHERE s.email = v_email AND s.reason IN ('hard_bounce','invalid_email','spam_complaint')) THEN RETURN false; END IF;
  IF p_customer_id IS NOT NULL THEN
    SELECT email_enabled INTO v_pref FROM public.customer_notification_preferences WHERE customer_id = p_customer_id;
    IF v_pref IS NOT NULL AND NOT v_pref THEN RETURN false; END IF;
  END IF;
  INSERT INTO public.communication_outbox(customer_id, channel, recipient, subject, message, dedupe_key)
  VALUES (p_customer_id, 'email', v_email, left(p_subject, 150), p_message, p_key)
  ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION private.queue_customer_email(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------- triggers
CREATE OR REPLACE FUNCTION private.trg_alert_new_order() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_ref text := coalesce(NEW.order_number, upper(substr(replace(NEW.id::text, '-', ''), 1, 8)));
BEGIN
  PERFORM private.queue_staff_alert('order.received', 'order', NEW.id, 'order:' || NEW.id::text,
    'New order ' || v_ref || ' - KES ' || to_char(coalesce(NEW.total_amount, 0), 'FM999,999,990.00'),
    format(E'A new order was placed.\n\nOrder: %s\nCustomer: %s\nEmail: %s\nPhone: %s\nTotal: KES %s\nPayment method: %s\nDelivery: %s\n\nReview it in the admin dashboard: %s/admin/orders',
      v_ref, private.sanitize_inline_text(NEW.customer_name, 200), private.sanitize_inline_text(NEW.customer_email, 320),
      private.sanitize_inline_text(NEW.customer_phone, 30), to_char(coalesce(NEW.total_amount, 0), 'FM999,999,990.00'),
      coalesce(nullif(private.sanitize_inline_text(NEW.payment_method, 40), ''), 'Not chosen'),
      coalesce(nullif(private.sanitize_inline_text(NEW.delivery_address, 200), ''), 'Not provided'), private.topline_site_url()),
    NEW.customer_email, 'info');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW; -- an alert problem must never block an order
END $$;
REVOKE ALL ON FUNCTION private.trg_alert_new_order() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_alert_new_order ON public.orders;
CREATE TRIGGER trg_alert_new_order AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION private.trg_alert_new_order();

CREATE OR REPLACE FUNCTION private.trg_payment_success_comms() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE
  o public.orders%ROWTYPE; v_ref text; v_paid numeric; v_balance numeric; v_amount text;
BEGIN
  IF NEW.status <> 'successful' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'successful' THEN RETURN NEW; END IF;
  SELECT * INTO o FROM public.orders WHERE id = NEW.order_id;
  v_ref := coalesce(o.order_number, upper(substr(replace(coalesce(NEW.order_id, NEW.id)::text, '-', ''), 1, 8)));
  v_amount := to_char(NEW.amount, 'FM999,999,990.00');
  SELECT coalesce(sum(amount), 0) INTO v_paid FROM public.payment_transactions WHERE order_id = NEW.order_id AND status = 'successful';
  v_balance := greatest(coalesce(o.total_amount, 0) - v_paid, 0);

  IF o.id IS NOT NULL THEN
    PERFORM private.queue_customer_email(o.customer_id, o.customer_email, 'payment-receipt:' || NEW.id::text,
      'Payment received - ' || v_ref,
      format(E'Hello %s,\n\nThank you. We have received your payment.\n\nOrder: %s\nAmount: KES %s\nMethod: %s\nReference: %s\nBalance remaining: KES %s\n\nYou can follow your order at %s/track-order\n\nTOPLINE Flooring & Waterproofing',
        coalesce(nullif(private.sanitize_inline_text(o.customer_name, 60), ''), 'there'), v_ref, v_amount,
        coalesce(NEW.method, 'payment'), coalesce(nullif(NEW.provider_reference, ''), nullif(NEW.provider_transaction_id, ''), 'n/a'),
        to_char(v_balance, 'FM999,999,990.00'), private.topline_site_url()));
  END IF;
  PERFORM private.queue_staff_alert('payment.received', 'payment', NEW.id, 'payment:' || NEW.id::text,
    'Payment received: KES ' || v_amount || ' for ' || v_ref,
    format(E'A payment was recorded.\n\nOrder: %s\nCustomer: %s\nAmount: KES %s\nMethod: %s\nReference: %s\nBalance remaining: KES %s\n\nReview it in the admin dashboard: %s/admin/orders',
      v_ref, coalesce(private.sanitize_inline_text(o.customer_name, 200), 'Unknown'), v_amount, coalesce(NEW.method, 'n/a'),
      coalesce(nullif(NEW.provider_reference, ''), nullif(NEW.provider_transaction_id, ''), 'n/a'),
      to_char(v_balance, 'FM999,999,990.00'), private.topline_site_url()),
    o.customer_email, 'success');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW; -- never block a payment record
END $$;
REVOKE ALL ON FUNCTION private.trg_payment_success_comms() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_payment_success_comms ON public.payment_transactions;
CREATE TRIGGER trg_payment_success_comms AFTER INSERT OR UPDATE OF status ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION private.trg_payment_success_comms();

CREATE OR REPLACE FUNCTION private.trg_alert_quotation_response() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_ref text := 'RFQ-' || upper(substr(replace(NEW.id::text, '-', ''), 1, 8)); v_note text;
BEGIN
  IF NEW.responded_at IS NULL OR NEW.responded_at IS NOT DISTINCT FROM OLD.responded_at THEN RETURN NEW; END IF;
  IF lower(coalesce(NEW.status, '')) NOT IN ('accepted', 'rejected', 'negotiating') THEN RETURN NEW; END IF;
  v_note := substring(coalesce(NEW.message, '') FROM '(?s)\[Customer response[^\]]*\]\s*(.*)$');
  PERFORM private.queue_staff_alert('quotation.responded', 'quotation', NEW.id,
    'quotation-response:' || NEW.id::text || ':' || to_char(NEW.responded_at, 'YYYYMMDDHH24MISS'),
    'Customer ' || lower(NEW.status) || ' quotation ' || coalesce(NEW.quotation_number, v_ref),
    format(E'A customer responded to a quotation.\n\nQuotation: %s\nCustomer: %s\nEmail: %s\nPhone: %s\nNew status: %s\nTotal: KES %s\n%s\nReview it in the admin dashboard: %s/admin/quotations',
      coalesce(NEW.quotation_number, v_ref), private.sanitize_inline_text(NEW.name, 200), private.sanitize_inline_text(NEW.email, 320),
      private.sanitize_inline_text(NEW.phone, 30), NEW.status, to_char(coalesce(NEW.total_amount, 0), 'FM999,999,990.00'),
      CASE WHEN nullif(btrim(v_note), '') IS NOT NULL THEN E'\nCustomer note:\n' || private.sanitize_block_text(v_note, 1500) || E'\n' ELSE '' END,
      private.topline_site_url()),
    NEW.email, CASE WHEN lower(NEW.status) = 'accepted' THEN 'success' ELSE 'warning' END);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.trg_alert_quotation_response() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_alert_quotation_response ON public.quotations;
CREATE TRIGGER trg_alert_quotation_response AFTER UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION private.trg_alert_quotation_response();

CREATE OR REPLACE FUNCTION private.trg_alert_new_service_case() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE c public.customers%ROWTYPE;
BEGIN
  SELECT * INTO c FROM public.customers WHERE id = NEW.customer_id;
  PERFORM private.queue_staff_alert('service_case.received', 'service_case', NEW.id, 'service-case:' || NEW.id::text,
    'New service request ' || coalesce(NEW.case_number, '') || ': ' || left(coalesce(private.sanitize_inline_text(NEW.issue_title, 100), 'Service request'), 80),
    format(E'A new service request was logged.\n\nCase: %s\nCustomer: %s\nEmail: %s\nPhone: %s\nType: %s\nPriority: %s\nIssue: %s\n\n%s\n\nReview it in the admin dashboard: %s/admin/service-cases',
      coalesce(NEW.case_number, 'n/a'), coalesce(private.sanitize_inline_text(c.name, 200), 'Unknown'), coalesce(private.sanitize_inline_text(c.email, 320), 'n/a'),
      coalesce(private.sanitize_inline_text(c.phone, 30), 'n/a'), coalesce(NEW.type, 'n/a'), coalesce(NEW.priority, 'normal'),
      coalesce(private.sanitize_inline_text(NEW.issue_title, 200), 'n/a'), coalesce(private.sanitize_block_text(NEW.description, 2000), ''), private.topline_site_url()),
    c.email, CASE WHEN lower(coalesce(NEW.priority, '')) IN ('urgent', 'high', 'critical') THEN 'warning' ELSE 'info' END);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.trg_alert_new_service_case() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_alert_new_service_case ON public.service_cases;
CREATE TRIGGER trg_alert_new_service_case AFTER INSERT ON public.service_cases FOR EACH ROW EXECUTE FUNCTION private.trg_alert_new_service_case();

-- ---------------------------------------------------------------- stale expiry in the health worker
CREATE OR REPLACE FUNCTION public.reconcile_communications_worker_360()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'private'
AS $function$
DECLARE
  v_unlocked integer := 0; v_exhausted integer := 0; v_unmatched integer := 0; v_stale integer := 0; v_expired integer := 0;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Automation worker boundary is service-role only'; END IF;
  UPDATE public.communication_outbox SET locked_at=NULL
   WHERE status='queued' AND locked_at IS NOT NULL AND locked_at < now()-interval '10 minutes';
  GET DIAGNOSTICS v_unlocked=ROW_COUNT;
  -- A status update that arrives days late is worse than none: expire what could not be delivered in time.
  UPDATE public.communication_outbox
     SET status='cancelled', delivery_status='expired', locked_at=NULL, error_message='Expired before delivery'
   WHERE status='queued'
     AND ((channel='email' AND created_at < now()-interval '72 hours')
       OR (channel IN ('sms','whatsapp') AND created_at < now()-interval '24 hours'));
  GET DIAGNOSTICS v_expired=ROW_COUNT;
  SELECT count(*) INTO v_exhausted FROM public.communication_outbox WHERE status='failed' AND attempt_count>=max_attempts;
  SELECT count(*) INTO v_unmatched FROM public.communication_inbound WHERE customer_id IS NULL AND received_at >= now()-interval '30 days';
  SELECT count(*) INTO v_stale FROM public.communication_outbox WHERE status='queued' AND created_at < now()-interval '30 minutes';
  RETURN jsonb_build_object('stale_locks_released',v_unlocked,'expired_messages',v_expired,'exhausted_failures',v_exhausted,
    'unmatched_inbound_30d',v_unmatched,'stale_queued',v_stale,'checked_at',now());
END;
$function$;

-- ---------------------------------------------------------------- invoice reminders
CREATE OR REPLACE FUNCTION public.queue_invoice_reminders_worker_360()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE
  i record; v_today date := (now() AT TIME ZONE 'Africa/Nairobi')::date; v_days integer; v_balance numeric;
  v_due_soon integer := 0; v_overdue_marked integer := 0; v_follow integer := 0; v_digest integer := 0; v_kind text; v_rows text := ''; v_cnt integer := 0; v_total numeric := 0;
  v_site text := private.topline_site_url();
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Automation worker boundary is service-role only'; END IF;

  -- Mark invoices past their due date as overdue (this also sends the normal invoice status email once).
  WITH m AS (UPDATE public.invoices SET status = 'overdue', updated_at = now()
              WHERE status IN ('sent', 'partial') AND due_date IS NOT NULL AND due_date < v_today
                AND coalesce(total_amount, 0) - coalesce(amount_paid, 0) > 0
              RETURNING 1)
  SELECT count(*) INTO v_overdue_marked FROM m;

  FOR i IN SELECT * FROM public.invoices
            WHERE status IN ('sent', 'partial', 'overdue') AND due_date IS NOT NULL
              AND coalesce(total_amount, 0) - coalesce(amount_paid, 0) > 0
              AND due_date <= v_today + 3 AND due_date >= v_today - 30
  LOOP
    v_days := i.due_date - v_today;
    v_balance := coalesce(i.total_amount, 0) - coalesce(i.amount_paid, 0);
    v_kind := CASE WHEN v_days BETWEEN 0 AND 3 THEN 'due-soon' WHEN v_days = -7 THEN 'overdue-7' WHEN v_days = -14 THEN 'overdue-14' ELSE NULL END;
    CONTINUE WHEN v_kind IS NULL;
    IF private.queue_customer_email(i.customer_id, i.customer_email, 'invoice-reminder:' || i.id::text || ':' || v_kind,
        CASE WHEN v_kind = 'due-soon' THEN 'Invoice ' || i.invoice_number || ' is due ' || CASE WHEN v_days = 0 THEN 'today' ELSE 'on ' || to_char(i.due_date, 'DD Mon YYYY') END
             ELSE 'Reminder: invoice ' || i.invoice_number || ' is overdue' END,
        format(E'Hello %s,\n\n%s\n\nInvoice: %s\nBalance due: KES %s\nDue date: %s\n\nPlease sign in to your account to view the invoice and payment details: %s/portal\nIf you have already paid, thank you, and please ignore this message.\n\nTOPLINE Flooring & Waterproofing',
          coalesce(nullif(private.sanitize_inline_text(i.customer_name, 60), ''), 'there'),
          CASE WHEN v_kind = 'due-soon' THEN 'This is a friendly reminder that your invoice is due soon.' ELSE 'Our records show this invoice is now past its due date.' END,
          i.invoice_number, to_char(v_balance, 'FM999,999,990.00'), to_char(i.due_date, 'DD Mon YYYY'), v_site)) THEN
      v_follow := v_follow + 1;
      IF v_kind = 'due-soon' THEN v_due_soon := v_due_soon + 1; END IF;
    END IF;
  END LOOP;

  FOR i IN SELECT * FROM public.invoices WHERE status = 'overdue' AND coalesce(total_amount, 0) - coalesce(amount_paid, 0) > 0 ORDER BY due_date LIMIT 25 LOOP
    v_cnt := v_cnt + 1; v_total := v_total + (coalesce(i.total_amount, 0) - coalesce(i.amount_paid, 0));
    v_rows := v_rows || format(E'%s  %s  due %s  KES %s\n', i.invoice_number, private.sanitize_inline_text(i.customer_name, 40), to_char(i.due_date, 'DD Mon'),
      to_char(coalesce(i.total_amount, 0) - coalesce(i.amount_paid, 0), 'FM999,999,990.00'));
  END LOOP;
  IF v_cnt > 0 THEN
    v_digest := private.queue_staff_alert('invoice.overdue_digest', 'invoice', NULL, 'invoice-digest:' || v_today::text,
      v_cnt::text || ' overdue invoice' || CASE WHEN v_cnt = 1 THEN '' ELSE 's' END || ' - KES ' || to_char(v_total, 'FM999,999,990.00'),
      E'Invoices past their due date:\n\n' || v_rows || E'\nReview them in the admin dashboard: ' || v_site || '/admin/invoices', NULL, 'warning');
  END IF;
  RETURN jsonb_build_object('marked_overdue', v_overdue_marked, 'customer_reminders', v_follow, 'due_soon', v_due_soon, 'staff_digest', v_digest, 'overdue_open', v_cnt);
END $$;
REVOKE ALL ON FUNCTION public.queue_invoice_reminders_worker_360() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_invoice_reminders_worker_360() TO service_role;


-- ---------------------------------------------------------------- manual payment details for receipts and emails
CREATE OR REPLACE FUNCTION private.manual_payment_instructions_text(p_reference text DEFAULT '')
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE a record; v_out text := ''; v_line text;
BEGIN
  FOR a IN SELECT * FROM public.business_payment_accounts WHERE is_active AND show_to_customers ORDER BY display_order, created_at LOOP
    v_line := CASE a.kind
      WHEN 'mpesa_till' THEN 'M-Pesa Till (Buy Goods): ' || coalesce(a.till_number, '')
      WHEN 'mpesa_paybill' THEN 'M-Pesa Paybill: ' || coalesce(a.paybill_number, '') || CASE WHEN a.account_number IS NOT NULL THEN ', Account number: ' || a.account_number ELSE '' END
      WHEN 'mpesa_send_money' THEN 'M-Pesa Send Money: ' || coalesce(a.phone_number, '')
      WHEN 'bank' THEN 'Bank: ' || coalesce(a.bank_name, '') || ', Account name: ' || coalesce(a.account_name, '') || ', Account number: ' || coalesce(a.account_number, '')
                       || CASE WHEN a.branch IS NOT NULL THEN ', Branch: ' || a.branch ELSE '' END
      ELSE a.label || coalesce(': ' || a.instructions, '')
    END;
    v_out := v_out || '- ' || left(v_line, 300) || E'\n';
  END LOOP;
  IF v_out = '' THEN RETURN ''; END IF;
  RETURN E'How to pay (manual payment):\n' || v_out
    || CASE WHEN nullif(p_reference, '') IS NOT NULL THEN 'Please use ' || p_reference || E' as the payment reference.\n' ELSE '' END
    || E'We confirm payments manually and will email you a receipt.';
END $$;
REVOKE ALL ON FUNCTION private.manual_payment_instructions_text(text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------- customer status messages
CREATE OR REPLACE FUNCTION public.queue_customer_notification_for_event(p_event_type text, p_entity_id uuid, p_customer_id uuid, p_status text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
DECLARE
  r public.notification_rules%ROWTYPE;
  pref public.customer_notification_preferences%ROWTYPE;
  c public.customers%ROWTYPE;
  v_message text; v_subject text; v_count integer:=0; v_key text; v_status text;
  v_channels integer:=0;
  v_sms_on boolean:=false; v_wa_on boolean:=false; o public.orders%ROWTYPE;
BEGIN
  IF p_customer_id IS NULL THEN RETURN 0; END IF;
  -- Customers are told about states that mean something to them, not internal pipeline steps. A new quotation is
  -- already acknowledged by the quotation-intake email, a draft invoice is not ready to share, and states such as
  -- "contacted", "won" or "lost" are sales jargon ("Your Topline quotation is lost").
  IF p_event_type = 'quotation.status' AND lower(coalesce(p_status, '')) NOT IN ('quoted', 'sent', 'accepted', 'rejected') THEN RETURN 0; END IF;
  IF p_event_type = 'project.status' AND lower(coalesce(p_status, '')) = 'pending' THEN RETURN 0; END IF;
  IF p_event_type = 'invoice.status' AND lower(coalesce(p_status, '')) NOT IN ('sent', 'paid', 'partial', 'overdue', 'cancelled') THEN RETURN 0; END IF;
  v_key:=p_event_type||':'||coalesce(p_entity_id::text,p_customer_id::text)||':'||coalesce(p_status,'updated');
  IF EXISTS (SELECT 1 FROM public.communication_workflow_events WHERE event_key=v_key) THEN
    RETURN COALESCE((SELECT queued_count FROM public.communication_workflow_events WHERE event_key=v_key),0);
  END IF;
  SELECT * INTO r FROM public.notification_rules WHERE event_type=p_event_type AND enabled;
  SELECT * INTO c FROM public.customers WHERE id=p_customer_id;
  IF NOT FOUND OR r.event_type IS NULL THEN
    INSERT INTO public.communication_workflow_events(event_key,event_type,entity_id,customer_id,status,metadata)
    VALUES(v_key,p_event_type,p_entity_id,p_customer_id,'suppressed',jsonb_build_object('reason',CASE WHEN r.event_type IS NULL THEN 'no_enabled_rule' ELSE 'customer_not_found' END));
    RETURN 0;
  END IF;
  -- Only queue SMS/WhatsApp rows when that channel is actually switched on; otherwise they pile up and go out days later.
  SELECT coalesce(bool_or(is_enabled),false) INTO v_sms_on FROM public.site_integration_configs WHERE integration_key='communications.sms';
  SELECT coalesce(bool_or(is_enabled),false) INTO v_wa_on FROM public.site_integration_configs WHERE integration_key='communications.whatsapp';
  INSERT INTO public.customer_notification_preferences(customer_id) VALUES(p_customer_id) ON CONFLICT DO NOTHING;
  SELECT * INTO pref FROM public.customer_notification_preferences WHERE customer_id=p_customer_id;
  v_subject:=replace(r.subject_template,'{{status}}',coalesce(p_status,'updated'));
  v_message:=replace(replace(r.message_template,'{{status}}',coalesce(p_status,'updated')),'{{customer_name}}',coalesce(nullif(private.sanitize_inline_text(c.name,60),''),'Customer'));

  IF p_event_type='order.status' AND lower(coalesce(p_status,''))='pending' THEN
    SELECT * INTO o FROM public.orders WHERE id=p_entity_id;
    IF FOUND THEN
      v_subject:='We received your order '||coalesce(o.order_number,'');
      v_message:=format(E'Hello %s, thank you for your order. We have received it.\n\nOrder: %s\nTotal: KES %s\nPayment method: %s\n\nTrack your order here: %s/track-order',
        coalesce(nullif(private.sanitize_inline_text(c.name,60),''),'Customer'), coalesce(o.order_number,'n/a'),
        to_char(coalesce(o.total_amount,0),'FM999,999,990.00'), coalesce(nullif(private.sanitize_inline_text(o.payment_method,40),''),'not chosen yet'), private.topline_site_url());
      IF o.payment_method='bank_transfer' THEN
        v_message:=v_message||E'\n\n'||private.manual_payment_instructions_text(coalesce(o.order_number,''));
      END IF;
    END IF;
  END IF;

  IF r.email_enabled AND pref.email_enabled AND nullif(trim(c.email),'') IS NOT NULL THEN
    INSERT INTO public.communication_outbox(customer_id,channel,recipient,subject,message,dedupe_key)
    VALUES(p_customer_id,'email',trim(c.email),v_subject,v_message,v_key||':email') ON CONFLICT DO NOTHING;
    IF FOUND THEN v_count:=v_count+1; END IF;
  END IF;
  IF v_sms_on AND r.sms_enabled AND pref.sms_enabled AND nullif(public.normalize_customer_phone(c.phone),'') IS NOT NULL THEN
    INSERT INTO public.communication_outbox(customer_id,channel,recipient,message,dedupe_key)
    VALUES(p_customer_id,'sms',public.normalize_customer_phone(c.phone),v_message,v_key||':sms') ON CONFLICT DO NOTHING;
    IF FOUND THEN v_count:=v_count+1; END IF;
  END IF;
  IF v_wa_on AND r.whatsapp_enabled AND pref.whatsapp_enabled AND nullif(public.normalize_customer_phone(c.phone),'') IS NOT NULL THEN
    INSERT INTO public.communication_outbox(customer_id,channel,recipient,subject,message,dedupe_key)
    VALUES(p_customer_id,'whatsapp',public.normalize_customer_phone(c.phone),v_subject,v_message,v_key||':whatsapp') ON CONFLICT DO NOTHING;
    IF FOUND THEN v_count:=v_count+1; END IF;
  END IF;
  v_channels := (CASE WHEN r.email_enabled AND pref.email_enabled AND nullif(trim(c.email),'') IS NOT NULL THEN 1 ELSE 0 END)
              + (CASE WHEN v_sms_on AND r.sms_enabled AND pref.sms_enabled AND nullif(public.normalize_customer_phone(c.phone),'') IS NOT NULL THEN 1 ELSE 0 END)
              + (CASE WHEN v_wa_on AND r.whatsapp_enabled AND pref.whatsapp_enabled AND nullif(public.normalize_customer_phone(c.phone),'') IS NOT NULL THEN 1 ELSE 0 END);
  v_status:=CASE WHEN v_count>0 THEN CASE WHEN v_count<v_channels THEN 'partially_queued' ELSE 'queued' END ELSE 'suppressed' END;
  INSERT INTO public.communication_workflow_events(event_key,event_type,entity_id,customer_id,status,queued_count,metadata)
  VALUES(v_key,p_event_type,p_entity_id,p_customer_id,v_status,v_count,jsonb_build_object('configured_channels',v_channels,'status',p_status));
  RETURN v_count;
END; $function$;
