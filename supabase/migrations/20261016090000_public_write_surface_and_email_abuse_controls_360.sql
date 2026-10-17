-- TOPLINE 2026-10-16 audit hardening: public write surface, email abuse controls, suppression list.
--
-- Findings fixed here (each reproduced against a clean database built from every earlier migration):
--  1. public.public_projects is an auto-updatable view owned by the migration role. Supabase default
--     privileges gave anon and authenticated INSERT/UPDATE/DELETE on it, and a write through a view runs
--     with the view owner's rights, so RLS on public.projects was bypassed: any visitor holding the public
--     key could edit, add or delete live project listings. The same default privileges left anon with
--     UPDATE/DELETE/TRUNCATE/TRIGGER/REFERENCES on several tables that rely on RLS alone.
--  2. anon/authenticated could INSERT directly into quotations, leads and contact_messages through
--     *_public_insert RLS policies. The website only uses submit_quotation_request(), so the direct path
--     only bypassed its validation and let a caller set status, customer_id and totals themselves.
--  3. submit_quotation_request() had no rate limit, and the 2026-10-15 email trigger turned every request
--     into mail from the Topline sender to any address the caller typed, with caller-controlled text.
--  4. The quotation emails contained the literal characters "\n" instead of line breaks.
--  5. Brevo hard-bounce / spam-complaint / unsubscribe events were stored but never acted on.
--  6. A failed marketing "subscribe" could be retried after a later "unsubscribe" and silently re-subscribe.
--  7. Trigger functions were executable by anon/authenticated (not callable as RPC, but needless exposure).

-- ---------------------------------------------------------------------------------------------------
-- 1. Least privilege for the browser roles
-- ---------------------------------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  -- Views and materialized views are read-only for browser roles.
  FOR r IN
    SELECT c.oid::regclass AS rel
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('v','m')
  LOOP
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON %s FROM anon, authenticated', r.rel);
  END LOOP;

  -- TRUNCATE / TRIGGER / REFERENCES are never needed through the API and are not covered by RLS.
  FOR r IN
    SELECT c.oid::regclass AS rel
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r','p')
  LOOP
    EXECUTE format('REVOKE TRUNCATE, TRIGGER, REFERENCES ON %s FROM anon, authenticated', r.rel);
  END LOOP;

  -- Anonymous visitors write to exactly one table (page_visits analytics). Everything else is read-only
  -- for anon, whatever the default privileges or an RLS policy mistake might otherwise allow.
  FOR r IN
    SELECT c.oid::regclass AS rel
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND c.relname <> 'page_visits'
  LOOP
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON %s FROM anon', r.rel);
  END LOOP;
END $$;

REVOKE UPDATE, DELETE ON public.page_visits FROM anon;

REVOKE ALL ON public.public_projects FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_projects TO anon, authenticated, service_role;
ALTER VIEW public.public_projects SET (security_barrier = true);

-- Analytics inserts stay open to the browser but are bounded so the table cannot be stuffed with huge values.
DROP POLICY IF EXISTS page_visits_public_insert ON public.page_visits;
CREATE POLICY page_visits_public_insert ON public.page_visits FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(page_path) BETWEEN 1 AND 2048
    AND length(coalesce(referrer, '')) <= 2048
    AND length(coalesce(user_agent, '')) <= 512
  );

-- ---------------------------------------------------------------------------------------------------
-- 2. One public write path for enquiries: the RPC. Staff keep their RBAC insert policies.
-- ---------------------------------------------------------------------------------------------------
DROP POLICY IF EXISTS quotations_public_insert ON public.quotations;
DROP POLICY IF EXISTS leads_public_insert ON public.leads;
DROP POLICY IF EXISTS contact_messages_public_insert ON public.contact_messages;
REVOKE INSERT ON public.quotations, public.leads, public.contact_messages FROM anon;

-- ---------------------------------------------------------------------------------------------------
-- 7. Trigger functions are invoked by the trigger machinery, never by browser roles.
-- ---------------------------------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS fn
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.fn);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.sanitize_inline_text(p_text text, p_max integer DEFAULT 120)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT left(btrim(regexp_replace(
           regexp_replace(
             regexp_replace(coalesce(p_text, ''), '[[:cntrl:]]+', ' ', 'g'),
             '(https?://|www\.)[^[:space:]]*', '', 'gi'),
           '[[:space:]]+', ' ', 'g')), greatest(p_max, 1));
$$;
REVOKE ALL ON FUNCTION private.sanitize_inline_text(text, integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.sanitize_block_text(p_text text, p_max integer DEFAULT 5000)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT left(regexp_replace(coalesce(p_text, ''), '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g'), greatest(p_max, 1));
$$;
REVOKE ALL ON FUNCTION private.sanitize_block_text(text, integer) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------
-- 5. Suppression list (service role only)
-- ---------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.communication_suppressions (
  email text PRIMARY KEY CHECK (email = lower(btrim(email)) AND length(email) BETWEEN 3 AND 320),
  reason text NOT NULL CHECK (reason IN ('hard_bounce','invalid_email','spam_complaint','unsubscribed')),
  source text NOT NULL DEFAULT 'brevo_webhook',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.communication_suppressions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.communication_suppressions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.communication_suppressions TO service_role;
COMMENT ON TABLE public.communication_suppressions IS
  'Addresses that must not receive further email: hard bounces, invalid addresses and spam complaints block all email; unsubscribes block marketing sync only. Written by the provider-event worker; service role only.';

CREATE INDEX IF NOT EXISTS communication_outbox_recipient_created_idx
  ON public.communication_outbox (recipient, created_at DESC);
CREATE INDEX IF NOT EXISTS quotations_email_created_idx ON public.quotations (email, created_at DESC);
CREATE INDEX IF NOT EXISTS quotations_phone_created_idx ON public.quotations (phone, created_at DESC);

-- communication_outbox_dedupe_idx (unique, partial) already enforces and serves dedupe_key; the
-- non-unique twin only doubles write cost.
DROP INDEX IF EXISTS public.communication_outbox_dedupe_key_idx;

-- Provider events now act on suppressions. Signature and the existing delivery-state mapping are unchanged.
CREATE OR REPLACE FUNCTION public.record_provider_delivery_event_worker(
  p_provider text, p_channel text, p_event_type text,
  p_provider_message_id text DEFAULT NULL, p_provider_reference text DEFAULT NULL,
  p_recipient text DEFAULT NULL, p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','private' AS $$
DECLARE
  v_outbox public.communication_outbox%ROWTYPE;
  v_status text := lower(coalesce(p_event_type,'unknown'));
  v_norm text := regexp_replace(lower(coalesce(p_event_type,'unknown')), '[^a-z]', '', 'g');
  v_delivery text;
  v_email text;
  v_reason text;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
  IF p_channel NOT IN ('email','sms','whatsapp') THEN RAISE EXCEPTION 'Invalid channel'; END IF;

  INSERT INTO public.communication_provider_events(provider,channel,event_type,provider_message_id,provider_reference,recipient,payload)
  VALUES(p_provider,p_channel,p_event_type,p_provider_message_id,p_provider_reference,p_recipient,coalesce(p_payload,'{}'::jsonb))
  ON CONFLICT DO NOTHING;

  IF p_channel = 'email' THEN
    v_reason := CASE
      WHEN v_norm = 'hardbounce' THEN 'hard_bounce'
      WHEN v_norm IN ('invalidemail','invalid') THEN 'invalid_email'
      WHEN v_norm IN ('spam','complaint') THEN 'spam_complaint'
      WHEN v_norm IN ('unsubscribed','unsubscribe') THEN 'unsubscribed'
      ELSE NULL END;
    v_email := lower(btrim(coalesce(nullif(p_recipient,''), p_payload->>'email', '')));
    IF v_reason IS NOT NULL AND v_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' AND length(v_email) <= 320 THEN
      INSERT INTO public.communication_suppressions AS s(email,reason,source,details)
      VALUES (v_email, v_reason, coalesce(p_provider,'provider') || '_webhook',
              jsonb_build_object('event', p_event_type, 'provider_message_id', p_provider_message_id))
      ON CONFLICT (email) DO UPDATE
        SET reason = CASE WHEN s.reason IN ('hard_bounce','invalid_email','spam_complaint') THEN s.reason ELSE EXCLUDED.reason END,
            details = EXCLUDED.details,
            updated_at = now();

      IF v_reason IN ('unsubscribed','spam_complaint','hard_bounce','invalid_email') THEN
        UPDATE public.customer_notification_preferences p
           SET marketing_email_enabled = false, updated_at = now()
          FROM public.customers c
         WHERE c.id = p.customer_id AND lower(btrim(c.email)) = v_email AND p.marketing_email_enabled;
        UPDATE public.brevo_marketing_sync_queue
           SET status = 'superseded', processed_at = now(), last_error = 'recipient suppressed: ' || v_reason
         WHERE email = v_email AND action = 'subscribe' AND status = 'queued';
      END IF;
    END IF;
  END IF;

  SELECT * INTO v_outbox
  FROM public.communication_outbox
  WHERE (p_provider_message_id IS NOT NULL AND provider_message_id=p_provider_message_id)
     OR (p_provider_reference IS NOT NULL AND provider_reference=p_provider_reference)
  ORDER BY created_at DESC LIMIT 1;
  IF v_outbox.id IS NULL THEN RETURN false; END IF;

  v_delivery := CASE
    WHEN v_status IN ('delivered','success','read') THEN 'delivered'
    WHEN v_status IN ('sent','request','accepted','submitted','buffered') THEN v_status
    WHEN v_status IN ('failed','error','hardbounce','hard_bounce','softbounce','soft_bounce','rejected','blocked','spam','complaint','invalid','invalid_email','expired') THEN 'failed'
    ELSE 'unknown'
  END;

  PERFORM public.apply_communication_delivery_state_worker(
    v_outbox.id,p_provider,p_event_type,v_delivery,p_provider_message_id,p_provider_reference,coalesce(p_payload,'{}'::jsonb)
  );
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.record_provider_delivery_event_worker(text,text,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_provider_delivery_event_worker(text,text,text,text,text,text,jsonb) TO service_role;

-- The worker claim now cancels queued email to addresses that bounced, were invalid, or complained.
CREATE OR REPLACE FUNCTION public.claim_communication_outbox_worker(p_limit integer DEFAULT 10)
RETURNS SETOF public.communication_outbox
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','private' AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required';
  END IF;

  UPDATE public.communication_outbox o
     SET status = 'cancelled', delivery_status = 'rejected', locked_at = NULL,
         error_message = 'Recipient suppressed (' || s.reason || ')'
    FROM public.communication_suppressions s
   WHERE o.status = 'queued' AND o.channel = 'email'
     AND lower(btrim(o.recipient)) = s.email
     AND s.reason IN ('hard_bounce','invalid_email','spam_complaint');

  RETURN QUERY
  WITH candidates AS (
    SELECT id FROM public.communication_outbox
    WHERE status='queued'
      AND next_attempt_at <= now()
      AND attempt_count < max_attempts
      AND (locked_at IS NULL OR locked_at < now() - interval '10 minutes')
    ORDER BY next_attempt_at,created_at
    FOR UPDATE SKIP LOCKED
    LIMIT greatest(1,least(coalesce(p_limit,10),50))
  )
  UPDATE public.communication_outbox o
  SET locked_at=now(),last_attempt_at=now(),attempt_count=o.attempt_count+1
  FROM candidates c
  WHERE o.id=c.id
  RETURNING o.*;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_communication_outbox_worker(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_communication_outbox_worker(integer) TO service_role;

-- ---------------------------------------------------------------------------------------------------
-- 6. Marketing sync: newest consent decision wins
-- ---------------------------------------------------------------------------------------------------
ALTER TABLE public.brevo_marketing_sync_queue DROP CONSTRAINT IF EXISTS brevo_marketing_sync_queue_status_check;
ALTER TABLE public.brevo_marketing_sync_queue
  ADD CONSTRAINT brevo_marketing_sync_queue_status_check
  CHECK (status IN ('queued','processing','synced','failed','superseded'));

CREATE OR REPLACE FUNCTION public.enqueue_brevo_marketing_sync_on_preference_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_email text;
BEGIN
  IF TG_OP='INSERT' THEN
    IF NOT coalesce(NEW.marketing_email_enabled,false) THEN RETURN NEW; END IF;
    NEW.marketing_email_consent_at := coalesce(NEW.marketing_email_consent_at,now());
    NEW.marketing_email_consent_source := coalesce(NEW.marketing_email_consent_source,'customer_portal');
  ELSIF NEW.marketing_email_enabled IS NOT DISTINCT FROM OLD.marketing_email_enabled THEN
    RETURN NEW;
  ELSIF NEW.marketing_email_enabled THEN
    NEW.marketing_email_consent_at := now();
    NEW.marketing_email_consent_source := 'customer_portal';
  END IF;

  SELECT lower(trim(c.email)) INTO v_email FROM public.customers c WHERE c.id=NEW.customer_id;
  IF v_email IS NULL OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RETURN NEW; END IF;

  IF NEW.marketing_email_enabled THEN
    -- A fresh explicit opt-in clears an earlier unsubscribe, but never overrides a bounce or complaint.
    DELETE FROM public.communication_suppressions WHERE email = v_email AND reason = 'unsubscribed';
    IF EXISTS (SELECT 1 FROM public.communication_suppressions WHERE email = v_email) THEN RETURN NEW; END IF;
  END IF;

  UPDATE public.brevo_marketing_sync_queue
     SET status='superseded', processed_at=now(), last_error='superseded by a newer preference change'
   WHERE email = v_email AND status = 'queued';

  INSERT INTO public.brevo_marketing_sync_queue(customer_id,auth_user_id,email,action,dedupe_key,consent_at,consent_source)
  VALUES(NEW.customer_id,NULL,v_email,CASE WHEN NEW.marketing_email_enabled THEN 'subscribe' ELSE 'unsubscribe' END,
         'preference:'||NEW.customer_id::text||':'||gen_random_uuid()::text,NEW.marketing_email_consent_at,NEW.marketing_email_consent_source)
  ON CONFLICT (dedupe_key) DO NOTHING;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.enqueue_brevo_marketing_sync_on_preference_change() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.enqueue_brevo_marketing_sync_on_auth_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_email text; v_opt_in boolean;
BEGIN
  -- Only subscribe after the email address is verified (see the 2026-10-15 migration for the full rule).
  IF TG_OP = 'INSERT' THEN
    IF NEW.email_confirmed_at IS NULL THEN RETURN NEW; END IF;
  ELSE
    IF OLD.email_confirmed_at IS NOT NULL OR NEW.email_confirmed_at IS NULL THEN RETURN NEW; END IF;
  END IF;

  v_email := lower(trim(coalesce(NEW.email,'')));
  v_opt_in := lower(coalesce(NEW.raw_user_meta_data->>'marketing_email_opt_in','false')) IN ('true','1','yes');
  IF NOT v_opt_in OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RETURN NEW; END IF;

  DELETE FROM public.communication_suppressions WHERE email = v_email AND reason = 'unsubscribed';
  IF EXISTS (SELECT 1 FROM public.communication_suppressions WHERE email = v_email) THEN RETURN NEW; END IF;

  UPDATE public.brevo_marketing_sync_queue
     SET status='superseded', processed_at=now(), last_error='superseded by a newer registration opt-in'
   WHERE email = v_email AND status = 'queued';

  INSERT INTO public.brevo_marketing_sync_queue(customer_id,auth_user_id,email,action,dedupe_key,consent_at,consent_source)
  VALUES (NULL,NEW.id,v_email,'subscribe','auth-signup:'||NEW.id::text,now(),'customer_registration_form')
  ON CONFLICT (dedupe_key) DO NOTHING;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.enqueue_brevo_marketing_sync_on_auth_signup() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------
-- 3 + 4. Quotation intake: bounded, idempotent, and emails with real line breaks
-- ---------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_quotation_request(
  p_name text,p_email text,p_phone text,p_county text DEFAULT NULL,p_project_type text DEFAULT NULL,p_service text DEFAULT NULL,
  p_message text DEFAULT NULL,p_budget_range text DEFAULT NULL,p_timeline text DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_lead_id uuid; v_quotation_id uuid;
  v_email text; v_phone text; v_message text;
BEGIN
  IF length(trim(coalesce(p_name,''))) NOT BETWEEN 2 AND 200 THEN RETURN json_build_object('success',false,'error','Invalid name'); END IF;
  IF trim(coalesce(p_email,'')) !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' OR length(trim(p_email)) > 320 THEN RETURN json_build_object('success',false,'error','Invalid email'); END IF;
  IF length(trim(coalesce(p_phone,''))) NOT BETWEEN 3 AND 30 THEN RETURN json_build_object('success',false,'error','Invalid phone number'); END IF;
  IF length(coalesce(p_county,''))>120 OR length(coalesce(p_project_type,''))>120 OR length(coalesce(p_service,''))>160 OR length(coalesce(p_budget_range,''))>120 OR length(coalesce(p_timeline,''))>120 OR length(coalesce(p_message,''))>5000 THEN RETURN json_build_object('success',false,'error','Quotation request is too long'); END IF;

  v_email := lower(trim(p_email));
  v_phone := trim(p_phone);
  v_message := nullif(trim(coalesce(p_message,'')),'');

  -- A double-click or retry of the same enquiry returns the original record instead of creating a duplicate.
  SELECT q.id, q.lead_id INTO v_quotation_id, v_lead_id
  FROM public.quotations q
  WHERE q.email = v_email AND q.created_at > now() - interval '2 minutes'
    AND q.message IS NOT DISTINCT FROM v_message
  ORDER BY q.created_at DESC LIMIT 1;
  IF v_quotation_id IS NOT NULL THEN
    RETURN json_build_object('success',true,'lead_id',v_lead_id,'quotation_id',v_quotation_id,'duplicate',true);
  END IF;

  -- Per-contact limits stop one address or number being used to flood the team or the recipient.
  IF (SELECT count(*) FROM public.quotations WHERE email = v_email AND created_at > now() - interval '1 hour') >= 3
     OR (SELECT count(*) FROM public.quotations WHERE email = v_email AND created_at > now() - interval '24 hours') >= 8
     OR (SELECT count(*) FROM public.quotations WHERE phone = v_phone AND created_at > now() - interval '1 hour') >= 5 THEN
    RETURN json_build_object('success',false,'code','rate_limited',
      'error','Too many enquiries have been sent from these contact details. Please wait a little while before sending another, or call us directly.');
  END IF;

  INSERT INTO public.leads(name,company,email,phone,source,status,budget_range,project_location,notes)
  VALUES(trim(p_name),NULL,v_email,v_phone,'website','new',nullif(trim(coalesce(p_budget_range,'')),''),nullif(trim(coalesce(p_county,'')),''),v_message) RETURNING id INTO v_lead_id;
  INSERT INTO public.quotations(name,email,phone,project_type,service,location,county,budget_range,timeline,message,status,lead_id)
  VALUES(trim(p_name),v_email,v_phone,nullif(trim(coalesce(p_project_type,'')),''),nullif(trim(coalesce(p_service,'')),''),nullif(trim(coalesce(p_county,'')),''),nullif(trim(coalesce(p_county,'')),''),nullif(trim(coalesce(p_budget_range,'')),''),nullif(trim(coalesce(p_timeline,'')),''),v_message,'new',v_lead_id) RETURNING id INTO v_quotation_id;
  UPDATE public.leads SET converted_quotation_id=v_quotation_id WHERE id=v_lead_id;
  RETURN json_build_object('success',true,'lead_id',v_lead_id,'quotation_id',v_quotation_id);
END; $$;
REVOKE ALL ON FUNCTION public.submit_quotation_request(text,text,text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quotation_request(text,text,text,text,text,text,text,text,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.queue_quotation_intake_emails()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  v_admin_email text;
  v_ref text;
  v_customer_message text;
  v_admin_message text;
  v_recipient text;
  v_name text;
BEGIN
  SELECT nullif(lower(trim(ic.public_config->>'quotation_admin_email')),'')
    INTO v_admin_email
  FROM public.site_integration_configs ic
  WHERE ic.integration_key='communications.email';

  IF v_admin_email IS NULL THEN
    SELECT nullif(lower(trim(cc.content->>'email')),'') INTO v_admin_email
    FROM public.cms_content cc WHERE cc.page='contact' AND cc.section='info' LIMIT 1;
  END IF;
  IF v_admin_email IS NULL THEN
    SELECT nullif(lower(trim(cc.content->>'email')),'') INTO v_admin_email
    FROM public.cms_content cc WHERE cc.page='footer' AND cc.section='contact' LIMIT 1;
  END IF;
  IF v_admin_email IS NOT NULL AND v_admin_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    v_admin_email := NULL;
  END IF;

  v_ref := 'RFQ-' || upper(substr(replace(NEW.id::text,'-',''),1,8));
  v_recipient := lower(trim(coalesce(NEW.email,'')));
  -- Requester-controlled text is flattened to one line and stripped of links before it is placed in
  -- an email that carries the Topline sender name.
  v_name := coalesce(nullif(private.sanitize_inline_text(NEW.name, 80), ''), 'there');

  v_customer_message := format(
    E'Hello %s,\n\nWe have received your quotation request (%s). Our team will review the project details and contact you using the details you supplied.\n\nProject: %s\nLocation: %s\n\nThis is a transactional acknowledgement, not a marketing subscription.\n\nTopline Flooring & Waterproofing',
    v_name, v_ref,
    coalesce(nullif(private.sanitize_inline_text(coalesce(NEW.project_type,NEW.service),120),''),'Not specified'),
    coalesce(nullif(private.sanitize_inline_text(coalesce(NEW.county,NEW.location),120),''),'Not specified'));
  v_admin_message := format(
    E'A new website quotation request was received.\n\nReference: %s\nName: %s\nEmail: %s\nPhone: %s\nCompany: %s\nProject: %s\nLocation: %s\nTimeline: %s\nBudget range: %s\n\nMessage/details:\n%s\n\nOpen the Topline admin dashboard to review and assign follow-up.',
    v_ref,
    private.sanitize_inline_text(NEW.name,200),
    private.sanitize_inline_text(NEW.email,320),
    private.sanitize_inline_text(NEW.phone,30),
    coalesce(nullif(private.sanitize_inline_text(NEW.company,200),''),'Not provided'),
    coalesce(nullif(private.sanitize_inline_text(coalesce(NEW.project_type,NEW.service),160),''),'Not specified'),
    coalesce(nullif(private.sanitize_inline_text(coalesce(NEW.county,NEW.location),120),''),'Not specified'),
    coalesce(nullif(private.sanitize_inline_text(NEW.timeline,120),''),'Not provided'),
    coalesce(nullif(private.sanitize_inline_text(NEW.budget_range,120),''),'Not provided'),
    coalesce(nullif(private.sanitize_block_text(NEW.message,5000),''),'Not provided'));

  -- Durable staff notification regardless of email configuration. Email UAT remains a release gate.
  INSERT INTO public.notification_events(event_type,entity_type,entity_id,title,message,severity,audience,metadata)
  VALUES('quotation.received','quotation',NEW.id,'New quotation request',v_admin_message,'info','staff',
    jsonb_build_object('quotation_id',NEW.id,'reference',v_ref,'admin_email_queued',v_admin_email IS NOT NULL));

  -- Customer acknowledgement: at most two per address per day, never to a bounced/complaining address.
  IF v_recipient <> ''
     AND (SELECT count(*) FROM public.communication_outbox o
           WHERE o.recipient = v_recipient AND o.dedupe_key LIKE 'quotation-intake:%:customer'
             AND o.created_at > now() - interval '24 hours') < 2
     AND NOT EXISTS (SELECT 1 FROM public.communication_suppressions s
                      WHERE s.email = v_recipient AND s.reason IN ('hard_bounce','invalid_email','spam_complaint')) THEN
    INSERT INTO public.communication_outbox(customer_id,channel,recipient,subject,message,dedupe_key)
    VALUES(NULL,'email',v_recipient,'We received your Topline quotation request ('||v_ref||')',v_customer_message,'quotation-intake:'||NEW.id::text||':customer')
    ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  END IF;

  -- Staff alert email: capped per hour so a flood of enquiries cannot flood the inbox. Every request is
  -- still recorded as a staff notification above and as a quotation row.
  IF v_admin_email IS NOT NULL
     AND (SELECT count(*) FROM public.communication_outbox o
           WHERE o.dedupe_key LIKE 'quotation-intake:%:admin'
             AND o.created_at > now() - interval '1 hour') < 30 THEN
    INSERT INTO public.communication_outbox(customer_id,channel,recipient,subject,message,dedupe_key)
    VALUES(NULL,'email',v_admin_email,'New Topline quotation request ('||v_ref||')',v_admin_message,'quotation-intake:'||NEW.id::text||':admin')
    ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.queue_quotation_intake_emails() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.submit_quotation_request(text,text,text,text,text,text,text,text,text) IS
  'Only public write path for enquiries. Validates input, de-duplicates a retry within two minutes and limits each email address (3/hour, 8/day) and phone number (5/hour).';
