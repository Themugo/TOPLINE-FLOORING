-- Tax & accounting: one configurable tax setting (default Kenya VAT 16%) and an itemised money breakdown on receipts and emails.
-- Shop prices are VAT-inclusive, so an order total never changes: the VAT contained in it is shown, not added.
-- Invoices and quotations keep adding VAT on top of the net amount, using the configured rate as their default.

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS site_settings_public_read ON public.site_settings;
CREATE POLICY site_settings_public_read ON public.site_settings FOR SELECT TO anon, authenticated
  USING (setting_key IN ('custom_css','tax_settings'));

INSERT INTO public.site_settings(setting_key, setting_value)
VALUES ('tax_settings', '{"enabled":true,"label":"VAT","rate":16,"tax_pin":"","show_pin_on_documents":true}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

CREATE OR REPLACE FUNCTION private.tax_settings() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('enabled', true, 'label', 'VAT', 'rate', 16, 'tax_pin', '', 'show_pin_on_documents', true)
         || coalesce((SELECT setting_value FROM public.site_settings WHERE setting_key = 'tax_settings'), '{}'::jsonb);
$$;
REVOKE ALL ON FUNCTION private.tax_settings() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.order_breakdown_text(p_subtotal numeric, p_discount numeric, p_delivery numeric, p_total numeric)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, private AS $$
DECLARE t jsonb := private.tax_settings(); v_rate numeric := coalesce((t->>'rate')::numeric, 0); v_vat numeric; v_out text;
  f text := 'FM999,999,990.00';
BEGIN
  v_out := 'Items subtotal: KES ' || to_char(coalesce(p_subtotal, 0), f);
  IF coalesce(p_discount, 0) > 0 THEN v_out := v_out || E'\nDiscount: -KES ' || to_char(p_discount, f); END IF;
  IF coalesce(p_delivery, 0) > 0 THEN v_out := v_out || E'\nDelivery: KES ' || to_char(p_delivery, f); END IF;
  v_out := v_out || E'\nTotal: KES ' || to_char(coalesce(p_total, 0), f);
  IF coalesce((t->>'enabled')::boolean, true) AND v_rate > 0 THEN
    v_vat := round(coalesce(p_total, 0) * v_rate / (100 + v_rate), 2);
    v_out := v_out || E'\nAmount before ' || (t->>'label') || ': KES ' || to_char(coalesce(p_total, 0) - v_vat, f)
                   || E'\n' || (t->>'label') || ' (' || (v_rate::numeric)::text || '%, included in total): KES ' || to_char(v_vat, f);
  END IF;
  RETURN v_out;
END $$;
REVOKE ALL ON FUNCTION private.order_breakdown_text(numeric, numeric, numeric, numeric) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.tax_pin_footer() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  SELECT CASE WHEN coalesce((private.tax_settings()->>'show_pin_on_documents')::boolean, true) AND nullif(trim(private.tax_settings()->>'tax_pin'), '') IS NOT NULL
              THEN E'\nKRA PIN: ' || trim(private.tax_settings()->>'tax_pin') ELSE '' END;
$$;
REVOKE ALL ON FUNCTION private.tax_pin_footer() FROM PUBLIC, anon, authenticated;

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
      format(E'Hello %s,\n\nThank you. We have received your payment.\n\nOrder: %s\n\nORDER SUMMARY\n%s\n\nPAYMENT\nAmount received: KES %s\nMethod: %s\nReference: %s\nBalance remaining: KES %s\n\nYou can follow your order at %s/track-order\n\nTOPLINE Flooring & Waterproofing%s',
        coalesce(nullif(private.sanitize_inline_text(o.customer_name, 60), ''), 'there'), v_ref,
        private.order_breakdown_text(o.subtotal,o.discount_amount,o.delivery_charge,o.total_amount), v_amount,
        coalesce(NEW.method, 'payment'), coalesce(nullif(NEW.provider_reference, ''), nullif(NEW.provider_transaction_id, ''), 'n/a'),
        to_char(v_balance, 'FM999,999,990.00'), private.topline_site_url(), private.tax_pin_footer()));
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
