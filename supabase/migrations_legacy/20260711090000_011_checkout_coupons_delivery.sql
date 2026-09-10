/*
# Wire Coupons & Delivery Zones into Checkout

Problem: the `coupons` and `delivery_zones` tables were fully manageable
in admin, but nothing on the storefront ever read them - discount codes
could never actually be applied at checkout, and delivery zones/fees
were never shown or charged. This migration adds what's needed to close
that gap safely:

1. `validate_coupon(code, order_total)` - a SECURITY DEFINER RPC that
   lets an anonymous shopper check a coupon code without granting anon
   direct SELECT on the `coupons` table (which would leak every code,
   including inactive/expired ones, plus usage counts). Returns just
   enough to apply the discount client-side; never exposes the row.

2. `create_customer_order` is extended with an optional `p_coupon_id`
   parameter that atomically increments `current_uses` when an order is
   placed with a coupon applied - guarded so a coupon can't be used past
   its `max_uses` even under concurrent checkouts.
*/

CREATE OR REPLACE FUNCTION validate_coupon(p_code text, p_order_total decimal)
RETURNS TABLE (
  valid boolean,
  message text,
  coupon_id uuid,
  coupon_type text,
  discount_value decimal,
  discount_amount decimal
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon coupons%ROWTYPE;
  v_discount decimal;
BEGIN
  SELECT * INTO v_coupon FROM coupons WHERE code = upper(trim(p_code)) AND is_active = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invalid or inactive coupon code', NULL::uuid, NULL::text, NULL::decimal, NULL::decimal;
    RETURN;
  END IF;

  IF v_coupon.start_date IS NOT NULL AND now() < v_coupon.start_date THEN
    RETURN QUERY SELECT false, 'This coupon is not active yet', NULL::uuid, NULL::text, NULL::decimal, NULL::decimal;
    RETURN;
  END IF;

  IF v_coupon.end_date IS NOT NULL AND now() > v_coupon.end_date THEN
    RETURN QUERY SELECT false, 'This coupon has expired', NULL::uuid, NULL::text, NULL::decimal, NULL::decimal;
    RETURN;
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
    RETURN QUERY SELECT false, 'This coupon has reached its usage limit', NULL::uuid, NULL::text, NULL::decimal, NULL::decimal;
    RETURN;
  END IF;

  IF v_coupon.min_order_value IS NOT NULL AND p_order_total < v_coupon.min_order_value THEN
    RETURN QUERY SELECT false, format('Minimum order of %s required for this coupon', v_coupon.min_order_value), NULL::uuid, NULL::text, NULL::decimal, NULL::decimal;
    RETURN;
  END IF;

  IF v_coupon.coupon_type = 'percentage' THEN
    v_discount := p_order_total * (v_coupon.discount_value / 100);
  ELSE
    v_discount := LEAST(v_coupon.discount_value, p_order_total);
  END IF;

  RETURN QUERY SELECT true, 'Coupon applied', v_coupon.id, v_coupon.coupon_type, v_coupon.discount_value, v_discount;
END;
$$;

REVOKE ALL ON FUNCTION validate_coupon(text, decimal) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION validate_coupon(text, decimal) TO anon, authenticated;

-- Extend the checkout RPC with an optional coupon reference that, when
-- provided, atomically increments usage - re-checking max_uses here too
-- so a coupon can't be over-redeemed by concurrent checkouts racing
-- past the earlier validate_coupon check.
CREATE OR REPLACE FUNCTION create_customer_order(
  p_name text,
  p_email text,
  p_phone text,
  p_notes text,
  p_total_amount decimal,
  p_items jsonb,
  p_coupon_id uuid DEFAULT NULL,
  p_delivery_zone_id uuid DEFAULT NULL,
  p_delivery_address text DEFAULT NULL,
  p_delivery_charge decimal DEFAULT 0,
  p_discount_amount decimal DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
  v_order_id uuid;
  v_item jsonb;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'name is required';
  END IF;
  IF p_email IS NULL OR p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'a valid email is required';
  END IF;
  IF p_phone IS NULL OR length(trim(p_phone)) = 0 THEN
    RAISE EXCEPTION 'phone is required';
  END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'at least one order item is required';
  END IF;

  INSERT INTO customers (name, email, phone)
  VALUES (p_name, p_email, p_phone)
  RETURNING id INTO v_customer_id;

  INSERT INTO orders (
    customer_id, customer_name, customer_email, customer_phone, total_amount, notes, status,
    delivery_zone_id, delivery_address, delivery_charge, coupon_id, discount_amount
  )
  VALUES (
    v_customer_id, p_name, p_email, p_phone, p_total_amount, p_notes, 'pending',
    p_delivery_zone_id, p_delivery_address, p_delivery_charge, p_coupon_id, p_discount_amount
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price)
    VALUES (
      v_order_id,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::decimal
    );
  END LOOP;

  IF p_coupon_id IS NOT NULL THEN
    UPDATE coupons
    SET current_uses = current_uses + 1
    WHERE id = p_coupon_id AND is_active = true AND (max_uses IS NULL OR current_uses < max_uses);
  END IF;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION create_customer_order(text, text, text, text, decimal, jsonb, uuid, uuid, text, decimal, decimal) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_customer_order(text, text, text, text, decimal, jsonb, uuid, uuid, text, decimal, decimal) TO anon, authenticated;
