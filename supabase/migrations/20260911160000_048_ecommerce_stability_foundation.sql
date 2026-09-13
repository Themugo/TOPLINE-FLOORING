-- Phase 48: Ecommerce transaction + migration stability foundation
--
-- Goals:
-- 1. Keep WordPress/cPanel/email/DNS untouched while the new platform is proven.
-- 2. Make checkout idempotent and inventory-safe.
-- 3. Separate order/payment state.
-- 4. Provide controlled staff-only mutations.
-- 5. Preserve a provider-neutral payment model for future M-Pesa/card/bank integrations.
--
-- This migration is additive. It does not modify the legacy WordPress database.

CREATE TABLE IF NOT EXISTS public.inventory_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  quantity numeric(12,2) NOT NULL CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved','converted','released','expired')),
  expires_at timestamptz,
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_reservations_order_idx
  ON public.inventory_reservations(order_id);
CREATE INDEX IF NOT EXISTS inventory_reservations_product_active_idx
  ON public.inventory_reservations(product_id, status)
  WHERE status = 'reserved';

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'KES',
  method text NOT NULL
    CHECK (method IN ('mpesa','card','bank_transfer','cash','cheque','other')),
  provider text,
  provider_transaction_id text,
  provider_reference text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','authorized','successful','failed','reversed','refunded','partially_refunded')),
  idempotency_key text,
  failure_reason text,
  metadata jsonb NOT NULL DEFAULT '{}',
  notes text,
  paid_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_transactions_idempotency_idx
  ON public.payment_transactions(idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS payment_transactions_provider_ref_idx
  ON public.payment_transactions(provider, provider_transaction_id)
  WHERE provider IS NOT NULL AND provider_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS payment_transactions_order_idx
  ON public.payment_transactions(order_id, created_at DESC);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number text;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS checkout_idempotency_key text;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stock_reserved_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_idx
  ON public.orders(order_number)
  WHERE order_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_checkout_idempotency_idx
  ON public.orders(checkout_idempotency_key)
  WHERE checkout_idempotency_key IS NOT NULL;

-- Public visitors may only execute the checkout RPC. Direct table mutation remains forbidden.
ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inventory_reservations FROM anon, authenticated;
REVOKE ALL ON public.payment_transactions FROM anon, authenticated;
GRANT SELECT ON public.payment_transactions TO authenticated;

DROP POLICY IF EXISTS payment_transactions_staff_read ON public.payment_transactions;
CREATE POLICY payment_transactions_staff_read
  ON public.payment_transactions FOR SELECT TO authenticated
  USING (private.current_user_has_permission('finance','select'));

-- Generate a human-friendly order number while retaining UUID as the immutable primary key.
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_number text;
BEGIN
  v_number := 'TOP-' || to_char(clock_timestamp(), 'YYYYMMDD') || '-' ||
              upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  RETURN v_number;
END;
$$;

-- Provider-neutral, idempotent checkout.
-- The browser supplies only product IDs/quantities and customer input.
-- Product prices, delivery and coupons are recalculated here.
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
  v_subtotal numeric(12,2) := 0;
  v_delivery_charge numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_quantity numeric(12,2);
  v_coupon public.coupons%ROWTYPE;
  v_zone public.delivery_zones%ROWTYPE;
  v_existing public.orders%ROWTYPE;
  v_reserved numeric(12,2);
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

  -- Validate and calculate every line against current catalogue records.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      v_quantity := (v_item->>'quantity')::numeric;
    EXCEPTION WHEN invalid_text_representation THEN
      RETURN jsonb_build_object('success',false,'error','Invalid item quantity');
    END;

    IF v_quantity IS NULL OR v_quantity <> trunc(v_quantity) OR v_quantity <= 0 OR v_quantity > 10000 THEN
      RETURN jsonb_build_object('success',false,'error','Invalid item quantity');
    END IF;

    SELECT * INTO v_product
      FROM public.products
     WHERE id = NULLIF(v_item->>'product_id','')::uuid
       AND is_active = true
       AND status IN ('active','clearance')
     FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success',false,'error','One or more products are unavailable');
    END IF;

    IF v_product.stock_quantity <
       COALESCE((SELECT SUM(r.quantity) FROM public.inventory_reservations r
                 WHERE r.product_id=v_product.id AND r.status='reserved'),0) + v_quantity THEN
      RETURN jsonb_build_object('success',false,'error',
        'Insufficient stock for ' || v_product.name);
    END IF;

    v_subtotal := v_subtotal + (COALESCE(v_product.sale_price,v_product.price) * v_quantity);
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

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_quantity := (v_item->>'quantity')::numeric;
    SELECT * INTO v_product FROM public.products
     WHERE id=NULLIF(v_item->>'product_id','')::uuid AND is_active=true
     FOR UPDATE;

    INSERT INTO public.order_items(
      order_id,product_id,product_name,quantity,unit,unit_price
    ) VALUES(
      v_order_id,v_product.id,v_product.name,v_quantity,v_product.unit,
      COALESCE(v_product.sale_price,v_product.price)
    );

    INSERT INTO public.inventory_reservations(
      order_id,product_id,quantity,status,expires_at
    ) VALUES(
      v_order_id,v_product.id,v_quantity,'reserved',now()+interval '24 hours'
    );
  END LOOP;

  IF p_coupon_id IS NOT NULL THEN
    UPDATE public.coupons SET current_uses=current_uses+1 WHERE id=p_coupon_id;
  END IF;

  RETURN jsonb_build_object(
    'success',true,
    'order_id',v_order_id,
    'order_number',v_order_number,
    'subtotal',v_subtotal,
    'delivery_charge',v_delivery_charge,
    'discount_amount',v_discount,
    'total',v_total,
    'payment_status','pending',
    'stock_reserved',true
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

CREATE OR REPLACE FUNCTION public.update_order_status_transaction(
  p_order_id uuid,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,private
AS $$
DECLARE v_user uuid; v_old text;
BEGIN
  v_user := private.require_staff_permission('orders','update');
  SELECT status INTO v_old FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF p_status NOT IN ('pending','confirmed','processing','completed','cancelled') THEN
    RAISE EXCEPTION 'Invalid order status';
  END IF;
  IF v_old='completed' AND p_status<>'completed' THEN
    RAISE EXCEPTION 'Completed orders cannot be reopened';
  END IF;
  IF v_old='cancelled' AND p_status<>'cancelled' THEN
    RAISE EXCEPTION 'Cancelled orders cannot be reopened';
  END IF;

  IF p_status='cancelled' THEN
    UPDATE public.inventory_reservations
       SET status='released',released_at=now(),updated_at=now()
     WHERE order_id=p_order_id AND status='reserved';

    IF EXISTS (
      SELECT 1 FROM public.orders
       WHERE id=p_order_id
         AND coupon_id IS NOT NULL
         AND payment_status IN ('pending','failed')
    ) THEN
      UPDATE public.coupons c
         SET current_uses=GREATEST(c.current_uses-1,0)
        FROM public.orders o
       WHERE o.id=p_order_id AND c.id=o.coupon_id;
    END IF;
  END IF;

  UPDATE public.orders SET status=p_status,updated_at=now() WHERE id=p_order_id;
  RETURN jsonb_build_object('success',true,'order_id',p_order_id,'old_status',v_old,'status',p_status,'updated_by',v_user);
END;
$$;

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
  v_item jsonb;
  v_tx public.payment_transactions%ROWTYPE; v_status text; v_reserved numeric(12,2);
BEGIN
  v_user := private.require_staff_permission('finance','update');
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Payment amount must be positive'; END IF;
  IF p_method NOT IN ('mpesa','card','bank_transfer','cash','cheque','other') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_tx FROM public.payment_transactions
     WHERE idempotency_key=trim(p_idempotency_key);
    IF FOUND THEN
      RETURN jsonb_build_object('success',true,'payment_id',v_tx.id,'status',v_tx.status,'idempotent_replay',true);
    END IF;
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  INSERT INTO public.payment_transactions(
    order_id,amount,method,provider,provider_transaction_id,
    provider_reference,status,idempotency_key,notes,paid_at,created_by
  ) VALUES(
    p_order_id,p_amount,p_method,p_provider,p_provider_transaction_id,
    p_reference,'successful',nullif(trim(coalesce(p_idempotency_key,'')),''),p_notes,now(),v_user
  ) RETURNING * INTO v_tx;

  SELECT COALESCE(SUM(amount),0) INTO v_paid
    FROM public.payment_transactions
   WHERE order_id=p_order_id AND status='successful';

  v_status := CASE
    WHEN v_paid >= v_order.total_amount THEN 'paid'
    WHEN v_paid > 0 THEN 'partial'
    ELSE 'pending'
  END;

  UPDATE public.orders
     SET payment_status=v_status,
         status=CASE WHEN v_status='paid' AND status='pending' THEN 'confirmed' ELSE status END,
         updated_at=now()
   WHERE id=p_order_id;

  IF v_status='paid' THEN
    -- Convert the reservation into a sale exactly once. Product rows are
    -- locked before stock is consumed, so two paid orders cannot oversell.
    FOR v_item IN
      SELECT jsonb_build_object('product_id', product_id, 'qty', SUM(quantity))
        FROM public.inventory_reservations
       WHERE order_id=p_order_id AND status='reserved'
       GROUP BY product_id
    LOOP
      SELECT stock_quantity INTO v_reserved
        FROM public.products
       WHERE id=(v_item->>'product_id')::uuid
       FOR UPDATE;

      IF v_reserved < (v_item->>'qty')::integer THEN
        RAISE EXCEPTION 'Insufficient stock to complete payment';
      END IF;

      UPDATE public.products
         SET stock_quantity=stock_quantity-(v_item->>'qty')::integer,
             in_stock=(stock_quantity-(v_item->>'qty')::integer > 0),
             updated_at=now()
       WHERE id=(v_item->>'product_id')::uuid;

      INSERT INTO public.inventory_movements(
        product_id,movement_type,quantity,reference_type,reference_id,notes,created_by
      ) VALUES(
        (v_item->>'product_id')::uuid,'out',(v_item->>'qty')::integer,
        'order',p_order_id::text,'Stock consumed by paid ecommerce order',v_user
      );
    END LOOP;

    UPDATE public.inventory_reservations
       SET status='converted',updated_at=now()
     WHERE order_id=p_order_id AND status='reserved';
  END IF;

  RETURN jsonb_build_object(
    'success',true,'payment_id',v_tx.id,'order_id',p_order_id,
    'amount_paid',v_paid,'payment_status',v_status
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_expired_inventory_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,private
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.inventory_reservations
     SET status='expired',released_at=now(),updated_at=now()
   WHERE status='reserved'
     AND expires_at IS NOT NULL
     AND expires_at<=now();
  GET DIAGNOSTICS v_count=ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_secure_customer_order(text,text,text,jsonb,text,uuid,uuid,text,text,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_status_transaction(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_order_payment_transaction(uuid,numeric,text,text,text,text,text,text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.release_expired_inventory_reservations() FROM anon,authenticated;

-- Prevent direct client mutation of high-value transaction tables.
REVOKE INSERT, UPDATE, DELETE ON public.orders FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.order_items FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.customers FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.coupons FROM anon;
