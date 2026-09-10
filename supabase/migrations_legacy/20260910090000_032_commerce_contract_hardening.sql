-- Phase 2: Commerce transaction contract hardening
--
-- Establishes one canonical contract for public quotation submission,
-- coupon validation, and customer checkout. The client never supplies an
-- authoritative order total, delivery fee, or discount amount.

DROP FUNCTION IF EXISTS public.create_customer_order(text, text, text, text, uuid, jsonb, decimal, decimal);
DROP FUNCTION IF EXISTS public.create_customer_order(text, text, text, text, decimal, jsonb, uuid, uuid, text, decimal, decimal);

CREATE OR REPLACE FUNCTION public.create_customer_order(
  p_name text,
  p_email text,
  p_phone text,
  p_notes text DEFAULT '',
  p_total_amount decimal DEFAULT 0,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_coupon_id uuid DEFAULT NULL,
  p_delivery_zone_id uuid DEFAULT NULL,
  p_delivery_address text DEFAULT NULL,
  p_delivery_charge decimal DEFAULT 0,
  p_discount_amount decimal DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
  v_order_id uuid;
  v_item jsonb;
  v_product record;
  v_subtotal numeric(12,2) := 0;
  v_delivery_charge numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_quantity integer;
  v_coupon record;
  v_zone record;
BEGIN
  IF length(trim(coalesce(p_name, ''))) < 2 OR length(trim(p_name)) > 200 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid customer name');
  END IF;
  IF trim(coalesce(p_email, '')) !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RETURN json_build_object('success', false, 'error', 'Invalid customer email');
  END IF;
  IF length(trim(coalesce(p_phone, ''))) < 3 OR length(trim(p_phone)) > 30 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid phone number');
  END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Cart is empty');
  END IF;
  IF jsonb_array_length(p_items) > 100 THEN
    RETURN json_build_object('success', false, 'error', 'Too many cart items');
  END IF;

  -- Calculate the subtotal from active product prices, never from browser data.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      v_quantity := (v_item->>'quantity')::integer;
    EXCEPTION WHEN invalid_text_representation THEN
      RETURN json_build_object('success', false, 'error', 'Invalid item quantity');
    END;

    IF v_quantity IS NULL OR v_quantity < 1 OR v_quantity > 10000 THEN
      RETURN json_build_object('success', false, 'error', 'Invalid item quantity');
    END IF;

    SELECT id, name, price
      INTO v_product
      FROM public.products
     WHERE id = NULLIF(v_item->>'product_id', '')::uuid
       AND is_active = true;

    IF v_product IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'One or more products are unavailable');
    END IF;

    v_subtotal := v_subtotal + (v_product.price * v_quantity);
  END LOOP;

  -- Recalculate delivery from the active zone and server-side subtotal.
  IF p_delivery_zone_id IS NOT NULL THEN
    SELECT id, base_charge, free_delivery_minimum
      INTO v_zone
      FROM public.delivery_zones
     WHERE id = p_delivery_zone_id
       AND is_active = true;

    IF v_zone IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Selected delivery zone is unavailable');
    END IF;

    v_delivery_charge := CASE
      WHEN v_zone.free_delivery_minimum IS NOT NULL
       AND v_subtotal >= v_zone.free_delivery_minimum THEN 0
      ELSE coalesce(v_zone.base_charge, 0)
    END;
  END IF;

  -- Validate the coupon again inside the transaction and lock the row so
  -- concurrent checkouts cannot over-redeem it.
  IF p_coupon_id IS NOT NULL THEN
    SELECT * INTO v_coupon
      FROM public.coupons
     WHERE id = p_coupon_id
       AND is_active = true
       AND (start_date IS NULL OR start_date <= now())
       AND (end_date IS NULL OR end_date > now())
       AND (max_uses IS NULL OR current_uses < max_uses)
     FOR UPDATE;

    IF v_coupon IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Coupon is invalid or expired');
    END IF;

    IF coalesce(v_coupon.min_order_value, 0) > v_subtotal THEN
      RETURN json_build_object('success', false, 'error', 'Minimum order value is not met');
    END IF;

    IF v_coupon.coupon_type = 'percentage' THEN
      v_discount := round(v_subtotal * (v_coupon.discount_value / 100), 2);
    ELSE
      v_discount := least(v_coupon.discount_value, v_subtotal);
    END IF;

    UPDATE public.coupons
       SET current_uses = current_uses + 1
     WHERE id = v_coupon.id;
  END IF;

  v_total := greatest(v_subtotal + v_delivery_charge - v_discount, 0);

  INSERT INTO public.customers (name, email, phone, address)
  VALUES (trim(p_name), trim(p_email), trim(p_phone), nullif(trim(coalesce(p_delivery_address, '')), ''))
  RETURNING id INTO v_customer_id;

  INSERT INTO public.orders (
    customer_id, customer_name, customer_email, customer_phone,
    total_amount, notes, status, delivery_zone_id, delivery_address,
    delivery_charge, coupon_id, discount_amount
  ) VALUES (
    v_customer_id, trim(p_name), trim(p_email), trim(p_phone),
    v_total, nullif(trim(coalesce(p_notes, '')), ''), 'pending',
    p_delivery_zone_id, nullif(trim(coalesce(p_delivery_address, '')), ''),
    v_delivery_charge, p_coupon_id, v_discount
  ) RETURNING id INTO v_order_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    SELECT name, price INTO v_product
      FROM public.products
     WHERE id = (v_item->>'product_id')::uuid
       AND is_active = true;

    INSERT INTO public.order_items (
      order_id, product_id, product_name, quantity, unit_price
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::uuid,
      v_product.name,
      (v_item->>'quantity')::integer,
      v_product.price
    );
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'subtotal', v_subtotal,
    'delivery_charge', v_delivery_charge,
    'discount_amount', v_discount,
    'total', v_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_customer_order(text, text, text, text, decimal, jsonb, uuid, uuid, text, decimal, decimal) FROM public;
GRANT EXECUTE ON FUNCTION public.create_customer_order(text, text, text, text, decimal, jsonb, uuid, uuid, text, decimal, decimal) TO anon, authenticated;

-- Coupon validation must be read-only. Redemption happens exactly once in
-- create_customer_order after the coupon is revalidated and row-locked.
DROP FUNCTION IF EXISTS public.validate_coupon(text, decimal);

CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code text,
  p_order_total decimal DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon record;
  v_discount numeric(12,2);
BEGIN
  IF length(trim(coalesce(p_code, ''))) < 1 OR length(trim(p_code)) > 50 THEN
    RETURN json_build_object('valid', false, 'error', 'Invalid coupon code');
  END IF;

  SELECT * INTO v_coupon
    FROM public.coupons
   WHERE upper(code) = upper(trim(p_code))
     AND is_active = true
     AND (start_date IS NULL OR start_date <= now())
     AND (end_date IS NULL OR end_date > now())
     AND (max_uses IS NULL OR current_uses < max_uses);

  IF v_coupon IS NULL THEN
    RETURN json_build_object('valid', false, 'error', 'Invalid or expired coupon');
  END IF;

  IF coalesce(v_coupon.min_order_value, 0) > coalesce(p_order_total, 0) THEN
    RETURN json_build_object('valid', false, 'error', 'Minimum order value is not met');
  END IF;

  IF v_coupon.coupon_type = 'percentage' THEN
    v_discount := round(coalesce(p_order_total, 0) * (v_coupon.discount_value / 100), 2);
  ELSE
    v_discount := least(v_coupon.discount_value, coalesce(p_order_total, 0));
  END IF;

  RETURN json_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'discount_type', v_coupon.coupon_type,
    'discount_value', v_coupon.discount_value,
    'discount_amount', v_discount,
    'code', v_coupon.code
  );
END;
$$;

REVOKE ALL ON FUNCTION public.validate_coupon(text, decimal) FROM public;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, decimal) TO anon, authenticated;
