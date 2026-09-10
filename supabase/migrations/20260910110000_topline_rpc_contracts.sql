-- Topline canonical RPC contracts.
-- These replace the historically overloaded signatures with contracts that
-- match the normalized schema and the browser data-access layer.

DROP FUNCTION IF EXISTS public.submit_quotation_request(text,text,text,text,text,text,text,text,text);
DROP FUNCTION IF EXISTS public.submit_quotation_request(text,text,text,text,text,text,text,text);

CREATE OR REPLACE FUNCTION public.submit_quotation_request(
  p_name text,
  p_email text,
  p_phone text,
  p_county text DEFAULT NULL,
  p_project_type text DEFAULT NULL,
  p_service text DEFAULT NULL,
  p_message text DEFAULT NULL,
  p_budget_range text DEFAULT NULL,
  p_timeline text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lead_id uuid;
  v_quotation_id uuid;
BEGIN
  IF length(trim(coalesce(p_name,''))) NOT BETWEEN 2 AND 200 THEN
    RETURN json_build_object('success',false,'error','Invalid name');
  END IF;
  IF trim(coalesce(p_email,'')) !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RETURN json_build_object('success',false,'error','Invalid email');
  END IF;
  IF length(trim(coalesce(p_phone,''))) NOT BETWEEN 3 AND 30 THEN
    RETURN json_build_object('success',false,'error','Invalid phone number');
  END IF;

  INSERT INTO public.leads (name, company, email, phone, source, status, budget_range, project_location, notes)
  VALUES (
    trim(p_name), NULL, trim(p_email), trim(p_phone), 'website', 'new',
    nullif(trim(coalesce(p_budget_range,'')),''), nullif(trim(coalesce(p_county,'')),''),
    nullif(trim(coalesce(p_message,'')),'')
  )
  RETURNING id INTO v_lead_id;

  INSERT INTO public.quotations (
    name,email,phone,project_type,service,location,county,budget_range,timeline,message,status,lead_id
  ) VALUES (
    trim(p_name),trim(p_email),trim(p_phone),
    nullif(trim(coalesce(p_project_type,'')),''),
    nullif(trim(coalesce(p_service,'')),''),
    nullif(trim(coalesce(p_county,'')),''),
    nullif(trim(coalesce(p_county,'')),''),
    nullif(trim(coalesce(p_budget_range,'')),''),
    nullif(trim(coalesce(p_timeline,'')),''),
    nullif(trim(coalesce(p_message,'')),''), 'new', v_lead_id
  )
  RETURNING id INTO v_quotation_id;

  UPDATE public.leads SET converted_quotation_id = v_quotation_id WHERE id = v_lead_id;

  RETURN json_build_object('success',true,'lead_id',v_lead_id,'quotation_id',v_quotation_id);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_quotation_request(text,text,text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quotation_request(text,text,text,text,text,text,text,text,text) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.create_customer_order(text,text,text,text,decimal,jsonb,uuid,uuid,text,decimal,decimal);
DROP FUNCTION IF EXISTS public.create_customer_order(text,text,text,text,uuid,jsonb,decimal,decimal);

CREATE OR REPLACE FUNCTION public.create_customer_order(
  p_name text,
  p_email text,
  p_phone text,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_coupon_id uuid DEFAULT NULL,
  p_delivery_zone_id uuid DEFAULT NULL,
  p_delivery_address text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_customer_id uuid;
  v_order_id uuid;
  v_item jsonb;
  v_product record;
  v_variant record;
  v_subtotal numeric(12,2) := 0;
  v_delivery numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_quantity numeric;
  v_unit_price numeric(12,2);
  v_coupon record;
  v_zone record;
BEGIN
  IF length(trim(coalesce(p_name,''))) NOT BETWEEN 2 AND 200 THEN
    RETURN json_build_object('success',false,'error','Invalid customer name');
  END IF;
  IF trim(coalesce(p_email,'')) !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RETURN json_build_object('success',false,'error','Invalid customer email');
  END IF;
  IF length(trim(coalesce(p_phone,''))) NOT BETWEEN 3 AND 30 THEN
    RETURN json_build_object('success',false,'error','Invalid phone number');
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RETURN json_build_object('success',false,'error','Cart is empty');
  END IF;
  IF jsonb_array_length(p_items) > 100 THEN
    RETURN json_build_object('success',false,'error','Too many cart items');
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN v_quantity := (v_item->>'quantity')::numeric; EXCEPTION WHEN invalid_text_representation THEN RETURN json_build_object('success',false,'error','Invalid quantity'); END;
    IF v_quantity IS NULL OR v_quantity <= 0 OR v_quantity > 10000 THEN
      RETURN json_build_object('success',false,'error','Invalid quantity');
    END IF;

    SELECT p.id,p.name,p.price,p.sale_price,p.sale_start_date,p.sale_end_date,p.unit
      INTO v_product
      FROM public.products p
     WHERE p.id = NULLIF(v_item->>'product_id','')::uuid AND p.is_active AND p.status <> 'archived';
    IF v_product IS NULL THEN RETURN json_build_object('success',false,'error','One or more products are unavailable'); END IF;

    v_unit_price := v_product.price;
    IF v_product.sale_price IS NOT NULL
       AND (v_product.sale_start_date IS NULL OR v_product.sale_start_date <= now())
       AND (v_product.sale_end_date IS NULL OR v_product.sale_end_date > now()) THEN
      v_unit_price := v_product.sale_price;
    END IF;

    IF NULLIF(v_item->>'variant_id','') IS NOT NULL THEN
      SELECT * INTO v_variant FROM public.product_variants WHERE id = NULLIF(v_item->>'variant_id','')::uuid AND product_id = v_product.id AND is_active;
      IF v_variant IS NULL THEN RETURN json_build_object('success',false,'error','A selected product variant is unavailable'); END IF;
      IF v_variant.sale_price IS NOT NULL THEN v_unit_price := v_variant.sale_price;
      ELSE v_unit_price := v_unit_price + coalesce(v_variant.price_adjustment,0); END IF;
    END IF;

    v_subtotal := v_subtotal + round(v_unit_price * v_quantity,2);
  END LOOP;

  IF p_delivery_zone_id IS NOT NULL THEN
    SELECT * INTO v_zone FROM public.delivery_zones WHERE id=p_delivery_zone_id AND is_active FOR SHARE;
    IF v_zone IS NULL THEN RETURN json_build_object('success',false,'error','Selected delivery zone is unavailable'); END IF;
    v_delivery := CASE WHEN v_zone.free_delivery_minimum IS NOT NULL AND v_subtotal >= v_zone.free_delivery_minimum THEN 0 ELSE coalesce(v_zone.base_charge,0) END;
  END IF;

  IF p_coupon_id IS NOT NULL THEN
    SELECT * INTO v_coupon FROM public.coupons WHERE id=p_coupon_id AND is_active AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date > now()) AND (max_uses IS NULL OR current_uses < max_uses) FOR UPDATE;
    IF v_coupon IS NULL THEN RETURN json_build_object('success',false,'error','Coupon is invalid or expired'); END IF;
    IF coalesce(v_coupon.min_order_value,0) > v_subtotal THEN RETURN json_build_object('success',false,'error','Minimum order value is not met'); END IF;
    IF v_coupon.coupon_type='percentage' THEN v_discount := round(v_subtotal*(v_coupon.discount_value/100),2); ELSE v_discount := least(v_coupon.discount_value,v_subtotal); END IF;
    UPDATE public.coupons SET current_uses=current_uses+1 WHERE id=v_coupon.id;
  END IF;

  v_total := greatest(v_subtotal + v_delivery - v_discount,0);

  INSERT INTO public.customers(name,email,phone,address,city)
  VALUES(trim(p_name),trim(p_email),trim(p_phone),nullif(trim(coalesce(p_delivery_address,'')),''),nullif(trim(coalesce(p_delivery_address,'')),''))
  RETURNING id INTO v_customer_id;

  INSERT INTO public.orders(customer_id,customer_name,customer_email,customer_phone,subtotal,delivery_zone_id,delivery_address,delivery_charge,coupon_id,discount_amount,total_amount,status,notes)
  VALUES(v_customer_id,trim(p_name),trim(p_email),trim(p_phone),v_subtotal,p_delivery_zone_id,nullif(trim(coalesce(p_delivery_address,'')),''),v_delivery,p_coupon_id,v_discount,v_total,'pending',nullif(trim(coalesce(p_notes,'')),''))
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    SELECT p.name,p.price,p.sale_price,p.sale_start_date,p.sale_end_date,p.unit INTO v_product FROM public.products p WHERE p.id=(v_item->>'product_id')::uuid;
    v_unit_price := v_product.price;
    IF v_product.sale_price IS NOT NULL AND (v_product.sale_start_date IS NULL OR v_product.sale_start_date <= now()) AND (v_product.sale_end_date IS NULL OR v_product.sale_end_date > now()) THEN v_unit_price := v_product.sale_price; END IF;
    IF NULLIF(v_item->>'variant_id','') IS NOT NULL THEN
      SELECT price_adjustment,sale_price INTO v_variant FROM public.product_variants WHERE id=(v_item->>'variant_id')::uuid;
      IF v_variant.sale_price IS NOT NULL THEN v_unit_price:=v_variant.sale_price; ELSE v_unit_price:=v_unit_price+coalesce(v_variant.price_adjustment,0); END IF;
    END IF;
    INSERT INTO public.order_items(order_id,product_id,variant_id,product_name,quantity,unit,unit_price)
    VALUES(v_order_id,(v_item->>'product_id')::uuid,NULLIF(v_item->>'variant_id','')::uuid,v_product.name,(v_item->>'quantity')::numeric,v_product.unit,v_unit_price);
  END LOOP;

  RETURN json_build_object('success',true,'order_id',v_order_id,'subtotal',v_subtotal,'delivery_charge',v_delivery,'discount_amount',v_discount,'total',v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.create_customer_order(text,text,text,jsonb,uuid,uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_customer_order(text,text,text,jsonb,uuid,uuid,text,text) TO anon, authenticated;
