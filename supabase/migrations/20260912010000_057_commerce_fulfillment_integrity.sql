-- Phase 68-70: Commerce Fulfillment 360 integrity
--
-- Closes the remaining storefront lifecycle gaps without changing the
-- provider boundary: variant-aware checkout, aggregate cart validation,
-- reservation correctness, payment/stock correctness, and deterministic
-- expiry handling all remain server-authoritative.

-- Variant/product consistency is enforced transactionally by the checkout RPC.
-- We intentionally do not add a retroactive FK here because historical order
-- rows may legitimately predate variant lifecycle support.

CREATE INDEX IF NOT EXISTS inventory_reservations_order_product_variant_idx
  ON public.inventory_reservations(order_id, product_id, variant_id, status);

-- Replace checkout with a variant-aware, aggregate-first transaction.
-- Aggregating before stock checks prevents duplicate cart lines from bypassing
-- available-stock validation.
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
SET search_path = public, private
AS $$
DECLARE
  v_customer_id uuid;
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

  INSERT INTO public.customers(name,email,phone,address)
  VALUES(trim(p_name),trim(p_email),trim(p_phone),
         nullif(trim(coalesce(p_delivery_address,'')),''))
  RETURNING id INTO v_customer_id;

  v_order_number := public.generate_order_number();

  INSERT INTO public.orders(
    customer_id,customer_name,customer_email,customer_phone,
    subtotal,delivery_zone_id,delivery_address,delivery_charge,
    coupon_id,discount_amount,total_amount,status,payment_status,
    notes,order_number,checkout_idempotency_key,payment_method,stock_reserved_at
  ) VALUES (
    v_customer_id,trim(p_name),trim(p_email),trim(p_phone),
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

-- Final payment now consumes the exact reserved product/variant stock.
CREATE OR REPLACE FUNCTION public.record_order_payment_transaction(
  p_order_id uuid,
  p_amount numeric,
  p_method text,
  p_reference text DEFAULT NULL,
  p_provider text DEFAULT NULL,
  p_provider_transaction_id text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,private
AS $$
DECLARE
  v_user uuid; v_order public.orders%ROWTYPE; v_paid numeric(12,2);
  v_item record; v_tx public.payment_transactions%ROWTYPE; v_status text;
  v_remaining numeric(12,2); v_reserved numeric(12,2); v_stock numeric(12,2);
BEGIN
  v_user := private.require_staff_permission('finance','update');
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Payment amount must be positive'; END IF;
  IF p_method NOT IN ('mpesa','card','bank_transfer','cash','cheque','other') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_tx FROM public.payment_transactions WHERE idempotency_key=trim(p_idempotency_key);
    IF FOUND THEN RETURN jsonb_build_object('success',true,'payment_id',v_tx.id,'status',v_tx.status,'idempotent_replay',true); END IF;
  END IF;
  IF p_provider IS NOT NULL AND p_provider_transaction_id IS NOT NULL THEN
    SELECT * INTO v_tx FROM public.payment_transactions WHERE provider=p_provider AND provider_transaction_id=p_provider_transaction_id;
    IF FOUND THEN RETURN jsonb_build_object('success',true,'payment_id',v_tx.id,'status',v_tx.status,'idempotent_replay',true); END IF;
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status='cancelled' THEN RAISE EXCEPTION 'Cancelled order cannot receive payment'; END IF;

  SELECT COALESCE(SUM(amount),0) INTO v_paid
    FROM public.payment_transactions WHERE order_id=p_order_id AND status='successful';
  v_remaining := GREATEST(v_order.total_amount-v_paid,0);
  IF p_amount > v_remaining THEN RAISE EXCEPTION 'Payment exceeds outstanding order balance'; END IF;

  IF p_amount = v_remaining THEN
    FOR v_item IN
      SELECT r.product_id,r.variant_id,SUM(r.quantity)::numeric AS required_qty
        FROM public.inventory_reservations r
       WHERE r.order_id=p_order_id AND r.status='reserved'
       GROUP BY r.product_id,r.variant_id
    LOOP
      SELECT COALESCE(SUM(r.quantity),0) INTO v_reserved
        FROM public.inventory_reservations r
       WHERE r.order_id=p_order_id
         AND r.product_id=v_item.product_id
         AND r.variant_id IS NOT DISTINCT FROM v_item.variant_id
         AND r.status='reserved'
         AND (r.expires_at IS NULL OR r.expires_at > now());
      IF v_reserved < v_item.required_qty THEN RAISE EXCEPTION 'Order stock reservation is no longer available'; END IF;

      IF v_item.variant_id IS NOT NULL THEN
        SELECT stock_quantity INTO v_stock FROM public.product_variants WHERE id=v_item.variant_id FOR UPDATE;
      ELSE
        SELECT stock_quantity INTO v_stock FROM public.products WHERE id=v_item.product_id FOR UPDATE;
      END IF;
      IF COALESCE(v_stock,0) < v_item.required_qty THEN RAISE EXCEPTION 'Insufficient stock to complete payment'; END IF;
    END LOOP;
  END IF;

  INSERT INTO public.payment_transactions(
    order_id,amount,method,provider,provider_transaction_id,
    provider_reference,status,idempotency_key,notes,paid_at,created_by
  ) VALUES(
    p_order_id,p_amount,p_method,p_provider,p_provider_transaction_id,
    p_reference,'successful',nullif(trim(coalesce(p_idempotency_key,'')),''),p_notes,now(),v_user
  ) RETURNING * INTO v_tx;

  v_paid := v_paid + p_amount;
  v_status := CASE WHEN v_paid >= v_order.total_amount THEN 'paid' WHEN v_paid > 0 THEN 'partial' ELSE 'pending' END;

  UPDATE public.orders
     SET payment_status=v_status,
         status=CASE WHEN v_status='paid' AND status='pending' THEN 'confirmed' ELSE status END,
         updated_at=now()
   WHERE id=p_order_id;

  IF v_status='paid' THEN
    FOR v_item IN
      SELECT r.product_id,r.variant_id,SUM(r.quantity)::integer AS qty
        FROM public.inventory_reservations r
       WHERE r.order_id=p_order_id AND r.status='reserved'
       GROUP BY r.product_id,r.variant_id
    LOOP
      IF v_item.variant_id IS NOT NULL THEN
        UPDATE public.product_variants
           SET stock_quantity=stock_quantity-v_item.qty,
               updated_at=now()
         WHERE id=v_item.variant_id AND stock_quantity >= v_item.qty;
        IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient variant stock to complete payment'; END IF;
        UPDATE public.products p
           SET in_stock=EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.product_id=p.id AND pv.is_active=true AND pv.stock_quantity>0),
               updated_at=now()
         WHERE p.id=v_item.product_id;
      ELSE
        UPDATE public.products
           SET stock_quantity=stock_quantity-v_item.qty,
               in_stock=(stock_quantity-v_item.qty > 0),
               updated_at=now()
         WHERE id=v_item.product_id AND stock_quantity >= v_item.qty;
        IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient stock to complete payment'; END IF;
      END IF;

      INSERT INTO public.inventory_movements(
        product_id,movement_type,quantity,reference_type,reference_id,notes,created_by
      ) VALUES(
        v_item.product_id,'out',v_item.qty,'order',p_order_id::text,
        CASE WHEN v_item.variant_id IS NOT NULL THEN 'Stock consumed by paid ecommerce order variant' ELSE 'Stock consumed by paid ecommerce order' END,
        v_user
      );
    END LOOP;

    UPDATE public.inventory_reservations
       SET status='converted',updated_at=now()
     WHERE order_id=p_order_id AND status='reserved';
  END IF;

  RETURN jsonb_build_object('success',true,'payment_id',v_tx.id,'order_id',p_order_id,'amount_paid',v_paid,'payment_status',v_status);
END;
$$;

-- Expired reservations are an order lifecycle event, not merely a stock row
-- update. Unpaid orders are cancelled and their coupon usage is released.
CREATE OR REPLACE FUNCTION public.expire_inventory_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,private
AS $$
DECLARE
  v_count integer := 0;
  v_order record;
BEGIN
  FOR v_order IN
    SELECT o.id,o.coupon_id
      FROM public.orders o
     WHERE EXISTS (
       SELECT 1 FROM public.inventory_reservations r
        WHERE r.order_id=o.id
          AND r.status='reserved'
          AND r.expires_at IS NOT NULL
          AND r.expires_at <= now()
     )
       AND o.payment_status IN ('pending','failed')
       AND o.status NOT IN ('cancelled','completed')
     FOR UPDATE OF o
  LOOP
    UPDATE public.inventory_reservations
       SET status='expired',released_at=now(),updated_at=now()
     WHERE order_id=v_order.id AND status='reserved';

    IF v_order.coupon_id IS NOT NULL THEN
      UPDATE public.coupons
         SET current_uses=GREATEST(current_uses-1,0)
       WHERE id=v_order.coupon_id;
    END IF;

    UPDATE public.orders
       SET status='cancelled',updated_at=now()
     WHERE id=v_order.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_secure_customer_order(text,text,text,jsonb,text,uuid,uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_secure_customer_order(text,text,text,jsonb,text,uuid,uuid,text,text,text) TO anon,authenticated;

REVOKE EXECUTE ON FUNCTION public.record_order_payment_transaction(uuid,numeric,text,text,text,text,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_order_payment_transaction(uuid,numeric,text,text,text,text,text,text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.expire_inventory_reservations() FROM anon,authenticated;

COMMENT ON FUNCTION public.create_secure_customer_order IS
'Canonical anonymous checkout: aggregates cart lines, validates product/variant stock, calculates authoritative prices/coupon/delivery, creates order items and reservations atomically.';
COMMENT ON FUNCTION public.record_order_payment_transaction IS
'Canonical staff payment boundary: final payment requires active reservations and consumes exact product/variant stock atomically.';
COMMENT ON FUNCTION public.expire_inventory_reservations IS
'Operational reservation expiry: releases reservations, rolls back coupon usage, and cancels unpaid orders atomically.';
