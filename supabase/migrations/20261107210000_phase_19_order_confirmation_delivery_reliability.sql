-- Phase 19 — restore the order -> customer event -> durable outbox path and expose delivery evidence.
-- The 2026-10-04 runtime SQL repair replaced emit_customer_journey_event() but omitted its
-- queue_customer_notification_for_event() call. Order rows therefore created in-app events
-- without creating the email/SMS/WhatsApp outbox records. Restore the call in the final function.

-- Order status confirmations are transactional, not marketing. Keep their email route enabled
-- when a customer disables optional email notifications; hard-bounce/invalid/spam suppression
-- remains enforced by the delivery worker.
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
      v_message:=format(E'Hello %s, thank you for your order. We have received it.\n\nOrder: %s\n\n%s\n\nPayment method: %s\n\nTrack your order here: %s/track-order',
        coalesce(nullif(private.sanitize_inline_text(c.name,60),''),'Customer'), coalesce(o.order_number,'n/a'),
        private.order_breakdown_text(o.subtotal,o.discount_amount,o.delivery_charge,o.total_amount), coalesce(nullif(private.sanitize_inline_text(o.payment_method,40),''),'not chosen yet'), private.topline_site_url());
      IF o.payment_method='bank_transfer' THEN
        v_message:=v_message||E'\n\n'||private.manual_payment_instructions_text(coalesce(o.order_number,''));
      END IF;
    END IF;
  END IF;

  -- Order confirmations/status changes are transactional; keep them enabled even if optional email notifications are off.
  IF r.email_enabled AND (pref.email_enabled OR p_event_type = 'order.status') AND nullif(trim(c.email),'') IS NOT NULL THEN
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
  v_channels := (CASE WHEN r.email_enabled AND (pref.email_enabled OR p_event_type = 'order.status') AND nullif(trim(c.email),'') IS NOT NULL THEN 1 ELSE 0 END)
              + (CASE WHEN v_sms_on AND r.sms_enabled AND pref.sms_enabled AND nullif(public.normalize_customer_phone(c.phone),'') IS NOT NULL THEN 1 ELSE 0 END)
              + (CASE WHEN v_wa_on AND r.whatsapp_enabled AND pref.whatsapp_enabled AND nullif(public.normalize_customer_phone(c.phone),'') IS NOT NULL THEN 1 ELSE 0 END);
  v_status:=CASE WHEN v_count>0 THEN CASE WHEN v_count<v_channels THEN 'partially_queued' ELSE 'queued' END ELSE 'suppressed' END;
  INSERT INTO public.communication_workflow_events(event_key,event_type,entity_id,customer_id,status,queued_count,metadata)
  VALUES(v_key,p_event_type,p_entity_id,p_customer_id,v_status,v_count,jsonb_build_object('configured_channels',v_channels,'status',p_status));
  RETURN v_count;
END; $function$;


CREATE OR REPLACE FUNCTION public.emit_customer_journey_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  cid uuid;
  old_status text;
  new_status text;
  et text;
  entity text := TG_TABLE_NAME;
  eid uuid := NEW.id;
  v_match_count integer := 0;
BEGIN
  IF TG_TABLE_NAME = 'orders' THEN
    cid := NEW.customer_id;
    -- Older/manual order rows may not have customer_id. Resolve only an unambiguous exact
    -- email match; never choose an arbitrary customer when duplicate addresses exist.
    IF cid IS NULL AND nullif(trim(NEW.customer_email), '') IS NOT NULL THEN
      SELECT count(*), (array_agg(c.id))[1]
        INTO v_match_count, cid
        FROM public.customers c
       WHERE lower(trim(c.email)) = lower(trim(NEW.customer_email));
      IF v_match_count <> 1 THEN cid := NULL; END IF;
    END IF;
    new_status := NEW.status;
    et := 'order.status';
  ELSIF TG_TABLE_NAME = 'quotations' THEN
    SELECT count(*), (array_agg(c.id))[1]
      INTO v_match_count, cid
      FROM public.customers c
     WHERE lower(trim(c.email)) = lower(trim(NEW.email));
    IF v_match_count <> 1 THEN cid := NULL; END IF;
    new_status := NEW.status;
    et := 'quotation.status';
  ELSIF TG_TABLE_NAME = 'projects' THEN
    cid := NEW.customer_id;
    new_status := NEW.status;
    et := 'project.status';
  ELSIF TG_TABLE_NAME = 'invoices' THEN
    cid := NEW.customer_id;
    new_status := NEW.status;
    et := 'invoice.status';
  ELSE
    RAISE EXCEPTION 'Unsupported customer journey trigger table: %', TG_TABLE_NAME;
  END IF;

  IF TG_OP = 'UPDATE' THEN old_status := OLD.status; END IF;
  IF TG_OP = 'UPDATE' AND old_status IS NOT DISTINCT FROM new_status THEN RETURN NEW; END IF;

  INSERT INTO public.notification_events(
    event_type, entity_type, entity_id, customer_id, title, message, severity, audience, metadata
  ) VALUES (
    et,
    entity,
    eid,
    cid,
    initcap(replace(entity, '_', ' ')) || ' update',
    CASE WHEN old_status IS NULL
      THEN initcap(replace(entity, '_', ' ')) || ' created.'
      ELSE initcap(replace(entity, '_', ' ')) || ' changed from ' || coalesce(old_status, 'new') || ' to ' || coalesce(new_status, 'updated') || '.'
    END,
    CASE WHEN new_status IN ('cancelled', 'lost') THEN 'warning'
         WHEN new_status IN ('completed', 'paid', 'won') THEN 'success'
         ELSE 'info' END,
    'both',
    jsonb_build_object('old_status', old_status, 'new_status', new_status, 'customer_match_count', v_match_count)
  );

  -- This call is essential: in-app notification_events alone do not send customer email.
  -- queue_customer_notification_for_event applies the canonical rules/preferences, creates
  -- idempotent outbox rows, and records a workflow event in the same database transaction.
  IF cid IS NOT NULL THEN
    PERFORM public.queue_customer_notification_for_event(et, eid, cid, new_status);
  END IF;

  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.emit_customer_journey_event() FROM PUBLIC, anon, authenticated;

-- Staff order detail uses this read-only RPC to distinguish queued, provider-accepted,
-- delivered, failed and suppressed communications for this exact order.
CREATE OR REPLACE FUNCTION public.get_order_communication_delivery_360(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_rows jsonb;
BEGIN
  PERFORM private.require_staff_permission('orders', 'select');
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', o.id,
      'channel', o.channel,
      'recipient', o.recipient,
      'subject', o.subject,
      'status', o.status,
      'delivery_status', o.delivery_status,
      'attempt_count', o.attempt_count,
      'max_attempts', o.max_attempts,
      'next_attempt_at', o.next_attempt_at,
      'last_attempt_at', o.last_attempt_at,
      'sent_at', o.sent_at,
      'provider', o.provider,
      'provider_message_id', o.provider_message_id,
      'error_message', o.error_message,
      'created_at', o.created_at
    ) ORDER BY o.created_at DESC
  ), '[]'::jsonb)
    INTO v_rows
    FROM public.communication_outbox o
   WHERE o.dedupe_key LIKE 'order.status:' || p_order_id::text || ':%';

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'order_number', v_order.order_number,
    'customer_email', v_order.customer_email,
    'communications', v_rows,
    'retrieved_at', now()
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.get_order_communication_delivery_360(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_order_communication_delivery_360(uuid) TO authenticated;
COMMENT ON FUNCTION public.get_order_communication_delivery_360(uuid) IS
  'Staff-only order communication evidence. Provider acceptance is not represented as final delivery.';
