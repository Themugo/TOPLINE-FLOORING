-- TOPLINE 2026-10-22 buyer onboarding and communications audit (phase 2).
--
-- Findings fixed here, all reproduced against the real worker and a database built from every migration:
--  1. A plain message from the Contact page is stored as a "General Contact Message" quotation, but the intake emails
--     ignored that: the buyer was told "We received your quotation request (RFQ-...)" and the owner received
--     "New Topline quotation request". Contact messages now get their own wording and a MSG- reference.
--  2. The owner's Reply on a quotation alert went to the shared support inbox, not to the buyer. Messages can now carry
--     their own reply-to; staff alerts reply straight to the buyer.
--  3. Only one staff alert address was read. quotation_admin_email may now hold up to five addresses separated by
--     commas, semicolons or spaces; each gets its own copy.
--  4. Buyers received no welcome after verifying their email. A one-time welcome email now follows verification.
--  5. The acknowledgement was thin. It now lists the structured details of the request (never echoing the buyer's free
--     text, which would let a stranger make us mail them attacker-written content) and how to follow it online.
-- Applies on top of 20261016120000 (volume guard) and 20261016090000 (quotation intake).

-- A. Messages may carry their own reply-to address.
ALTER TABLE public.communication_outbox
  ADD COLUMN IF NOT EXISTS reply_to text
  CHECK (reply_to IS NULL OR (reply_to ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' AND length(reply_to) <= 320));
COMMENT ON COLUMN public.communication_outbox.reply_to IS
  'Optional reply-to for this message. When null the worker uses the configured default reply-to.';

-- B. Helpers.
CREATE OR REPLACE FUNCTION private.topline_site_url()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$ SELECT 'https://toplineflooringandwaterproofing.co.ke'::text $$;
REVOKE ALL ON FUNCTION private.topline_site_url() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.parse_notification_recipients(p_raw text, p_max integer DEFAULT 5)
RETURNS text[] LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE
  v_part text;
  v_result text[] := ARRAY[]::text[];
BEGIN
  FOREACH v_part IN ARRAY regexp_split_to_array(coalesce(p_raw, ''), '[,;[:space:]]+') LOOP
    v_part := lower(btrim(v_part));
    IF v_part ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' AND length(v_part) <= 320
       AND NOT (v_part = ANY (v_result)) THEN
      v_result := array_append(v_result, v_part);
      EXIT WHEN coalesce(array_length(v_result, 1), 0) >= greatest(p_max, 1);
    END IF;
  END LOOP;
  RETURN v_result;
END; $$;
REVOKE ALL ON FUNCTION private.parse_notification_recipients(text, integer) FROM PUBLIC, anon, authenticated;

-- C. The volume guard exempts every staff alert copy (dedupe keys ...:admin, ...:admin-2, ...).
CREATE OR REPLACE FUNCTION public.guard_outbound_message_volume()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, private
AS $function$
DECLARE
  v_limit integer;
  v_count integer;
BEGIN
  IF NEW.created_by IS NOT NULL
     OR NEW.conversation_thread_id IS NOT NULL
     OR coalesce(NEW.dedupe_key, '') LIKE '%:admin%'
     OR NEW.status <> 'queued' THEN
    RETURN NEW;
  END IF;

  v_limit := CASE WHEN NEW.channel = 'email' THEN 30 ELSE 12 END;
  SELECT count(*) INTO v_count FROM public.communication_outbox o
   WHERE o.recipient = NEW.recipient AND o.channel = NEW.channel
     AND o.created_at > now() - interval '24 hours' AND o.status <> 'cancelled';
  IF v_count >= v_limit THEN
    NEW.status := 'cancelled'; NEW.delivery_status := 'rejected';
    NEW.error_message := 'Recipient daily message limit reached';
    RETURN NEW;
  END IF;

  -- Paid channels also have a site-wide hourly ceiling, so a burst of fake orders cannot run up the SMS bill.
  IF NEW.channel IN ('sms', 'whatsapp') THEN
    SELECT count(*) INTO v_count FROM public.communication_outbox o
     WHERE o.channel IN ('sms', 'whatsapp') AND o.created_by IS NULL
       AND o.created_at > now() - interval '1 hour' AND o.status <> 'cancelled';
    IF v_count >= 300 THEN
      NEW.status := 'cancelled'; NEW.delivery_status := 'rejected';
      NEW.error_message := 'Hourly SMS/WhatsApp ceiling reached';
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

-- D. Quotation and contact intake emails.
CREATE OR REPLACE FUNCTION public.queue_quotation_intake_emails()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE
  v_raw text;
  v_admins text[];
  v_admin text;
  v_index integer := 0;
  v_is_contact boolean;
  v_prefix text;
  v_ref text;
  v_site text := private.topline_site_url();
  v_recipient text;
  v_name text;
  v_name_staff text;
  v_project text;
  v_location text;
  v_timeline text;
  v_customer_subject text;
  v_customer_message text;
  v_staff_subject text;
  v_staff_message text;
  v_received text;
  v_staff_queued boolean := false;
BEGIN
  -- Staff alert recipients: one or more addresses in the communications settings, with the CMS contact email as fallback.
  SELECT ic.public_config->>'quotation_admin_email' INTO v_raw
    FROM public.site_integration_configs ic WHERE ic.integration_key = 'communications.email';
  v_admins := private.parse_notification_recipients(v_raw);
  IF coalesce(array_length(v_admins, 1), 0) = 0 THEN
    SELECT cc.content->>'email' INTO v_raw FROM public.cms_content cc WHERE cc.page = 'contact' AND cc.section = 'info' LIMIT 1;
    v_admins := private.parse_notification_recipients(v_raw);
  END IF;
  IF coalesce(array_length(v_admins, 1), 0) = 0 THEN
    SELECT cc.content->>'email' INTO v_raw FROM public.cms_content cc WHERE cc.page = 'footer' AND cc.section = 'contact' LIMIT 1;
    v_admins := private.parse_notification_recipients(v_raw);
  END IF;

  -- The Contact page stores its messages with this marker project type.
  v_is_contact := lower(btrim(coalesce(NEW.project_type, ''))) = 'general contact message';
  v_prefix := CASE WHEN v_is_contact THEN 'MSG-' ELSE 'RFQ-' END;
  v_ref := v_prefix || upper(substr(replace(NEW.id::text, '-', ''), 1, 8));
  v_recipient := lower(btrim(coalesce(NEW.email, '')));
  v_name := coalesce(nullif(private.sanitize_inline_text(NEW.name, 80), ''), 'there');
  v_name_staff := coalesce(nullif(private.sanitize_inline_text(NEW.name, 200), ''), 'Unknown');
  v_project := coalesce(nullif(private.sanitize_inline_text(coalesce(NEW.project_type, NEW.service), 120), ''), 'Not specified');
  v_location := coalesce(nullif(private.sanitize_inline_text(coalesce(NEW.county, NEW.location), 120), ''), 'Not specified');
  v_timeline := nullif(private.sanitize_inline_text(NEW.timeline, 120), '');
  v_received := to_char(NEW.created_at AT TIME ZONE 'Africa/Nairobi', 'DD Mon YYYY, HH24:MI') || ' (EAT)';

  IF v_is_contact THEN
    v_customer_subject := 'We received your message (' || v_ref || ')';
    v_customer_message := format(
      E'Hello %s,\n\nThank you for contacting TOPLINE Flooring & Waterproofing. We have received your message and a member of our team will reply to you using the details you provided.\n\nReference: %s\n\nIf you would like to add something, simply reply to this email.\n\nWant to follow your requests and orders online? Create a free account with this email address: %s/portal\n\nTOPLINE Flooring & Waterproofing',
      v_name, v_ref, v_site);
    v_staff_subject := left('New website message ' || v_ref || ' from ' || v_name_staff, 150);
  ELSE
    v_customer_subject := 'We received your quotation request (' || v_ref || ')';
    v_customer_message := format(
      E'Hello %s,\n\nThank you for your quotation request. We have received it and our team will review the details and contact you using the information you provided.\n\nReference: %s\nProject type: %s\nLocation: %s\n%s\nIf anything changes, or you would like to add details, simply reply to this email.\n\nWant to follow this request online? Create a free account with this email address: %s/portal\n\nThis is a transactional acknowledgement, not a marketing subscription.\n\nTOPLINE Flooring & Waterproofing',
      v_name, v_ref, v_project, v_location,
      CASE WHEN v_timeline IS NOT NULL THEN 'Timeline: ' || v_timeline || E'\n' ELSE '' END,
      v_site);
    v_staff_subject := left('New quotation request ' || v_ref || ': ' || left(v_project, 60) || ' - ' || v_name_staff, 150);
  END IF;

  v_staff_message := format(
    E'%s\n\nReference: %s\nReceived: %s\nName: %s\nEmail: %s\nPhone: %s\nCompany: %s\n%sLocation: %s\nTimeline: %s\nBudget range: %s\n\nMessage:\n%s\n\nReply to this email to answer the buyer directly; your reply goes to %s.\nReview and assign follow-up in the admin dashboard: %s/admin/quotations',
    CASE WHEN v_is_contact THEN 'A new message was sent through the website contact form.' ELSE 'A new quotation request was submitted on the website.' END,
    v_ref, v_received, v_name_staff,
    private.sanitize_inline_text(NEW.email, 320),
    private.sanitize_inline_text(NEW.phone, 30),
    coalesce(nullif(private.sanitize_inline_text(NEW.company, 200), ''), 'Not provided'),
    CASE WHEN v_is_contact THEN 'Subject: ' || v_project || E'\n' ELSE 'Project: ' || v_project || E'\n' END,
    v_location,
    coalesce(v_timeline, 'Not provided'),
    coalesce(nullif(private.sanitize_inline_text(NEW.budget_range, 120), ''), 'Not provided'),
    coalesce(nullif(private.sanitize_block_text(NEW.message, 5000), ''), 'Not provided'),
    private.sanitize_inline_text(NEW.email, 320),
    v_site);

  -- Customer acknowledgement: at most two per address per day, never to a bounced or complaining address.
  -- The buyer's free text is deliberately not echoed back (it would let a stranger make us mail attacker-written text).
  IF v_recipient <> ''
     AND (SELECT count(*) FROM public.communication_outbox o
           WHERE o.recipient = v_recipient AND o.dedupe_key LIKE 'quotation-intake:%:customer'
             AND o.created_at > now() - interval '24 hours') < 2
     AND NOT EXISTS (SELECT 1 FROM public.communication_suppressions s
                      WHERE s.email = v_recipient AND s.reason IN ('hard_bounce','invalid_email','spam_complaint')) THEN
    INSERT INTO public.communication_outbox(customer_id, channel, recipient, subject, message, dedupe_key)
    VALUES (NEW.customer_id, 'email', v_recipient, v_customer_subject, v_customer_message, 'quotation-intake:' || NEW.id::text || ':customer')
    ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  END IF;

  -- Staff alerts: one copy per configured address, each capped at 30 per hour so a flood cannot swamp an inbox.
  -- Replies go to the buyer. Every request is still saved and shown in the admin notifications.
  FOREACH v_admin IN ARRAY v_admins LOOP
    v_index := v_index + 1;
    IF (SELECT count(*) FROM public.communication_outbox o
         WHERE o.recipient = v_admin AND o.dedupe_key LIKE 'quotation-intake:%:admin%'
           AND o.created_at > now() - interval '1 hour') < 30 THEN
      INSERT INTO public.communication_outbox(customer_id, channel, recipient, subject, message, dedupe_key, reply_to)
      VALUES (NULL, 'email', v_admin, v_staff_subject, v_staff_message,
              'quotation-intake:' || NEW.id::text || CASE WHEN v_index = 1 THEN ':admin' ELSE ':admin-' || v_index::text END,
              CASE WHEN v_recipient ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN v_recipient ELSE NULL END)
      ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
      v_staff_queued := true;
    END IF;
  END LOOP;

  INSERT INTO public.notification_events(event_type, entity_type, entity_id, title, message, severity, audience, metadata)
  VALUES ('quotation.received', 'quotation', NEW.id,
          CASE WHEN v_is_contact THEN 'New website message' ELSE 'New quotation request' END,
          v_staff_message, 'info', 'staff',
          jsonb_build_object('quotation_id', NEW.id, 'reference', v_ref, 'contact_message', v_is_contact,
                             'admin_email_queued', v_staff_queued, 'admin_recipients', coalesce(array_length(v_admins, 1), 0)));
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.queue_quotation_intake_emails() FROM PUBLIC, anon, authenticated;

-- E. One-time welcome email after a buyer verifies their email and is linked to their customer record.
CREATE OR REPLACE FUNCTION public.queue_customer_welcome_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE
  v_email text;
  v_confirmed timestamptz;
  v_name text;
  v_site text := private.topline_site_url();
BEGIN
  SELECT lower(btrim(u.email)), u.email_confirmed_at INTO v_email, v_confirmed FROM auth.users u WHERE u.id = NEW.auth_user_id;
  -- Only the verification that just happened: staff linking an old account, or a later re-link, never triggers a welcome.
  IF v_email IS NULL OR v_confirmed IS NULL OR v_confirmed < now() - interval '1 day' THEN RETURN NEW; END IF;
  IF v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.communication_suppressions s
              WHERE s.email = v_email AND s.reason IN ('hard_bounce','invalid_email','spam_complaint')) THEN RETURN NEW; END IF;

  SELECT coalesce(nullif(private.sanitize_inline_text(c.name, 80), ''), 'there') INTO v_name FROM public.customers c WHERE c.id = NEW.customer_id;

  INSERT INTO public.communication_outbox(customer_id, channel, recipient, subject, message, dedupe_key)
  VALUES (NEW.customer_id, 'email', v_email, 'Welcome to TOPLINE Flooring & Waterproofing',
    format(E'Hello %s,\n\nYour TOPLINE customer account is ready. Thank you for registering.\n\nWith your account you can:\n- Follow your quotation requests and see their progress\n- Track your orders and deliveries\n- View your invoices and documents\n- Choose how we contact you\n\nSign in any time: %s/portal\nNeed a quotation? Start here: %s/quotation\n\nIf you did not create this account, please reply to this email and let us know.\n\nTOPLINE Flooring & Waterproofing',
           coalesce(v_name, 'there'), v_site, v_site),
    'welcome:' || NEW.customer_id::text)
  ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.queue_customer_welcome_email() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_customer_welcome_email ON public.customer_portal_access;
CREATE TRIGGER trg_customer_welcome_email
  AFTER INSERT ON public.customer_portal_access
  FOR EACH ROW WHEN (NEW.is_active AND NEW.customer_id IS NOT NULL AND NEW.auth_user_id IS NOT NULL)
  EXECUTE FUNCTION public.queue_customer_welcome_email();
