-- Communications COMM-01 through COMM-03
-- Canonical event catalogue, monotonic provider delivery state, and strict inbound identity matching.
-- No business data model is replaced; this hardens the existing communication outbox/provider architecture.

CREATE TABLE IF NOT EXISTS public.communication_event_catalog (
  event_type text PRIMARY KEY,
  entity_type text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  transactional boolean NOT NULL DEFAULT true,
  implementation_status text NOT NULL DEFAULT 'catalog_only'
    CHECK (implementation_status IN ('wired','catalog_only','staff_only','portal_only','disabled')),
  trigger_source text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.communication_event_catalog ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.communication_event_catalog FROM anon;
GRANT SELECT ON public.communication_event_catalog TO authenticated;
DROP POLICY IF EXISTS communication_event_catalog_staff ON public.communication_event_catalog;
CREATE POLICY communication_event_catalog_staff ON public.communication_event_catalog
  FOR SELECT TO authenticated
  USING (private.current_user_has_permission('settings','read'));

INSERT INTO public.communication_event_catalog(event_type,entity_type,category,description,transactional,implementation_status,trigger_source)
VALUES
 ('customer.registered','customer','identity','Customer registration completed.',true,'wired','customer registration/auth flow'),
 ('customer.email_verified','customer','identity','Customer email verification completed.',true,'catalog_only','future auth event hook'),
 ('customer.portal_activated','customer','identity','Customer portal access became active.',true,'catalog_only','future portal activation hook'),
 ('lead.received','lead','sales','New customer enquiry received.',true,'catalog_only','future enquiry event hook'),
 ('lead.assigned','lead','sales','Enquiry assigned to a staff member.',true,'catalog_only','future enquiry event hook'),
 ('lead.follow_up','lead','sales','Enquiry follow-up is due or requested.',true,'catalog_only','future enquiry event hook'),
 ('quotation.received','quotation','quotation','Quotation request received.',true,'catalog_only','future quotation request hook'),
 ('quotation.created','quotation','quotation','Quotation created for a customer.',true,'catalog_only','future quotation lifecycle hook'),
 ('quotation.status','quotation','quotation','Quotation status changed.',true,'wired','quotations status trigger'),
 ('quotation.viewed','quotation','quotation','Customer viewed a quotation.',false,'catalog_only','future portal analytics hook'),
 ('quotation.approved','quotation','quotation','Quotation approved.',true,'catalog_only','future quotation lifecycle hook'),
 ('quotation.rejected','quotation','quotation','Quotation rejected.',true,'catalog_only','future quotation lifecycle hook'),
 ('quotation.expired','quotation','quotation','Quotation expired.',true,'catalog_only','future quotation lifecycle hook'),
 ('quotation.revised','quotation','quotation','Quotation revised.',true,'catalog_only','future quotation lifecycle hook'),
 ('order.created','order','order','Customer order created.',true,'catalog_only','future order lifecycle hook'),
 ('order.confirmed','order','order','Order confirmed.',true,'catalog_only','future order lifecycle hook'),
 ('order.payment_required','order','order','Order requires payment.',true,'catalog_only','future payment lifecycle hook'),
 ('order.status','order','order','Order status changed.',true,'wired','orders status trigger'),
 ('order.processing','order','order','Order entered processing.',true,'catalog_only','future order lifecycle hook'),
 ('order.ready','order','order','Order is ready for fulfilment.',true,'catalog_only','future fulfilment hook'),
 ('order.dispatched','order','delivery','Order dispatched.',true,'catalog_only','future delivery hook'),
 ('order.delivered','order','delivery','Order delivered.',true,'catalog_only','future delivery hook'),
 ('order.cancelled','order','order','Order cancelled.',true,'catalog_only','future order lifecycle hook'),
 ('delivery.scheduled','delivery','delivery','Delivery scheduled.',true,'catalog_only','future delivery hook'),
 ('delivery.dispatched','delivery','delivery','Delivery dispatched.',true,'catalog_only','future delivery hook'),
 ('delivery.delayed','delivery','delivery','Delivery delayed.',true,'catalog_only','future delivery hook'),
 ('delivery.delivered','delivery','delivery','Delivery completed.',true,'catalog_only','future delivery hook'),
 ('delivery.failed','delivery','delivery','Delivery failed and requires attention.',true,'catalog_only','future delivery hook'),
 ('project.created','project','project','Customer project created.',true,'catalog_only','future project lifecycle hook'),
 ('project.status','project','project','Project status changed.',true,'wired','projects status trigger'),
 ('project.phase_changed','project','project','Project phase changed.',true,'catalog_only','future project phase hook'),
 ('project.delayed','project','project','Project delay recorded.',true,'catalog_only','future project exception hook'),
 ('project.completed','project','project','Project completed.',true,'catalog_only','future project lifecycle hook'),
 ('project.closed','project','project','Project closed.',true,'catalog_only','future project lifecycle hook'),
 ('site_visit.requested','site_visit','field_service','Site visit requested.',true,'catalog_only','future site visit hook'),
 ('site_visit.scheduled','site_visit','field_service','Site visit scheduled or rescheduled.',true,'wired','site_visits status trigger'),
 ('site_visit.completed','site_visit','field_service','Site visit completed.',true,'catalog_only','future site visit hook'),
 ('site_visit.cancelled','site_visit','field_service','Site visit cancelled.',true,'catalog_only','future site visit hook'),
 ('installation.scheduled','installation','field_service','Installation scheduled.',true,'catalog_only','future installation hook'),
 ('installation.rescheduled','installation','field_service','Installation rescheduled.',true,'catalog_only','future installation hook'),
 ('installation.started','installation','field_service','Installation started.',true,'catalog_only','future installation hook'),
 ('installation.completed','installation','field_service','Installation completed.',true,'catalog_only','future installation hook'),
 ('invoice.created','invoice','billing','Invoice created.',true,'catalog_only','future invoice lifecycle hook'),
 ('invoice.sent','invoice','billing','Invoice sent.',true,'catalog_only','future invoice lifecycle hook'),
 ('invoice.status','invoice','billing','Invoice status changed.',true,'wired','invoices status trigger'),
 ('invoice.due','invoice','billing','Invoice became due.',true,'catalog_only','future finance scheduler hook'),
 ('invoice.overdue','invoice','billing','Invoice became overdue.',true,'catalog_only','future finance scheduler hook'),
 ('invoice.partially_paid','invoice','billing','Invoice became partially paid.',true,'catalog_only','future payment lifecycle hook'),
 ('invoice.paid','invoice','billing','Invoice fully paid.',true,'catalog_only','future payment lifecycle hook'),
 ('invoice.cancelled','invoice','billing','Invoice cancelled.',true,'catalog_only','future invoice lifecycle hook'),
 ('payment.received','payment','billing','Payment received against an invoice.',true,'wired','payments insert trigger'),
 ('payment.confirmed','payment','billing','Payment confirmed.',true,'catalog_only','future payment lifecycle hook'),
 ('payment.failed','payment','billing','Payment failed.',true,'catalog_only','future payment lifecycle hook'),
 ('payment.refunded','payment','billing','Payment refunded.',true,'catalog_only','future payment lifecycle hook'),
 ('service_request.received','service_case','service','Customer service/warranty request received.',true,'catalog_only','future service case hook'),
 ('service_request.assigned','service_case','service','Service request assigned.',true,'catalog_only','future service case hook'),
 ('service_request.scheduled','service_case','service','Service request appointment scheduled.',true,'catalog_only','future service case hook'),
 ('service_request.in_progress','service_case','service','Service request entered active work.',true,'catalog_only','future service case hook'),
 ('service_request.resolved','service_case','service','Service request resolved.',true,'catalog_only','future service case hook'),
 ('service_request.closed','service_case','service','Service request closed.',true,'catalog_only','future service case hook'),
 ('service_request.reopened','service_case','service','Previously resolved service request reopened.',true,'catalog_only','future service case hook'),
 ('warranty_request.received','service_case','warranty','Warranty request received.',true,'catalog_only','future warranty hook'),
 ('warranty_request.approved','service_case','warranty','Warranty request approved.',true,'catalog_only','future warranty hook'),
 ('warranty_request.rejected','service_case','warranty','Warranty request rejected.',true,'catalog_only','future warranty hook')
ON CONFLICT (event_type) DO UPDATE SET
  entity_type=EXCLUDED.entity_type,
  category=EXCLUDED.category,
  description=EXCLUDED.description,
  transactional=EXCLUDED.transactional,
  implementation_status=EXCLUDED.implementation_status,
  trigger_source=EXCLUDED.trigger_source,
  enabled=EXCLUDED.enabled,
  updated_at=now();

-- COMM-02: explicit monotonic delivery-state ordering. Raw provider events remain immutable audit records;
-- the outbox's current state can only move forward in strength.
CREATE TABLE IF NOT EXISTS public.communication_delivery_state_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_id uuid NOT NULL REFERENCES public.communication_outbox(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  provider text,
  event_type text,
  provider_message_id text,
  provider_reference text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS communication_delivery_state_transitions_outbox_idx
  ON public.communication_delivery_state_transitions(outbox_id,created_at DESC);
ALTER TABLE public.communication_delivery_state_transitions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.communication_delivery_state_transitions FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.communication_delivery_state_rank(p_status text)
RETURNS integer
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE lower(coalesce(p_status,'pending'))
    WHEN 'pending' THEN 10
    WHEN 'unknown' THEN 20
    WHEN 'accepted' THEN 30
    WHEN 'submitted' THEN 30
    WHEN 'buffered' THEN 30
    WHEN 'failed' THEN 40
    WHEN 'rejected' THEN 40
    WHEN 'expired' THEN 40
    WHEN 'delivered' THEN 50
    ELSE 20
  END;
$$;

CREATE OR REPLACE FUNCTION public.apply_communication_delivery_state_worker(
  p_outbox_id uuid,
  p_provider text,
  p_event_type text,
  p_new_status text,
  p_provider_message_id text DEFAULT NULL,
  p_provider_reference text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  v_outbox public.communication_outbox%ROWTYPE;
  v_old text;
  v_new text := lower(coalesce(p_new_status,'unknown'));
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
  IF v_new NOT IN ('pending','accepted','submitted','buffered','delivered','rejected','failed','expired','unknown') THEN
    RAISE EXCEPTION 'Invalid delivery state';
  END IF;
  SELECT * INTO v_outbox FROM public.communication_outbox WHERE id=p_outbox_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  v_old:=v_outbox.delivery_status;

  IF public.communication_delivery_state_rank(v_new) < public.communication_delivery_state_rank(v_old) THEN
    RETURN false;
  END IF;

  IF v_old IS NOT DISTINCT FROM v_new AND p_event_type IS NULL THEN RETURN true; END IF;

  INSERT INTO public.communication_delivery_state_transitions(
    outbox_id,from_status,to_status,provider,event_type,provider_message_id,provider_reference,payload
  ) VALUES (
    p_outbox_id,v_old,v_new,p_provider,p_event_type,p_provider_message_id,p_provider_reference,coalesce(p_payload,'{}'::jsonb)
  );

  UPDATE public.communication_outbox
  SET delivery_status=v_new,
      delivered_at=CASE WHEN v_new='delivered' THEN coalesce(delivered_at,now()) ELSE delivered_at END,
      last_provider_event=p_event_type,
      last_provider_event_at=now(),
      provider_payload=coalesce(p_payload,'{}'::jsonb),
      error_message=CASE WHEN v_new IN ('failed','rejected','expired')
        THEN coalesce(nullif(p_payload->>'reason',''),nullif(p_payload->>'error',''),error_message)
        ELSE error_message END
  WHERE id=p_outbox_id;
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.apply_communication_delivery_state_worker(uuid,text,text,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_communication_delivery_state_worker(uuid,text,text,text,text,text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_communication_delivery_worker(
  p_outbox_id uuid,
  p_provider text,
  p_provider_reference text DEFAULT NULL,
  p_provider_message_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_old text;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
  SELECT delivery_status INTO v_old FROM public.communication_outbox WHERE id=p_outbox_id AND status='queued' FOR UPDATE;
  IF v_old IS NULL THEN RAISE EXCEPTION 'Queued message not found'; END IF;
  UPDATE public.communication_outbox
  SET status='sent',
      provider=nullif(trim(p_provider),''),
      provider_reference=nullif(trim(p_provider_reference),''),
      provider_message_id=nullif(trim(p_provider_message_id),''),
      sent_at=now(),
      locked_at=NULL,
      error_message=NULL
  WHERE id=p_outbox_id AND status='queued';
  IF NOT FOUND THEN RAISE EXCEPTION 'Queued message not found'; END IF;
  INSERT INTO public.communication_delivery_state_transitions(outbox_id,from_status,to_status,provider,event_type,provider_message_id,provider_reference,payload)
  VALUES(p_outbox_id,v_old,'accepted',p_provider,'worker.accepted',p_provider_message_id,p_provider_reference,'{}'::jsonb);
  UPDATE public.communication_outbox SET delivery_status='accepted' WHERE id=p_outbox_id;
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.complete_communication_delivery_worker(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_communication_delivery_worker(uuid,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.record_provider_delivery_event_worker(
  p_provider text,
  p_channel text,
  p_event_type text,
  p_provider_message_id text DEFAULT NULL,
  p_provider_reference text DEFAULT NULL,
  p_recipient text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  v_outbox public.communication_outbox%ROWTYPE;
  v_status text := lower(coalesce(p_event_type,'unknown'));
  v_delivery text;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
  IF p_channel NOT IN ('email','sms','whatsapp') THEN RAISE EXCEPTION 'Invalid channel'; END IF;

  INSERT INTO public.communication_provider_events(provider,channel,event_type,provider_message_id,provider_reference,recipient,payload)
  VALUES(p_provider,p_channel,p_event_type,p_provider_message_id,p_provider_reference,p_recipient,coalesce(p_payload,'{}'::jsonb))
  ON CONFLICT DO NOTHING;

  SELECT * INTO v_outbox
  FROM public.communication_outbox
  WHERE (p_provider_message_id IS NOT NULL AND provider_message_id=p_provider_message_id)
     OR (p_provider_reference IS NOT NULL AND provider_reference=p_provider_reference)
  ORDER BY created_at DESC LIMIT 1;
  IF v_outbox.id IS NULL THEN RETURN false; END IF;

  v_delivery := CASE
    WHEN v_status IN ('delivered','success','read') THEN 'delivered'
    WHEN v_status IN ('sent','request','accepted','submitted','buffered') THEN v_status
    WHEN v_status IN ('failed','error','hardbounce','hard_bounce','softbounce','soft_bounce','rejected','blocked','spam','invalid','expired') THEN 'failed'
    ELSE 'unknown'
  END;

  PERFORM public.apply_communication_delivery_state_worker(
    v_outbox.id,p_provider,p_event_type,v_delivery,p_provider_message_id,p_provider_reference,coalesce(p_payload,'{}'::jsonb)
  );
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.record_provider_delivery_event_worker(text,text,text,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_provider_delivery_event_worker(text,text,text,text,text,text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.mark_communication_delivery_uncertain_worker(
  p_outbox_id uuid,
  p_error_message text
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_old text;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
  SELECT delivery_status INTO v_old FROM public.communication_outbox WHERE id=p_outbox_id AND status='queued' FOR UPDATE;
  IF v_old IS NULL THEN RETURN false; END IF;
  UPDATE public.communication_outbox
  SET status='failed',delivery_status='unknown',locked_at=NULL,
      error_message=left(coalesce(nullif(trim(p_error_message),''),'Provider accepted message but local completion failed'),1000)
  WHERE id=p_outbox_id AND status='queued';
  INSERT INTO public.communication_delivery_state_transitions(outbox_id,from_status,to_status,provider,event_type,payload)
  VALUES(p_outbox_id,v_old,'unknown','worker','worker.uncertain',jsonb_build_object('error',left(coalesce(p_error_message,''),1000)));
  RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.mark_communication_delivery_uncertain_worker(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mark_communication_delivery_uncertain_worker(uuid,text) TO service_role;

-- Final worker failure must update delivery state; retryable failures return to pending.
CREATE OR REPLACE FUNCTION public.fail_communication_delivery_worker(
  p_outbox_id uuid,
  p_error_message text,
  p_retry boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,private AS $$
DECLARE v_attempts integer; v_max integer; v_status text;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
  SELECT attempt_count,max_attempts,status INTO v_attempts,v_max,v_status
  FROM public.communication_outbox WHERE id=p_outbox_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Message not found'; END IF;
  IF v_status <> 'queued' THEN RAISE EXCEPTION 'Only queued messages can fail'; END IF;
  IF p_retry AND v_attempts < v_max THEN
    UPDATE public.communication_outbox
    SET next_attempt_at=now()+make_interval(secs=>least(3600,greatest(60,30*power(2,greatest(v_attempts-1,0))::integer))),
        locked_at=NULL,error_message=nullif(trim(p_error_message),''),delivery_status='pending'
    WHERE id=p_outbox_id;
    v_status:='queued';
  ELSE
    UPDATE public.communication_outbox
    SET status='failed',locked_at=NULL,error_message=nullif(trim(p_error_message),''),delivery_status='failed'
    WHERE id=p_outbox_id;
    v_status:='failed';
  END IF;
  RETURN jsonb_build_object('status',v_status,'attempt_count',v_attempts,'max_attempts',v_max);
END; $$;
REVOKE ALL ON FUNCTION public.fail_communication_delivery_worker(uuid,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fail_communication_delivery_worker(uuid,text,boolean) TO service_role;

-- COMM-03: strict inbound identity resolution. A duplicate customer match is ambiguous,
-- never an excuse to choose the oldest customer.
ALTER TABLE public.communication_inbound
  ADD COLUMN IF NOT EXISTS match_status text NOT NULL DEFAULT 'unmatched'
    CHECK (match_status IN ('matched','unmatched','ambiguous')),
  ADD COLUMN IF NOT EXISTS match_reason text,
  ADD COLUMN IF NOT EXISTS matched_at timestamptz;
CREATE INDEX IF NOT EXISTS communication_inbound_match_status_idx
  ON public.communication_inbound(match_status,received_at DESC);

UPDATE public.communication_inbound
SET match_status=CASE WHEN customer_id IS NULL THEN 'unmatched' ELSE 'matched' END,
    match_reason=CASE WHEN customer_id IS NULL THEN 'legacy_or_unresolved' ELSE 'legacy_unique_match' END,
    matched_at=CASE WHEN customer_id IS NULL THEN NULL ELSE coalesce(processed_at,received_at) END
WHERE match_status='unmatched' AND (customer_id IS NOT NULL OR processed_at IS NOT NULL);

CREATE OR REPLACE FUNCTION public.record_inbound_communication_worker(
  p_provider text,
  p_channel text,
  p_sender text,
  p_recipient text DEFAULT NULL,
  p_subject text DEFAULT NULL,
  p_message text DEFAULT NULL,
  p_provider_message_id text DEFAULT NULL,
  p_conversation_id text DEFAULT NULL,
  p_media_url text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  v_id uuid; v_customer_id uuid; v_match_count integer:=0; v_match_status text:='unmatched'; v_match_reason text:='no_customer_match';
  v_normalized text;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
  IF p_channel NOT IN ('email','sms','whatsapp') THEN RAISE EXCEPTION 'Invalid inbound channel'; END IF;
  IF nullif(trim(coalesce(p_sender,'')),'') IS NULL OR nullif(trim(coalesce(p_message,'')),'') IS NULL THEN RAISE EXCEPTION 'Inbound sender and message are required'; END IF;

  IF p_channel='email' THEN
    SELECT count(*), min(id) INTO v_match_count,v_customer_id
    FROM public.customers WHERE lower(trim(coalesce(email,'')))=lower(trim(p_sender));
    IF v_match_count=1 THEN v_match_status:='matched'; v_match_reason:='unique_email_match';
    ELSIF v_match_count>1 THEN v_customer_id:=NULL; v_match_status:='ambiguous'; v_match_reason:='duplicate_email_match'; END IF;
  ELSE
    v_normalized:=public.normalize_customer_phone(p_sender);
    IF v_normalized IS NOT NULL THEN
      SELECT count(*), min(id) INTO v_match_count,v_customer_id
      FROM public.customers WHERE public.normalize_customer_phone(phone)=v_normalized;
      IF v_match_count=1 THEN v_match_status:='matched'; v_match_reason:='unique_phone_match';
      ELSIF v_match_count>1 THEN v_customer_id:=NULL; v_match_status:='ambiguous'; v_match_reason:='duplicate_phone_match'; END IF;
    ELSE
      v_customer_id:=NULL; v_match_status:='unmatched'; v_match_reason:='invalid_phone_format';
    END IF;
  END IF;

  INSERT INTO public.communication_inbound(customer_id,channel,sender,recipient,subject,message,provider,provider_message_id,conversation_id,media_url,payload,match_status,match_reason,matched_at)
  VALUES(v_customer_id,p_channel,trim(p_sender),nullif(trim(p_recipient),''),nullif(trim(p_subject),''),trim(p_message),p_provider,p_provider_message_id,p_conversation_id,p_media_url,coalesce(p_payload,'{}'::jsonb),v_match_status,v_match_reason,CASE WHEN v_match_status='matched' THEN now() ELSE NULL END)
  ON CONFLICT (provider,channel,provider_message_id) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL AND p_provider_message_id IS NOT NULL THEN
    SELECT id INTO v_id FROM public.communication_inbound WHERE provider=p_provider AND channel=p_channel AND provider_message_id=p_provider_message_id LIMIT 1;
  END IF;
  IF v_id IS NULL THEN RETURN NULL; END IF;

  IF v_match_status='matched' AND EXISTS (SELECT 1 FROM public.communication_inbound WHERE id=v_id AND processed_at IS NULL) THEN
    INSERT INTO public.customer_communications(customer_id,channel,direction,subject,message,status,external_reference,created_at)
    VALUES(v_customer_id,p_channel,'inbound',nullif(trim(p_subject),''),trim(p_message),'logged',coalesce(p_provider_message_id,p_conversation_id),now());
    INSERT INTO public.notification_events(event_type,entity_type,entity_id,customer_id,title,message,severity,audience,metadata)
    VALUES('communication.inbound','communication',v_id,v_customer_id,'Customer response received',left(trim(p_message),500),'info','staff',jsonb_build_object('channel',p_channel,'provider',p_provider,'sender',p_sender,'match_status',v_match_status));
  ELSE
    INSERT INTO public.notification_events(event_type,entity_type,entity_id,customer_id,title,message,severity,audience,metadata)
    VALUES('communication.inbound.review','communication',v_id,NULL,
      CASE WHEN v_match_status='ambiguous' THEN 'Ambiguous customer response requires review' ELSE 'Unmatched customer response requires review' END,
      left(trim(p_message),500),'warning','staff',jsonb_build_object('channel',p_channel,'provider',p_provider,'sender',p_sender,'match_status',v_match_status,'match_reason',v_match_reason));
  END IF;

  UPDATE public.communication_inbound SET processed_at=now() WHERE id=v_id;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.record_inbound_communication_worker(text,text,text,text,text,text,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_inbound_communication_worker(text,text,text,text,text,text,text,text,text,jsonb) TO service_role;

COMMENT ON TABLE public.communication_event_catalog IS 'Canonical Topline communications event inventory. Wired events are backed by current database triggers; catalog_only events are explicit future routing gaps.';
COMMENT ON TABLE public.communication_delivery_state_transitions IS 'Monotonic delivery-state audit trail. Lower-strength provider callbacks cannot overwrite stronger states.';
COMMENT ON COLUMN public.communication_inbound.match_status IS 'Strict identity resolution: matched only on exactly one customer; ambiguous matches are never auto-assigned.';
