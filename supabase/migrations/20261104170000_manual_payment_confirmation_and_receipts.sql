-- Manual payment confirmation by staff + receipts, resend, and duplicate-reference guard.
-- Manual (bank / M-Pesa paybill / till / cash) and automatic (Daraja, card webhooks) payments land in the SAME ledger
-- (payment_transactions). Receipts, stock conversion and order status all hang off that ledger, so both channels work together.

CREATE OR REPLACE FUNCTION private.queue_payment_receipt(p_payment_id uuid, p_key text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE
  t public.payment_transactions%ROWTYPE; o public.orders%ROWTYPE; v_ref text; v_paid numeric; v_balance numeric; v_amount text; v_ok boolean := false;
BEGIN
  SELECT * INTO t FROM public.payment_transactions WHERE id = p_payment_id AND status = 'successful';
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT * INTO o FROM public.orders WHERE id = t.order_id;
  IF o.id IS NULL THEN RETURN false; END IF;
  v_ref := coalesce(o.order_number, upper(substr(replace(o.id::text, '-', ''), 1, 8)));
  v_amount := to_char(t.amount, 'FM999,999,990.00');
  SELECT coalesce(sum(amount), 0) INTO v_paid FROM public.payment_transactions WHERE order_id = t.order_id AND status = 'successful';
  v_balance := greatest(coalesce(o.total_amount, 0) - v_paid, 0);
  v_ok := private.queue_customer_email(o.customer_id, o.customer_email, p_key,
      'Payment received - ' || v_ref,
      format(E'Hello %s,\n\nThank you. We have received your payment.\n\nOrder: %s\n\nORDER SUMMARY\n%s\n\nPAYMENT\nAmount received: KES %s\nMethod: %s\nReference: %s\nBalance remaining: KES %s\n\nYou can follow your order at %s/track-order\n\nTOPLINE Flooring & Waterproofing%s',
        coalesce(nullif(private.sanitize_inline_text(o.customer_name, 60), ''), 'there'), v_ref,
        private.order_breakdown_text(o.subtotal,o.discount_amount,o.delivery_charge,o.total_amount), v_amount,
        coalesce(t.method, 'payment'), coalesce(nullif(t.provider_reference, ''), nullif(t.provider_transaction_id, ''), 'n/a'),
        to_char(v_balance, 'FM999,999,990.00'), private.topline_site_url(), private.tax_pin_footer()));
  RETURN v_ok;
END $$;
REVOKE ALL ON FUNCTION private.queue_payment_receipt(uuid, text) FROM PUBLIC, anon, authenticated;

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
    PERFORM private.queue_payment_receipt(NEW.id, 'payment-receipt:' || NEW.id::text);
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

CREATE OR REPLACE FUNCTION public.confirm_manual_order_payment(
  p_order_id uuid, p_amount numeric, p_method text, p_reference text DEFAULT NULL, p_received_into text DEFAULT NULL, p_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE
  v_ref text := nullif(upper(btrim(coalesce(p_reference, ''))), '');
  v_order public.orders%ROWTYPE; v_res jsonb; v_pid uuid; v_paid numeric; v_dup text; v_queued boolean;
BEGIN
  PERFORM private.require_staff_permission('finance', 'update');
  IF p_method NOT IN ('bank_transfer', 'mpesa', 'cash', 'cheque') THEN RAISE EXCEPTION 'Choose how the money was received (bank transfer, M-Pesa, cash or cheque)'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Enter the amount received'; END IF;
  IF p_method <> 'cash' AND (v_ref IS NULL OR length(v_ref) < 4) THEN RAISE EXCEPTION 'Enter the bank or M-Pesa reference exactly as it appears on the statement'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_ref IS NOT NULL THEN
    SELECT o.order_number INTO v_dup FROM public.payment_transactions pt JOIN public.orders o ON o.id = pt.order_id
     WHERE pt.status = 'successful' AND (upper(pt.provider_reference) = v_ref OR upper(pt.provider_transaction_id) = v_ref) LIMIT 1;
    IF FOUND THEN RAISE EXCEPTION 'The reference % was already recorded on order %. A payment can only be confirmed once.', v_ref, coalesce(v_dup, 'another order'); END IF;
  END IF;
  v_res := public.record_order_payment_transaction(p_order_id, p_amount, p_method, v_ref, 'manual', NULL,
    'manual:' || p_order_id::text || ':' || coalesce(v_ref, md5(random()::text || clock_timestamp()::text)),
    left(concat_ws(' | ', 'Confirmed by staff', nullif(btrim(coalesce(p_received_into, '')), '') , nullif(btrim(coalesce(p_notes, '')), '')), 500));
  v_pid := nullif(v_res->>'payment_id', '')::uuid;
  SELECT coalesce(sum(amount), 0) INTO v_paid FROM public.payment_transactions WHERE order_id = p_order_id AND status = 'successful';
  v_queued := v_pid IS NOT NULL AND EXISTS (SELECT 1 FROM public.communication_outbox WHERE dedupe_key = 'payment-receipt:' || v_pid::text);
  RETURN v_res || jsonb_build_object('receipt_emailed', v_queued, 'customer_email', v_order.customer_email,
    'paid_amount', v_paid, 'balance', greatest(v_order.total_amount - v_paid, 0));
END $$;
REVOKE ALL ON FUNCTION public.confirm_manual_order_payment(uuid, numeric, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_manual_order_payment(uuid, numeric, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.resend_payment_receipt(p_payment_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_ok boolean;
BEGIN
  PERFORM private.require_staff_permission('finance', 'update');
  v_ok := private.queue_payment_receipt(p_payment_id, 'payment-receipt-resend:' || p_payment_id::text || ':' || floor(extract(epoch FROM clock_timestamp()))::text);
  IF NOT v_ok THEN RAISE EXCEPTION 'No receipt could be queued. Check that the buyer has a valid email and has not opted out.'; END IF;
  RETURN jsonb_build_object('success', true);
END $$;
REVOKE ALL ON FUNCTION public.resend_payment_receipt(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resend_payment_receipt(uuid) TO authenticated;
