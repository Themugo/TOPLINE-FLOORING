-- TOPLINE 2026-10-16 audit, part 2: outbound message abuse guards and stock-hoarding limit.
--
-- Findings fixed here (reproduced against a database built from every earlier migration):
--  1. Any visitor can place a guest order with an email address and phone number nobody verifies. Each order
--     queued email, SMS and WhatsApp messages from Topline to those details, greeting by a name the visitor chose
--     (links and line breaks included). That is a phishing channel and a way to run up SMS charges.
--  2. Guest orders had no limit, and each one reserves stock for 24 hours, so a script could reserve the whole
--     catalogue and keep real customers from buying.
-- This migration is separate from 20261016090000 so an environment that already applied that file still gets it.

-- 1a. Names placed in notification templates are flattened to one line, stripped of links, and length-limited.
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
BEGIN
  IF p_customer_id IS NULL THEN RETURN 0; END IF;
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
  INSERT INTO public.customer_notification_preferences(customer_id) VALUES(p_customer_id) ON CONFLICT DO NOTHING;
  SELECT * INTO pref FROM public.customer_notification_preferences WHERE customer_id=p_customer_id;
  v_subject:=replace(r.subject_template,'{{status}}',coalesce(p_status,'updated'));
  v_message:=replace(replace(r.message_template,'{{status}}',coalesce(p_status,'updated')),'{{customer_name}}',coalesce(nullif(private.sanitize_inline_text(c.name,60),''),'Customer'));

  IF r.email_enabled AND pref.email_enabled AND nullif(trim(c.email),'') IS NOT NULL THEN
    INSERT INTO public.communication_outbox(customer_id,channel,recipient,subject,message,dedupe_key)
    VALUES(p_customer_id,'email',trim(c.email),v_subject,v_message,v_key||':email') ON CONFLICT DO NOTHING;
    IF FOUND THEN v_count:=v_count+1; END IF;
  END IF;
  IF r.sms_enabled AND pref.sms_enabled AND nullif(public.normalize_customer_phone(c.phone),'') IS NOT NULL THEN
    INSERT INTO public.communication_outbox(customer_id,channel,recipient,message,dedupe_key)
    VALUES(p_customer_id,'sms',public.normalize_customer_phone(c.phone),v_message,v_key||':sms') ON CONFLICT DO NOTHING;
    IF FOUND THEN v_count:=v_count+1; END IF;
  END IF;
  IF r.whatsapp_enabled AND pref.whatsapp_enabled AND nullif(public.normalize_customer_phone(c.phone),'') IS NOT NULL THEN
    INSERT INTO public.communication_outbox(customer_id,channel,recipient,subject,message,dedupe_key)
    VALUES(p_customer_id,'whatsapp',public.normalize_customer_phone(c.phone),v_subject,v_message,v_key||':whatsapp') ON CONFLICT DO NOTHING;
    IF FOUND THEN v_count:=v_count+1; END IF;
  END IF;
  v_channels := (CASE WHEN r.email_enabled AND pref.email_enabled AND nullif(trim(c.email),'') IS NOT NULL THEN 1 ELSE 0 END)
              + (CASE WHEN r.sms_enabled AND pref.sms_enabled AND nullif(public.normalize_customer_phone(c.phone),'') IS NOT NULL THEN 1 ELSE 0 END)
              + (CASE WHEN r.whatsapp_enabled AND pref.whatsapp_enabled AND nullif(public.normalize_customer_phone(c.phone),'') IS NOT NULL THEN 1 ELSE 0 END);
  v_status:=CASE WHEN v_count>0 THEN CASE WHEN v_count<v_channels THEN 'partially_queued' ELSE 'queued' END ELSE 'suppressed' END;
  INSERT INTO public.communication_workflow_events(event_key,event_type,entity_id,customer_id,status,queued_count,metadata)
  VALUES(v_key,p_event_type,p_entity_id,p_customer_id,v_status,v_count,jsonb_build_object('configured_channels',v_channels,'status',p_status));
  RETURN v_count;
END; $function$;

-- 1b. Volume guard on every automated message. Over a limit the row is kept but cancelled, so no business flow
--     fails and the audit trail stays. Staff-sent messages, conversation replies and staff alert emails are exempt.
CREATE OR REPLACE FUNCTION public.guard_outbound_message_volume()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE
  v_limit integer;
  v_count integer;
BEGIN
  IF NEW.created_by IS NOT NULL
     OR NEW.conversation_thread_id IS NOT NULL
     OR coalesce(NEW.dedupe_key, '') LIKE '%:admin'
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
END; $$;
REVOKE ALL ON FUNCTION public.guard_outbound_message_volume() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS communication_outbox_volume_guard ON public.communication_outbox;
CREATE TRIGGER communication_outbox_volume_guard BEFORE INSERT ON public.communication_outbox
  FOR EACH ROW EXECUTE FUNCTION public.guard_outbound_message_volume();

CREATE INDEX IF NOT EXISTS communication_outbox_channel_created_idx ON public.communication_outbox (channel, created_at DESC);

-- 2. Open unpaid orders per contact (indexed lookups for the check below).
CREATE INDEX IF NOT EXISTS orders_email_created_idx ON public.orders (lower(customer_email), created_at DESC);
CREATE INDEX IF NOT EXISTS orders_phone_created_idx ON public.orders (customer_phone, created_at DESC);

CREATE OR REPLACE FUNCTION public.create_secure_customer_order(p_name text, p_email text, p_phone text, p_items jsonb, p_notes text DEFAULT ''::text, p_coupon_id uuid DEFAULT NULL::uuid, p_delivery_zone_id uuid DEFAULT NULL::uuid, p_delivery_address text DEFAULT NULL::text, p_payment_method text DEFAULT NULL::text, p_idempotency_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_customer_id uuid;
  v_customer public.customers%ROWTYPE;
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_product public.products%ROWTYPE;
  v_variant public.product_variants%ROWTYPE;
  v_subtotal numeric(12,2) := 0;
  v_delivery_charge numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_quantity numeric(12,2);
  v_coupon public.coupons%ROWTYPE;
  v_zone public.delivery_zones%ROWTYPE;
  v_existing public.orders%ROWTYPE;
  v_product_id uuid;
  v_variant_id uuid;
  v_line_price numeric(12,2);
  v_available numeric(12,2);
  v_reserved numeric(12,2);
  v_group record;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing
      FROM public.orders
     WHERE checkout_idempotency_key = trim(p_idempotency_key)
     LIMIT 1;
    IF FOUND THEN
      IF lower(v_existing.customer_email) <> lower(trim(p_email))
         OR v_existing.customer_phone <> trim(p_phone) THEN
        RAISE EXCEPTION 'Idempotency key is already associated with another checkout';
      END IF;
      RETURN jsonb_build_object(
        'success', true,
        'order_id', v_existing.id,
        'order_number', v_existing.order_number,
        'subtotal', v_existing.subtotal,
        'delivery_charge', v_existing.delivery_charge,
        'discount_amount', v_existing.discount_amount,
        'total', v_existing.total_amount,
        'payment_status', v_existing.payment_status,
        'idempotent_replay', true
      );
    END IF;
  END IF;

  IF length(trim(coalesce(p_name,''))) < 2 OR length(trim(p_name)) > 200 THEN
    RETURN jsonb_build_object('success',false,'error','Invalid customer name');
  END IF;
  IF trim(coalesce(p_email,'')) !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RETURN jsonb_build_object('success',false,'error','Invalid customer email');
  END IF;
  IF length(trim(coalesce(p_phone,''))) < 3 OR length(trim(p_phone)) > 30 THEN
    RETURN jsonb_build_object('success',false,'error','Invalid phone number');
  END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items)=0 THEN
    RETURN jsonb_build_object('success',false,'error','Cart is empty');
  END IF;
  IF jsonb_array_length(p_items)>100 THEN
    RETURN jsonb_build_object('success',false,'error','Too many cart items');
  END IF;

  -- Unpaid orders reserve stock for 24 hours. Cap how many one email address or phone number can hold
  -- open so a script cannot lock up the whole catalogue. A retry of the same checkout is answered above.
  IF (SELECT count(*) FROM public.orders o
       WHERE o.status = 'pending' AND o.payment_status = 'pending'
         AND o.created_at > now() - interval '24 hours'
         AND (lower(o.customer_email) = lower(trim(p_email)) OR o.customer_phone = trim(p_phone))) >= 5 THEN
    RETURN jsonb_build_object('success',false,'code','rate_limited',
      'error','You already have several unpaid orders open. Please complete payment on one of them, or contact us, before placing another.');
  END IF;

  -- First aggregate the cart by product + variant. This makes duplicate lines
  -- deterministic and closes the double-line reservation race inside one RPC.
  FOR v_group IN
    SELECT
      NULLIF(item->>'product_id','')::uuid AS product_id,
      NULLIF(item->>'variant_id','')::uuid AS variant_id,
      SUM((item->>'quantity')::numeric) AS quantity
    FROM jsonb_array_elements(p_items) AS item
    GROUP BY NULLIF(item->>'product_id','')::uuid,
             NULLIF(item->>'variant_id','')::uuid
  LOOP
    IF v_group.quantity IS NULL OR v_group.quantity <> trunc(v_group.quantity)
       OR v_group.quantity <= 0 OR v_group.quantity > 10000 THEN
      RETURN jsonb_build_object('success',false,'error','Invalid item quantity');
    END IF;

    SELECT * INTO v_product
      FROM public.products
     WHERE id=v_group.product_id
       AND is_active=true
       AND status IN ('active','clearance')
     FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success',false,'error','One or more products are unavailable');
    END IF;

    v_available := v_product.stock_quantity;
    v_line_price := COALESCE(v_product.sale_price,v_product.price);

    IF v_group.variant_id IS NOT NULL THEN
      SELECT * INTO v_variant
        FROM public.product_variants
       WHERE id=v_group.variant_id
         AND product_id=v_group.product_id
         AND is_active=true
       FOR UPDATE;
      IF NOT FOUND THEN
        RETURN jsonb_build_object('success',false,'error','One or more product options are unavailable');
      END IF;
      v_available := v_variant.stock_quantity;
      v_line_price := COALESCE(
        v_variant.sale_price,
        v_product.price + COALESCE(v_variant.price_adjustment,0)
      );
    END IF;

    SELECT COALESCE(SUM(r.quantity),0) INTO v_reserved
      FROM public.inventory_reservations r
     WHERE r.product_id=v_group.product_id
       AND r.variant_id IS NOT DISTINCT FROM v_group.variant_id
       AND r.status='reserved'
       AND (r.expires_at IS NULL OR r.expires_at > now());

    IF v_available < v_reserved + v_group.quantity THEN
      RETURN jsonb_build_object(
        'success',false,
        'error','Insufficient stock for ' || v_product.name ||
          CASE WHEN v_group.variant_id IS NOT NULL THEN ' (' || v_variant.variant_name || ')' ELSE '' END
      );
    END IF;

    v_subtotal := v_subtotal + (v_line_price * v_group.quantity);
  END LOOP;

  IF p_delivery_zone_id IS NOT NULL THEN
    SELECT * INTO v_zone FROM public.delivery_zones
     WHERE id=p_delivery_zone_id AND is_active=true;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success',false,'error','Selected delivery zone is unavailable');
    END IF;
    v_delivery_charge := CASE
      WHEN v_zone.free_delivery_minimum IS NOT NULL
       AND v_subtotal >= v_zone.free_delivery_minimum THEN 0
      ELSE COALESCE(v_zone.base_charge,0)
    END;
  END IF;

  IF p_coupon_id IS NOT NULL THEN
    SELECT * INTO v_coupon FROM public.coupons
     WHERE id=p_coupon_id
       AND is_active=true
       AND (start_date IS NULL OR start_date<=now())
       AND (end_date IS NULL OR end_date>now())
       AND (max_uses IS NULL OR current_uses<max_uses)
     FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success',false,'error','Coupon is invalid or expired');
    END IF;
    IF COALESCE(v_coupon.min_order_value,0)>v_subtotal THEN
      RETURN jsonb_build_object('success',false,'error','Minimum order value is not met');
    END IF;
    IF v_coupon.coupon_type='percentage' THEN
      v_discount := round(v_subtotal*(v_coupon.discount_value/100),2);
    ELSE
      v_discount := least(v_coupon.discount_value,v_subtotal);
    END IF;
  END IF;

  v_total := greatest(v_subtotal+v_delivery_charge-v_discount,0);

  v_customer_id := public.get_current_customer_id();
  IF v_customer_id IS NOT NULL THEN
    SELECT * INTO v_customer FROM public.customers WHERE id=v_customer_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Customer profile is unavailable'; END IF;
  ELSE
    INSERT INTO public.customers(name,email,phone,address)
    VALUES(trim(p_name),trim(p_email),trim(p_phone),
           nullif(trim(coalesce(p_delivery_address,'')),''))
    RETURNING id INTO v_customer_id;
  END IF;

  v_order_number := public.generate_order_number();

  INSERT INTO public.orders(
    customer_id,customer_name,customer_email,customer_phone,
    subtotal,delivery_zone_id,delivery_address,delivery_charge,
    coupon_id,discount_amount,total_amount,status,payment_status,
    notes,order_number,checkout_idempotency_key,payment_method,stock_reserved_at
  ) VALUES (
    v_customer_id,COALESCE(v_customer.name,trim(p_name)),COALESCE(v_customer.email,trim(p_email)),COALESCE(v_customer.phone,trim(p_phone)),
    v_subtotal,p_delivery_zone_id,
    nullif(trim(coalesce(p_delivery_address,'')),''),v_delivery_charge,
    p_coupon_id,v_discount,v_total,'pending','pending',
    nullif(trim(coalesce(p_notes,'')),''),v_order_number,
    nullif(trim(coalesce(p_idempotency_key,'')),''),nullif(trim(coalesce(p_payment_method,'')),''),now()
  )
  RETURNING id INTO v_order_id;

  FOR v_group IN
    SELECT
      NULLIF(item->>'product_id','')::uuid AS product_id,
      NULLIF(item->>'variant_id','')::uuid AS variant_id,
      SUM((item->>'quantity')::numeric) AS quantity
    FROM jsonb_array_elements(p_items) AS item
    GROUP BY NULLIF(item->>'product_id','')::uuid,
             NULLIF(item->>'variant_id','')::uuid
  LOOP
    SELECT * INTO v_product FROM public.products
     WHERE id=v_group.product_id AND is_active=true
     FOR UPDATE;

    v_line_price := COALESCE(v_product.sale_price,v_product.price);
    IF v_group.variant_id IS NOT NULL THEN
      SELECT * INTO v_variant FROM public.product_variants
       WHERE id=v_group.variant_id AND product_id=v_group.product_id AND is_active=true
       FOR UPDATE;
      v_line_price := COALESCE(v_variant.sale_price,v_product.price + COALESCE(v_variant.price_adjustment,0));
    END IF;

    INSERT INTO public.order_items(
      order_id,product_id,variant_id,product_name,quantity,unit,unit_price
    ) VALUES(
      v_order_id,v_product.id,v_group.variant_id,
      v_product.name || CASE WHEN v_group.variant_id IS NOT NULL THEN ' — ' || v_variant.variant_name ELSE '' END,
      v_group.quantity,v_product.unit,v_line_price
    );

    INSERT INTO public.inventory_reservations(
      order_id,product_id,variant_id,quantity,status,expires_at
    ) VALUES(
      v_order_id,v_product.id,v_group.variant_id,v_group.quantity,'reserved',now()+interval '24 hours'
    );
  END LOOP;

  IF p_coupon_id IS NOT NULL THEN
    UPDATE public.coupons SET current_uses=current_uses+1 WHERE id=p_coupon_id;
  END IF;

  RETURN jsonb_build_object(
    'success',true,'order_id',v_order_id,'order_number',v_order_number,
    'subtotal',v_subtotal,'delivery_charge',v_delivery_charge,
    'discount_amount',v_discount,'total',v_total,
    'payment_status','pending','stock_reserved',true
  );
EXCEPTION
  WHEN unique_violation THEN
    IF p_idempotency_key IS NOT NULL THEN
      SELECT * INTO v_existing FROM public.orders
       WHERE checkout_idempotency_key=trim(p_idempotency_key) LIMIT 1;
      IF FOUND THEN
        IF lower(v_existing.customer_email) <> lower(trim(p_email))
           OR v_existing.customer_phone <> trim(p_phone) THEN
          RAISE EXCEPTION 'Idempotency key is already associated with another checkout';
        END IF;
        RETURN jsonb_build_object(
          'success',true,'order_id',v_existing.id,'order_number',v_existing.order_number,
          'subtotal',v_existing.subtotal,'delivery_charge',v_existing.delivery_charge,
          'discount_amount',v_existing.discount_amount,'total',v_existing.total_amount,
          'payment_status',v_existing.payment_status,'idempotent_replay',true
        );
      END IF;
    END IF;
    RAISE;
END;
$function$;
