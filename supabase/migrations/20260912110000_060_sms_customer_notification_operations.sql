-- Phase 4: real SMS delivery state, customer notification preferences,
-- reusable notification rules, idempotent event routing and delivery reporting.

ALTER TABLE public.communication_outbox
  ADD COLUMN IF NOT EXISTS dedupe_key text,
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'pending'
    CHECK (delivery_status IN ('pending','accepted','submitted','buffered','delivered','rejected','failed','expired','unknown')),
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_cost numeric(12,4),
  ADD COLUMN IF NOT EXISTS provider_payload jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS communication_outbox_dedupe_idx
  ON public.communication_outbox(dedupe_key)
  WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS communication_outbox_delivery_status_idx
  ON public.communication_outbox(channel,delivery_status,created_at DESC);

CREATE TABLE IF NOT EXISTS public.customer_notification_preferences (
  customer_id uuid PRIMARY KEY REFERENCES public.customers(id) ON DELETE CASCADE,
  email_enabled boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT true,
  whatsapp_enabled boolean NOT NULL DEFAULT true,
  marketing_email_enabled boolean NOT NULL DEFAULT false,
  marketing_sms_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_notification_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_notification_preferences FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.customer_notification_preferences TO authenticated;
DROP POLICY IF EXISTS customer_notification_preferences_staff ON public.customer_notification_preferences;
CREATE POLICY customer_notification_preferences_staff ON public.customer_notification_preferences
  FOR ALL TO authenticated
  USING (private.current_user_has_permission('customers','update'))
  WITH CHECK (private.current_user_has_permission('customers','update'));

CREATE TABLE IF NOT EXISTS public.notification_rules (
  event_type text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT false,
  subject_template text NOT NULL,
  message_template text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_rules FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_rules TO authenticated;
DROP POLICY IF EXISTS notification_rules_staff ON public.notification_rules;
CREATE POLICY notification_rules_staff ON public.notification_rules
  FOR ALL TO authenticated
  USING (private.current_user_has_permission('settings','update'))
  WITH CHECK (private.current_user_has_permission('settings','update'));

INSERT INTO public.notification_rules(event_type,email_enabled,sms_enabled,subject_template,message_template) VALUES
('quotation.status',true,false,'Topline quotation update','Your Topline quotation has been updated to {{status}}.'),
('order.status',true,true,'Topline order update','Your Topline order is now {{status}}.'),
('project.status',true,true,'Topline project update','Your Topline project is now {{status}}.'),
('invoice.status',true,true,'Topline invoice update','Your Topline invoice is now {{status}}.'),
('payment.received',true,true,'Topline payment received','We have received your payment. Thank you for choosing Topline.'),
('site_visit.scheduled',true,true,'Topline site visit scheduled','Your Topline site visit has been scheduled.');

CREATE OR REPLACE FUNCTION public.ensure_customer_notification_preferences(p_customer_id uuid)
RETURNS public.customer_notification_preferences
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v public.customer_notification_preferences;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  PERFORM private.require_staff_permission('customers','update');
  INSERT INTO public.customer_notification_preferences(customer_id)
  VALUES(p_customer_id) ON CONFLICT (customer_id) DO NOTHING;
  SELECT * INTO v FROM public.customer_notification_preferences WHERE customer_id=p_customer_id;
  RETURN v;
END; $$;
GRANT EXECUTE ON FUNCTION public.ensure_customer_notification_preferences(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.normalize_customer_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE v text := regexp_replace(coalesce(trim(p_phone),''),'[^0-9+]','','g');
BEGIN
  IF v ~ '^0?7[0-9]{8}$' THEN RETURN '+254' || right(v,9); END IF;
  IF v ~ '^2547[0-9]{8}$' THEN RETURN '+' || v; END IF;
  IF v ~ '^\+2547[0-9]{8}$' THEN RETURN v; END IF;
  IF v ~ '^0?1[0-9]{8}$' THEN RETURN '+254' || right(v,9); END IF;
  IF v ~ '^2541[0-9]{8}$' THEN RETURN '+' || v; END IF;
  IF v ~ '^\+2541[0-9]{8}$' THEN RETURN v; END IF;
  RETURN nullif(v,'');
END; $$;

CREATE OR REPLACE FUNCTION public.queue_customer_notification_for_event(
  p_event_type text,
  p_entity_id uuid,
  p_customer_id uuid,
  p_status text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  r public.notification_rules%ROWTYPE;
  pref public.customer_notification_preferences%ROWTYPE;
  c public.customers%ROWTYPE;
  v_message text;
  v_subject text;
  v_recipient text;
  v_count integer := 0;
  v_channel text;
  v_dedupe text;
BEGIN
  SELECT * INTO r FROM public.notification_rules WHERE event_type=p_event_type AND enabled;
  IF NOT FOUND OR p_customer_id IS NULL THEN RETURN 0; END IF;
  SELECT * INTO c FROM public.customers WHERE id=p_customer_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  INSERT INTO public.customer_notification_preferences(customer_id) VALUES(p_customer_id) ON CONFLICT DO NOTHING;
  SELECT * INTO pref FROM public.customer_notification_preferences WHERE customer_id=p_customer_id;

  v_subject:=replace(r.subject_template,'{{status}}',coalesce(p_status,'updated'));
  v_message:=replace(r.message_template,'{{status}}',coalesce(p_status,'updated'));
  v_message:=replace(v_message,'{{customer_name}}',coalesce(c.name,'Customer'));

  IF r.email_enabled AND pref.email_enabled AND nullif(trim(c.email),'') IS NOT NULL THEN
    v_channel:='email'; v_recipient:=trim(c.email); v_dedupe:=p_event_type||':'||coalesce(p_entity_id::text,p_customer_id::text)||':email';
    INSERT INTO public.communication_outbox(customer_id,channel,recipient,subject,message,dedupe_key)
    VALUES(p_customer_id,v_channel,v_recipient,v_subject,v_message,v_dedupe)
    ON CONFLICT DO NOTHING;
    IF FOUND THEN v_count:=v_count+1; END IF;
  END IF;

  IF r.sms_enabled AND pref.sms_enabled AND nullif(public.normalize_customer_phone(c.phone),'') IS NOT NULL THEN
    v_channel:='sms'; v_recipient:=public.normalize_customer_phone(c.phone); v_dedupe:=p_event_type||':'||coalesce(p_entity_id::text,p_customer_id::text)||':sms';
    INSERT INTO public.communication_outbox(customer_id,channel,recipient,subject,message,dedupe_key)
    VALUES(p_customer_id,v_channel,v_recipient,NULL,v_message,v_dedupe)
    ON CONFLICT DO NOTHING;
    IF FOUND THEN v_count:=v_count+1; END IF;
  END IF;
  RETURN v_count;
END; $$;
REVOKE ALL ON FUNCTION public.queue_customer_notification_for_event(text,uuid,uuid,text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.emit_customer_journey_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE cid uuid; old_status text; new_status text; et text; ttl text; msg text; entity text; eid uuid;
BEGIN
  entity:=TG_TABLE_NAME; eid:=NEW.id;
  IF TG_TABLE_NAME='orders' THEN cid:=NEW.customer_id; new_status:=NEW.status; et:='order.status';
  ELSIF TG_TABLE_NAME='quotations' THEN SELECT c.id INTO cid FROM public.customers c WHERE lower(c.email)=lower(NEW.email) ORDER BY c.created_at LIMIT 1; new_status:=NEW.status; et:='quotation.status';
  ELSIF TG_TABLE_NAME='projects' THEN cid:=NEW.customer_id; new_status:=NEW.status; et:='project.status';
  ELSIF TG_TABLE_NAME='invoices' THEN cid:=NEW.customer_id; new_status:=NEW.status; et:='invoice.status';
  END IF;
  IF TG_OP='UPDATE' THEN old_status:=OLD.status; END IF;
  IF TG_OP='UPDATE' AND old_status IS NOT DISTINCT FROM new_status THEN RETURN NEW; END IF;
  ttl:=initcap(replace(entity,'_',' '))||' update';
  msg:=CASE WHEN old_status IS NULL THEN ttl||' created.' ELSE ttl||' changed from '||coalesce(old_status,'new')||' to '||coalesce(new_status,'updated')||'.' END;
  INSERT INTO public.notification_events(event_type,entity_type,entity_id,customer_id,title,message,severity,audience,metadata)
  VALUES(et,entity,eid,cid,ttl,msg,CASE WHEN new_status IN ('cancelled','lost') THEN 'warning' WHEN new_status IN ('completed','paid','won') THEN 'success' ELSE 'info' END,'both',jsonb_build_object('old_status',old_status,'new_status',new_status));
  PERFORM public.queue_customer_notification_for_event(et,eid,cid,new_status);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.record_sms_delivery_report(
  p_provider_reference text,
  p_status text,
  p_phone text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_cost numeric DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_status text := lower(coalesce(p_status,'unknown')); v_id uuid;
BEGIN
  IF v_status NOT IN ('sent','submitted','buffered','success','delivered','rejected','failed','expired') THEN v_status:='unknown'; END IF;
  UPDATE public.communication_outbox
  SET delivery_status=CASE WHEN v_status='success' THEN 'delivered' ELSE v_status END,
      delivered_at=CASE WHEN v_status IN ('success','delivered') THEN coalesce(delivered_at,now()) ELSE delivered_at END,
      provider_payload=coalesce(p_payload,'{}'::jsonb),
      provider_cost=coalesce(p_cost,provider_cost),
      error_message=CASE WHEN v_status IN ('failed','rejected','expired') THEN nullif(trim(p_description),'') ELSE error_message END
  WHERE channel='sms' AND provider_reference=p_provider_reference
  RETURNING id INTO v_id;
  RETURN v_id IS NOT NULL;
END; $$;
REVOKE ALL ON FUNCTION public.record_sms_delivery_report(text,text,text,text,jsonb,numeric) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_communication_operations_summary()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,private AS $$
BEGIN
  PERFORM private.require_staff_permission('customers','read');
  RETURN jsonb_build_object(
    'queued',(SELECT count(*) FROM public.communication_outbox WHERE status='queued'),
    'sent',(SELECT count(*) FROM public.communication_outbox WHERE status='sent'),
    'failed',(SELECT count(*) FROM public.communication_outbox WHERE status='failed'),
    'cancelled',(SELECT count(*) FROM public.communication_outbox WHERE status='cancelled'),
    'sms_delivered',(SELECT count(*) FROM public.communication_outbox WHERE channel='sms' AND delivery_status='delivered'),
    'sms_failed',(SELECT count(*) FROM public.communication_outbox WHERE channel='sms' AND delivery_status IN ('failed','rejected','expired')),
    'email_sent',(SELECT count(*) FROM public.communication_outbox WHERE channel='email' AND status='sent')
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.get_communication_operations_summary() TO authenticated;

-- High-value operational events that do not pass through the generic status trigger.
CREATE OR REPLACE FUNCTION public.emit_site_visit_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
BEGIN
  IF TG_OP='INSERT' OR (TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('scheduled','rescheduled')) THEN
    PERFORM public.queue_customer_notification_for_event('site_visit.scheduled',NEW.id,NEW.customer_id,NEW.status);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS site_visit_customer_notification ON public.site_visits;
CREATE TRIGGER site_visit_customer_notification AFTER INSERT OR UPDATE OF status ON public.site_visits FOR EACH ROW EXECUTE FUNCTION public.emit_site_visit_notification();

CREATE OR REPLACE FUNCTION public.emit_payment_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE cid uuid;
BEGIN
  SELECT customer_id INTO cid FROM public.invoices WHERE id=NEW.invoice_id;
  PERFORM public.queue_customer_notification_for_event('payment.received',NEW.id,cid,'received');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS payment_customer_notification ON public.payments;
CREATE TRIGGER payment_customer_notification AFTER INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.emit_payment_notification();

-- Payment receipt is the transactional SMS event; invoice status remains email-first to avoid duplicate SMS.
UPDATE public.notification_rules SET sms_enabled=false WHERE event_type='invoice.status';
