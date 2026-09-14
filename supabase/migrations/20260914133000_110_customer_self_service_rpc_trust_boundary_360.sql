-- Customer Self-Service RPC / Public Trust Boundary 360
-- Migration 110: customer identity binding, RPC isolation, replay binding,
-- public-input hardening, and customer-owned authorization.

CREATE OR REPLACE FUNCTION public.link_customer_portal_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  matched_customer uuid;
  matched_count integer;
  existing_customer uuid;
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN RETURN NEW; END IF;
  SELECT c.id, count(*) OVER () INTO matched_customer, matched_count
    FROM public.customers c
   WHERE lower(trim(c.email)) = lower(trim(NEW.email))
   ORDER BY c.created_at ASC LIMIT 1;
  IF matched_count <> 1 OR matched_customer IS NULL THEN RETURN NEW; END IF;
  SELECT cpa.customer_id INTO existing_customer FROM public.customer_portal_access cpa
   WHERE cpa.auth_user_id=NEW.id AND cpa.is_active=true LIMIT 1;
  IF existing_customer IS NOT NULL THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.customer_portal_access cpa WHERE cpa.customer_id=matched_customer AND cpa.is_active=true) THEN RETURN NEW; END IF;
  INSERT INTO public.customer_portal_access(customer_id,auth_user_id,is_active,last_login)
  VALUES(matched_customer,NEW.id,true,now()) ON CONFLICT(customer_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_customer_portal ON auth.users;
CREATE TRIGGER on_auth_user_customer_portal
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.link_customer_portal_user();

CREATE UNIQUE INDEX IF NOT EXISTS customer_portal_access_active_user_uidx
  ON public.customer_portal_access(auth_user_id) WHERE is_active=true;

ALTER FUNCTION public.get_current_customer_id() SET search_path = '';
ALTER FUNCTION public.get_customer_portal_data() SET search_path = '';
ALTER FUNCTION public.get_customer_journey() SET search_path = '';
ALTER FUNCTION public.get_customer_maintenance_plans_360() SET search_path = '';
ALTER FUNCTION public.get_customer_portal_360() SET search_path = '';
ALTER FUNCTION public.get_customer_portal_documents() SET search_path = '';
ALTER FUNCTION public.get_customer_portal_preferences() SET search_path = '';
ALTER FUNCTION public.submit_service_case_feedback(uuid,integer,text) SET search_path = '';
ALTER FUNCTION public.update_customer_notification_preferences(boolean,boolean,boolean,boolean,boolean) SET search_path = '';
ALTER FUNCTION public.update_customer_notification_preferences(uuid,boolean,boolean,boolean,boolean,boolean) SET search_path = '';
ALTER FUNCTION public.create_service_case(uuid,text,text,text,text,uuid,uuid) SET search_path = '';
ALTER FUNCTION public.submit_quotation_request(text,text,text,text,text,text,text,text,text) SET search_path = '';
ALTER FUNCTION public.track_order_public(text,text) SET search_path = '';

CREATE OR REPLACE FUNCTION public.create_secure_customer_order(
  p_name text,
  p_email text,
  p_phone text,
  p_items jsonb,
  p_notes text DEFAULT '',
  p_coupon_id uuid DEFAULT NULL,
  p_delivery_zone_id uuid DEFAULT NULL,
  p_delivery_address text DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

-- Public quotation intake remains unauthenticated but is bounded against oversized payload abuse.
CREATE OR REPLACE FUNCTION public.submit_quotation_request(
  p_name text,p_email text,p_phone text,p_county text DEFAULT NULL,p_project_type text DEFAULT NULL,p_service text DEFAULT NULL,p_message text DEFAULT NULL,p_budget_range text DEFAULT NULL,p_timeline text DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_lead_id uuid; v_quotation_id uuid;
BEGIN
  IF length(trim(coalesce(p_name,''))) NOT BETWEEN 2 AND 200 THEN RETURN json_build_object('success',false,'error','Invalid name'); END IF;
  IF trim(coalesce(p_email,'')) !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN RETURN json_build_object('success',false,'error','Invalid email'); END IF;
  IF length(trim(coalesce(p_phone,''))) NOT BETWEEN 3 AND 30 THEN RETURN json_build_object('success',false,'error','Invalid phone number'); END IF;
  IF length(coalesce(p_county,''))>120 OR length(coalesce(p_project_type,''))>120 OR length(coalesce(p_service,''))>160 OR length(coalesce(p_budget_range,''))>120 OR length(coalesce(p_timeline,''))>120 OR length(coalesce(p_message,''))>5000 THEN RETURN json_build_object('success',false,'error','Quotation request is too long'); END IF;
  INSERT INTO public.leads(name,company,email,phone,source,status,budget_range,project_location,notes)
  VALUES(trim(p_name),NULL,lower(trim(p_email)),trim(p_phone),'website','new',nullif(trim(coalesce(p_budget_range,'')),''),nullif(trim(coalesce(p_county,'')),''),nullif(trim(coalesce(p_message,'')),'')) RETURNING id INTO v_lead_id;
  INSERT INTO public.quotations(name,email,phone,project_type,service,location,county,budget_range,timeline,message,status,lead_id)
  VALUES(trim(p_name),lower(trim(p_email)),trim(p_phone),nullif(trim(coalesce(p_project_type,'')),''),nullif(trim(coalesce(p_service,'')),''),nullif(trim(coalesce(p_county,'')),''),nullif(trim(coalesce(p_county,'')),''),nullif(trim(coalesce(p_budget_range,'')),''),nullif(trim(coalesce(p_timeline,'')),''),nullif(trim(coalesce(p_message,'')),''),'new',v_lead_id) RETURNING id INTO v_quotation_id;
  UPDATE public.leads SET converted_quotation_id=v_quotation_id WHERE id=v_lead_id;
  RETURN json_build_object('success',true,'lead_id',v_lead_id,'quotation_id',v_quotation_id);
END; $$;
REVOKE ALL ON FUNCTION public.submit_quotation_request(text,text,text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quotation_request(text,text,text,text,text,text,text,text,text) TO anon,authenticated;

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quotations_portal_self_select ON public.quotations;
CREATE POLICY quotations_portal_self_select ON public.quotations FOR SELECT TO authenticated USING (
  customer_id=public.get_current_customer_id()
  OR (customer_id IS NULL AND lower(email)=lower((SELECT c.email FROM public.customers c WHERE c.id=public.get_current_customer_id())))
);

CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text,p_order_total numeric DEFAULT 0)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_coupon record; v_discount numeric(12,2); v_total numeric(12,2);
BEGIN
  v_total:=greatest(coalesce(p_order_total,0),0);
  IF length(trim(coalesce(p_code,'')))<1 OR length(trim(p_code))>50 THEN RETURN json_build_object('valid',false,'error','Invalid coupon code'); END IF;
  SELECT * INTO v_coupon FROM public.coupons WHERE upper(code)=upper(trim(p_code)) AND is_active=true AND (start_date IS NULL OR start_date<=now()) AND (end_date IS NULL OR end_date>now()) AND (max_uses IS NULL OR current_uses<max_uses);
  IF v_coupon IS NULL THEN RETURN json_build_object('valid',false,'error','Invalid or expired coupon'); END IF;
  IF coalesce(v_coupon.min_order_value,0)>v_total THEN RETURN json_build_object('valid',false,'error','Minimum order value is not met'); END IF;
  IF v_coupon.coupon_type='percentage' THEN v_discount:=round(v_total*(v_coupon.discount_value/100),2); ELSE v_discount:=least(v_coupon.discount_value,v_total); END IF;
  v_discount:=greatest(v_discount,0);
  RETURN json_build_object('valid',true,'coupon_id',v_coupon.id,'discount_type',v_coupon.coupon_type,'discount_value',v_coupon.discount_value,'discount_amount',v_discount,'code',v_coupon.code);
END; $$;
REVOKE ALL ON FUNCTION public.validate_coupon(text,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text,numeric) TO anon,authenticated;

COMMENT ON FUNCTION public.link_customer_portal_user() IS 'Customer portal identity binding: verified email only, unique customer match only, never automatic rebinding.';
COMMENT ON INDEX public.customer_portal_access_active_user_uidx IS 'Prevents one active Auth identity from being linked to multiple customer profiles.';
