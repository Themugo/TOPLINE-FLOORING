-- Communications COMM-04 through COMM-06
-- Provider certification contract, production-grade transactional templates,
-- and complete customer-facing lifecycle routing for currently supported entities.

-- COMM-04: provider certification contract.
CREATE TABLE IF NOT EXISTS public.communication_provider_contracts (
  provider text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email','sms','whatsapp')),
  enabled boolean NOT NULL DEFAULT true,
  secret_env_keys text[] NOT NULL DEFAULT '{}',
  callback_function text,
  callback_secret_env_key text,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(provider, channel)
);

ALTER TABLE public.communication_provider_contracts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.communication_provider_contracts FROM anon;
GRANT SELECT ON public.communication_provider_contracts TO authenticated;
DROP POLICY IF EXISTS communication_provider_contracts_staff ON public.communication_provider_contracts;
CREATE POLICY communication_provider_contracts_staff ON public.communication_provider_contracts
  FOR SELECT TO authenticated
  USING (private.current_user_has_permission('customers','read'));

INSERT INTO public.communication_provider_contracts(provider,channel,secret_env_keys,callback_function,callback_secret_env_key,notes)
VALUES
 ('brevo','email',ARRAY['BREVO_API_KEY','BREVO_SENDER_EMAIL','BREVO_SENDER_NAME'],'communication-provider-webhook','COMMUNICATION_WEBHOOK_SECRET','Transactional email provider. Webhook must fail closed without its secret.'),
 ('africastalking','sms',ARRAY['AT_USERNAME','AT_API_KEY','AT_SENDER_ID'],'sms-delivery-report','AT_DLR_SECRET','Transactional SMS provider. Delivery callback is authenticated before processing.'),
 ('meta_whatsapp','whatsapp',ARRAY['WHATSAPP_ACCESS_TOKEN','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_VERIFY_TOKEN','WHATSAPP_APP_SECRET'],'whatsapp-webhook','WHATSAPP_APP_SECRET','Meta WhatsApp Cloud API. Callback uses verification token and HMAC signature.' )
ON CONFLICT (provider,channel) DO UPDATE SET
  secret_env_keys=EXCLUDED.secret_env_keys,
  callback_function=EXCLUDED.callback_function,
  callback_secret_env_key=EXCLUDED.callback_secret_env_key,
  notes=EXCLUDED.notes,
  updated_at=now();

COMMENT ON TABLE public.communication_provider_contracts IS 'Non-secret provider/channel certification contract. Credentials remain Edge environment secrets.';

-- COMM-05: strengthen the existing notification_rules catalogue rather than creating
-- a competing template system. Templates remain transactional and channel-neutral;
-- the existing router renders them into the durable outbox.
ALTER TABLE public.notification_rules
  ADD COLUMN IF NOT EXISTS template_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS template_variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.notification_rules
SET
  template_version=2,
  template_variables='["status","customer_name"]'::jsonb,
  subject_template=CASE event_type
    WHEN 'quotation.status' THEN 'Your Topline quotation is {{status}}'
    WHEN 'order.status' THEN 'Your Topline order is now {{status}}'
    WHEN 'project.status' THEN 'Your Topline project is now {{status}}'
    WHEN 'invoice.status' THEN 'Your Topline invoice is {{status}}'
    WHEN 'payment.received' THEN 'Payment received — thank you'
    WHEN 'site_visit.scheduled' THEN 'Your Topline site visit is {{status}}'
    WHEN 'delivery.status' THEN 'Your Topline delivery is {{status}}'
    WHEN 'installation.status' THEN 'Your Topline installation is {{status}}'
    WHEN 'service_case.status' THEN 'Your Topline service request is {{status}}'
    ELSE subject_template END,
  message_template=CASE event_type
    WHEN 'quotation.status' THEN 'Hello {{customer_name}}, your Topline quotation is now {{status}}. Please sign in to your customer account or contact our team if you need assistance.'
    WHEN 'order.status' THEN 'Hello {{customer_name}}, your Topline order is now {{status}}. You can track your order or sign in to your customer account for the latest details.'
    WHEN 'project.status' THEN 'Hello {{customer_name}}, your Topline project is now {{status}}. Your customer account will show the latest project information available to you.'
    WHEN 'invoice.status' THEN 'Hello {{customer_name}}, your Topline invoice is {{status}}. Please sign in to your customer account to review the invoice and payment details.'
    WHEN 'payment.received' THEN 'Hello {{customer_name}}, we have received your payment. Thank you for choosing Topline. Your customer account will reflect the latest payment information.'
    WHEN 'site_visit.scheduled' THEN 'Hello {{customer_name}}, your Topline site visit is {{status}}. Please keep your phone available for any coordination from our team.'
    WHEN 'delivery.status' THEN 'Hello {{customer_name}}, your Topline delivery is now {{status}}. We will provide the latest delivery information through your customer account.'
    WHEN 'installation.status' THEN 'Hello {{customer_name}}, your Topline installation is now {{status}}. Our team will coordinate the next step with you where required.'
    WHEN 'service_case.status' THEN 'Hello {{customer_name}}, your Topline service request is now {{status}}. Please sign in to your customer account or contact our team if you need help.'
    ELSE message_template END,
  updated_at=now()
WHERE event_type IN ('quotation.status','order.status','project.status','invoice.status','payment.received','site_visit.scheduled','delivery.status','installation.status','service_case.status');

INSERT INTO public.notification_rules(event_type,email_enabled,sms_enabled,whatsapp_enabled,subject_template,message_template,template_version,template_variables,enabled)
VALUES
 ('delivery.status',true,true,true,'Your Topline delivery is {{status}}','Hello {{customer_name}}, your Topline delivery is now {{status}}. We will provide the latest delivery information through your customer account.',2,'["status","customer_name"]'::jsonb,true),
 ('installation.status',true,true,true,'Your Topline installation is now {{status}}','Hello {{customer_name}}, your Topline installation is now {{status}}. Our team will coordinate the next step with you where required.',2,'["status","customer_name"]'::jsonb,true),
 ('service_case.status',true,true,true,'Your Topline service request is {{status}}','Hello {{customer_name}}, your Topline service request is now {{status}}. Please sign in to your customer account or contact our team if you need help.',2,'["status","customer_name"]'::jsonb,true)
ON CONFLICT (event_type) DO UPDATE SET
  email_enabled=EXCLUDED.email_enabled,
  sms_enabled=EXCLUDED.sms_enabled,
  whatsapp_enabled=EXCLUDED.whatsapp_enabled,
  subject_template=EXCLUDED.subject_template,
  message_template=EXCLUDED.message_template,
  template_version=EXCLUDED.template_version,
  template_variables=EXCLUDED.template_variables,
  enabled=EXCLUDED.enabled,
  updated_at=now();

-- COMM-06: strict quotation customer resolution and complete routing for delivery,
-- installation and after-sales service. Ambiguous email matches are suppressed rather
-- than notifying the wrong customer.
CREATE OR REPLACE FUNCTION public.emit_customer_journey_event()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  cid uuid;
  old_status text;
  new_status text;
  et text;
  entity text := TG_TABLE_NAME;
  eid uuid := NEW.id;
  v_match_count integer := 0;
BEGIN
  IF TG_TABLE_NAME='orders' THEN
    cid:=NEW.customer_id; new_status:=NEW.status; et:='order.status';
  ELSIF TG_TABLE_NAME='quotations' THEN
    SELECT count(*), min(c.id) INTO v_match_count, cid
    FROM public.customers c WHERE lower(c.email)=lower(trim(NEW.email));
    IF v_match_count <> 1 THEN cid:=NULL; END IF;
    new_status:=NEW.status; et:='quotation.status';
  ELSIF TG_TABLE_NAME='projects' THEN
    cid:=NEW.customer_id; new_status:=NEW.status; et:='project.status';
  ELSIF TG_TABLE_NAME='invoices' THEN
    cid:=NEW.customer_id; new_status:=NEW.status; et:='invoice.status';
  END IF;
  IF TG_OP='UPDATE' THEN old_status:=OLD.status; END IF;
  IF TG_OP='UPDATE' AND old_status IS NOT DISTINCT FROM new_status THEN RETURN NEW; END IF;
  INSERT INTO public.notification_events(event_type,entity_type,entity_id,customer_id,title,message,severity,audience,metadata)
  VALUES(et,entity,eid,cid,
    initcap(replace(entity,'_',' '))||' update',
    CASE WHEN old_status IS NULL THEN initcap(replace(entity,'_',' '))||' created.' ELSE initcap(replace(entity,'_',' '))||' changed from '||coalesce(old_status,'new')||' to '||coalesce(new_status,'updated')||'.' END,
    CASE WHEN new_status IN ('cancelled','lost') THEN 'warning' WHEN new_status IN ('completed','paid','won') THEN 'success' ELSE 'info' END,
    'both',jsonb_build_object('old_status',old_status,'new_status',new_status,'customer_match_count',v_match_count));
  IF cid IS NOT NULL THEN PERFORM public.queue_customer_notification_for_event(et,eid,cid,new_status); END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.emit_delivery_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE cid uuid;
BEGIN
  SELECT customer_id INTO cid FROM public.orders WHERE id=NEW.order_id;
  IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.queue_customer_notification_for_event('delivery.status',NEW.id,cid,NEW.status);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS delivery_customer_notification ON public.deliveries;
CREATE TRIGGER delivery_customer_notification AFTER INSERT OR UPDATE OF status ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.emit_delivery_notification();

CREATE OR REPLACE FUNCTION public.emit_installation_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE cid uuid;
BEGIN
  SELECT COALESCE(o.customer_id,p.customer_id) INTO cid
  FROM public.installations i
  LEFT JOIN public.orders o ON o.id=i.order_id
  LEFT JOIN public.projects p ON p.id=i.project_id
  WHERE i.id=NEW.id;
  IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.queue_customer_notification_for_event('installation.status',NEW.id,cid,NEW.status);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS installation_customer_notification ON public.installations;
CREATE TRIGGER installation_customer_notification AFTER INSERT OR UPDATE OF status ON public.installations FOR EACH ROW EXECUTE FUNCTION public.emit_installation_notification();

CREATE OR REPLACE FUNCTION public.emit_service_case_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
BEGIN
  IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.queue_customer_notification_for_event('service_case.status',NEW.id,NEW.customer_id,NEW.status);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS service_case_customer_notification ON public.service_cases;
CREATE TRIGGER service_case_customer_notification AFTER INSERT OR UPDATE OF status ON public.service_cases FOR EACH ROW EXECUTE FUNCTION public.emit_service_case_notification();

UPDATE public.communication_event_catalog SET implementation_status='wired',enabled=true,updated_at=now()
WHERE event_type IN ('quotation.status','order.status','project.status','invoice.status','payment.received','site_visit.scheduled','delivery.status','installation.status','service_case.status');

COMMENT ON TABLE public.notification_rules IS 'Canonical transactional communication rules/templates for customer lifecycle events.';
