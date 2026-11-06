-- Phase 2 inventory hardening: exact stock counts, variant audit trail and
-- correct global/warehouse quantity reconciliation.
--
-- `adjustment` with a warehouse means "set this warehouse's counted quantity";
-- the global product total changes only by that warehouse's delta. Without a
-- warehouse it means "set the global product total".
CREATE OR REPLACE FUNCTION public.adjust_product_stock(
  p_product_id uuid,
  p_quantity integer,
  p_movement_type text DEFAULT 'adjustment',
  p_warehouse_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_reference_type text DEFAULT NULL,
  p_reference_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE
  v_user uuid;
  v_old integer;
  v_new integer;
  v_wh_old integer := 0;
  v_wh_new integer;
  v_delta integer;
BEGIN
  v_user := private.require_staff_permission('inventory','update');
  IF p_movement_type IS NULL OR p_movement_type NOT IN ('in','out','adjustment') THEN
    RAISE EXCEPTION 'Invalid movement type';
  END IF;
  IF p_quantity < 0 OR (p_movement_type IN ('in','out') AND p_quantity = 0) THEN
    RAISE EXCEPTION 'Quantity must be positive for stock in/out and cannot be negative for adjustment';
  END IF;

  SELECT stock_quantity INTO v_old
  FROM public.products WHERE id=p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.product_id=p_product_id AND pv.is_active=true) THEN
    RAISE EXCEPTION 'This product has active variants. Adjust stock on the specific variant.';
  END IF;

  IF p_warehouse_id IS NOT NULL THEN
    PERFORM 1 FROM public.warehouses WHERE id=p_warehouse_id AND is_active=true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Warehouse is inactive or missing'; END IF;

    SELECT quantity INTO v_wh_old
    FROM public.warehouse_stock
    WHERE warehouse_id=p_warehouse_id AND product_id=p_product_id
    FOR UPDATE;
    v_wh_old := COALESCE(v_wh_old,0);

    v_wh_new := CASE
      WHEN p_movement_type='adjustment' THEN p_quantity
      WHEN p_movement_type='in' THEN v_wh_old + p_quantity
      ELSE v_wh_old - p_quantity
    END;
    IF v_wh_new < 0 THEN RAISE EXCEPTION 'Insufficient warehouse stock'; END IF;
    v_delta := v_wh_new-v_wh_old;
    v_new := v_old+v_delta;
  ELSE
    v_new := CASE
      WHEN p_movement_type='adjustment' THEN p_quantity
      WHEN p_movement_type='in' THEN v_old+p_quantity
      ELSE v_old-p_quantity
    END;
    v_delta := v_new-v_old;
  END IF;

  IF v_new < 0 THEN RAISE EXCEPTION 'Insufficient product stock'; END IF;

  UPDATE public.products
  SET stock_quantity=v_new,in_stock=(v_new>0),updated_at=now()
  WHERE id=p_product_id;

  IF p_warehouse_id IS NOT NULL THEN
    INSERT INTO public.warehouse_stock(warehouse_id,product_id,quantity,updated_at)
    VALUES(p_warehouse_id,p_product_id,v_wh_new,now())
    ON CONFLICT (warehouse_id,product_id)
    DO UPDATE SET quantity=EXCLUDED.quantity,updated_at=now();
  END IF;

  IF v_delta <> 0 THEN
    INSERT INTO public.inventory_movements(
      product_id,warehouse_id,movement_type,quantity,previous_stock,new_stock,
      reference_type,reference_id,notes,created_by
    ) VALUES (
      p_product_id,p_warehouse_id,p_movement_type,abs(v_delta),
      CASE WHEN p_warehouse_id IS NULL THEN v_old ELSE v_wh_old END,
      CASE WHEN p_warehouse_id IS NULL THEN v_new ELSE v_wh_new END,
      COALESCE(p_reference_type,'manual_adjustment'),p_reference_id,p_notes,v_user
    );
  END IF;

  RETURN jsonb_build_object(
    'product_id',p_product_id,'previous_stock',v_old,'new_stock',v_new,
    'warehouse_previous',v_wh_old,'warehouse_new',v_wh_new,'delta',v_delta
  );
END;
$$;

-- Variant stock has its own stock counter and is consumed by variant-aware
-- checkout. All staff-side changes must use this audited exact-count RPC.
CREATE OR REPLACE FUNCTION public.set_product_variant_stock(
  p_variant_id uuid,
  p_quantity integer,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE
  v_user uuid;
  v_variant public.product_variants%ROWTYPE;
  v_product_id uuid;
  v_delta integer;
BEGIN
  v_user := private.require_staff_permission('inventory','update');
  IF p_quantity < 0 THEN RAISE EXCEPTION 'Variant stock cannot be negative'; END IF;

  SELECT product_id INTO v_product_id
  FROM public.product_variants WHERE id=p_variant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product variant not found'; END IF;

  PERFORM 1 FROM public.products WHERE id=v_product_id FOR UPDATE;

  SELECT * INTO v_variant
  FROM public.product_variants WHERE id=p_variant_id AND product_id=v_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product variant not found'; END IF;

  v_delta := p_quantity-v_variant.stock_quantity;
  IF v_delta = 0 THEN
    RETURN jsonb_build_object('variant_id',p_variant_id,'previous_stock',v_variant.stock_quantity,'new_stock',p_quantity,'unchanged',true);
  END IF;

  UPDATE public.product_variants
  SET stock_quantity=p_quantity,updated_at=now()
  WHERE id=p_variant_id;

  UPDATE public.products p
  SET in_stock=EXISTS (
    SELECT 1 FROM public.product_variants pv
    WHERE pv.product_id=p.id AND pv.is_active=true AND pv.stock_quantity>0
  ),updated_at=now()
  WHERE p.id=v_variant.product_id;

  INSERT INTO public.inventory_movements(
    product_id,variant_id,movement_type,quantity,previous_stock,new_stock,
    reference_type,notes,created_by
  ) VALUES (
    v_variant.product_id,p_variant_id,'adjustment',abs(v_delta),
    v_variant.stock_quantity,p_quantity,'variant_stock_adjustment',
    NULLIF(trim(p_notes),''),v_user
  );

  RETURN jsonb_build_object('variant_id',p_variant_id,'previous_stock',v_variant.stock_quantity,'new_stock',p_quantity,'delta',v_delta);
END;
$$;

REVOKE ALL ON FUNCTION public.set_product_variant_stock(uuid,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_product_variant_stock(uuid,integer,text) TO authenticated;
REVOKE ALL ON FUNCTION public.adjust_product_stock(uuid,integer,text,uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(uuid,integer,text,uuid,text,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.transfer_stock(uuid,uuid,uuid,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.transfer_stock(uuid,uuid,uuid,integer,text) TO authenticated;
REVOKE ALL ON FUNCTION public.receive_purchase_order_item(uuid,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.receive_purchase_order_item(uuid,numeric) TO authenticated;
REVOKE ALL ON FUNCTION public.create_purchase_order(uuid,uuid,date,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_purchase_order(uuid,uuid,date,text) TO authenticated;
REVOKE ALL ON FUNCTION public.add_purchase_order_item(uuid,uuid,text,numeric,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.add_purchase_order_item(uuid,uuid,text,numeric,numeric) TO authenticated;
REVOKE ALL ON FUNCTION public.transition_purchase_order_lifecycle(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.transition_purchase_order_lifecycle(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_warehouse_stock(
  p_warehouse_id uuid, p_product_id uuid, p_quantity integer, p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE
  v_user uuid;
  v_old integer;
  v_delta integer;
  v_total integer;
  v_new integer;
BEGIN
  v_user := private.require_staff_permission('inventory','update');
  IF p_quantity < 0 THEN RAISE EXCEPTION 'Warehouse stock cannot be negative'; END IF;
  PERFORM 1 FROM public.warehouses WHERE id=p_warehouse_id AND is_active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Warehouse is inactive or missing'; END IF;

  SELECT stock_quantity INTO v_total
  FROM public.products WHERE id=p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.product_id=p_product_id AND pv.is_active=true) THEN
    RAISE EXCEPTION 'Warehouse stock is not variant-aware. Adjust stock on the specific variant.';
  END IF;

  SELECT quantity INTO v_old
  FROM public.warehouse_stock
  WHERE warehouse_id=p_warehouse_id AND product_id=p_product_id
  FOR UPDATE;
  v_old := COALESCE(v_old,0);
  v_delta := p_quantity-v_old;
  v_new := v_total+v_delta;
  IF v_new < 0 THEN RAISE EXCEPTION 'Product stock cannot be negative'; END IF;

  INSERT INTO public.warehouse_stock(warehouse_id,product_id,quantity)
  VALUES(p_warehouse_id,p_product_id,p_quantity)
  ON CONFLICT (warehouse_id,product_id)
  DO UPDATE SET quantity=EXCLUDED.quantity,updated_at=now();

  UPDATE public.products
  SET stock_quantity=v_new,in_stock=(v_new>0),updated_at=now()
  WHERE id=p_product_id;

  IF v_delta <> 0 THEN
    INSERT INTO public.inventory_movements(
      product_id,warehouse_id,movement_type,quantity,previous_stock,new_stock,
      reference_type,notes,created_by
    ) VALUES (
      p_product_id,p_warehouse_id,'adjustment',abs(v_delta),v_old,p_quantity,
      'warehouse_adjustment',p_notes,v_user
    );
  END IF;

  RETURN jsonb_build_object(
    'warehouse_previous',v_old,'warehouse_new',p_quantity,
    'product_previous',v_total,'product_new',v_new,'delta',v_delta
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_warehouse_stock(uuid,uuid,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_warehouse_stock(uuid,uuid,integer,text) TO authenticated;

-- A warehouse cannot be deleted while it holds stock: ON DELETE CASCADE on
-- warehouse_stock would otherwise erase inventory records without reducing
-- the product total or preserving a transfer/adjustment audit trail.
-- Variant deletion must never cascade away inventory movement history or
-- detach variants from active reservations/orders. Retire variants by setting
-- is_active=false after stock has been reconciled to zero.
CREATE OR REPLACE FUNCTION public.prevent_product_variant_delete_with_history()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.stock_quantity > 0 THEN
    RAISE EXCEPTION 'Variant still has stock. Record a stock adjustment to zero before archiving it.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.inventory_movements im WHERE im.variant_id=OLD.id)
     OR EXISTS (SELECT 1 FROM public.inventory_reservations ir WHERE ir.variant_id=OLD.id)
     OR EXISTS (SELECT 1 FROM public.inventory_alerts ia WHERE ia.variant_id=OLD.id)
     OR EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.variant_id=OLD.id) THEN
    RAISE EXCEPTION 'Variant has inventory or order history. Archive it instead of deleting it.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_product_variant_delete_with_history ON public.product_variants;
CREATE TRIGGER trg_prevent_product_variant_delete_with_history
BEFORE DELETE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.prevent_product_variant_delete_with_history();
REVOKE ALL ON FUNCTION public.prevent_product_variant_delete_with_history() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.prevent_warehouse_delete_with_stock()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.warehouse_stock ws
    WHERE ws.warehouse_id=OLD.id AND ws.quantity>0
  ) THEN
    RAISE EXCEPTION 'Warehouse still holds stock. Transfer or write off all stock before deleting it.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_warehouse_delete_with_stock ON public.warehouses;
CREATE TRIGGER trg_prevent_warehouse_delete_with_stock
BEFORE DELETE ON public.warehouses
FOR EACH ROW EXECUTE FUNCTION public.prevent_warehouse_delete_with_stock();
REVOKE ALL ON FUNCTION public.prevent_warehouse_delete_with_stock() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.transition_purchase_order_lifecycle(
  p_purchase_order_id uuid,
  p_status text,
  p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private
AS $$
DECLARE
  v_user uuid;
  v_po public.purchase_orders%ROWTYPE;
  v_allowed boolean := false;
  v_item_count integer;
  v_remaining numeric;
BEGIN
  v_user := private.require_staff_permission('procurement','update');

  IF p_status NOT IN ('draft','pending','sent','ordered','partial','received','cancelled')
    THEN RAISE EXCEPTION 'Invalid purchase order status'; END IF;

  SELECT * INTO v_po
  FROM public.purchase_orders
  WHERE id=p_purchase_order_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase order not found'; END IF;

  IF v_po.status = p_status THEN
    RETURN jsonb_build_object('success',true,'purchase_order_id',p_purchase_order_id,
                              'status',p_status,'unchanged',true);
  END IF;

  v_allowed := CASE v_po.status
    WHEN 'draft' THEN p_status IN ('pending','sent','cancelled')
    WHEN 'pending' THEN p_status IN ('sent','ordered','cancelled')
    WHEN 'sent' THEN p_status IN ('ordered','cancelled')
    WHEN 'ordered' THEN p_status IN ('partial','received','cancelled')
    WHEN 'partial' THEN p_status IN ('received','cancelled')
    WHEN 'received' THEN false
    WHEN 'cancelled' THEN false
    ELSE false
  END;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Invalid purchase order transition from % to %',v_po.status,p_status;
  END IF;

  SELECT count(*) INTO v_item_count
  FROM public.purchase_order_items
  WHERE purchase_order_id=p_purchase_order_id;

  IF p_status IN ('pending','sent','ordered') AND v_item_count=0
    THEN RAISE EXCEPTION 'Purchase order must contain at least one line item'; END IF;
  IF p_status IN ('pending','sent','ordered') AND EXISTS (
    SELECT 1 FROM public.purchase_order_items
    WHERE purchase_order_id=p_purchase_order_id AND product_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Every stock purchase order line must be linked to a product before ordering';
  END IF;
  IF p_status IN ('pending','sent','ordered') AND EXISTS (
    SELECT 1 FROM public.purchase_order_items
    WHERE purchase_order_id=p_purchase_order_id
      AND (quantity_ordered <> trunc(quantity_ordered) OR quantity_received <> trunc(quantity_received))
  ) THEN
    RAISE EXCEPTION 'Purchase order inventory quantities must be whole units';
  END IF;

  IF p_status='ordered' AND v_po.warehouse_id IS NULL
    THEN RAISE EXCEPTION 'Purchase order requires a receiving warehouse'; END IF;

  IF p_status='received' THEN
    SELECT coalesce(sum(greatest(quantity_ordered-quantity_received,0)),0)
      INTO v_remaining
    FROM public.purchase_order_items
    WHERE purchase_order_id=p_purchase_order_id;
    IF v_remaining > 0 THEN RAISE EXCEPTION 'Purchase order still has unreceived quantities'; END IF;
  END IF;

  UPDATE public.purchase_orders
  SET status=p_status,
      actual_delivery_date=CASE WHEN p_status='received' THEN coalesce(actual_delivery_date,current_date)
                                ELSE actual_delivery_date END,
      updated_at=now()
  WHERE id=p_purchase_order_id;

  INSERT INTO public.procurement_events(
    purchase_order_id,event_type,from_status,to_status,note,created_by
  )
  VALUES(
    p_purchase_order_id,p_status,v_po.status,p_status,
    NULLIF(trim(p_note),''),v_user
  );

  RETURN jsonb_build_object('success',true,'purchase_order_id',p_purchase_order_id,
                            'status',p_status,'updated_by',v_user);
END;
$$;

CREATE OR REPLACE FUNCTION public.add_purchase_order_item(
  p_purchase_order_id uuid,
  p_product_id uuid,
  p_description text,
  p_quantity numeric,
  p_unit_cost numeric
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private
AS $$
DECLARE v_user uuid; v_id uuid; v_total numeric; v_status text;
BEGIN
  v_user := private.require_staff_permission('procurement','insert');

  IF p_product_id IS NULL THEN
    RAISE EXCEPTION 'Select a catalogue product for every stock purchase order line';
  END IF;
  IF p_quantity <= 0 OR p_quantity <> trunc(p_quantity) OR p_unit_cost < 0 THEN
    RAISE EXCEPTION 'Quantity must be a positive whole number and unit cost cannot be negative';
  END IF;
  IF NULLIF(trim(p_description),'') IS NULL THEN
    RAISE EXCEPTION 'Item description is required';
  END IF;

  SELECT status INTO v_status
  FROM public.purchase_orders
  WHERE id=p_purchase_order_id
  FOR UPDATE;
  IF NOT FOUND OR v_status NOT IN ('draft','pending') THEN
    RAISE EXCEPTION 'Purchase order is not editable';
  END IF;

  PERFORM 1 FROM public.products WHERE id=p_product_id AND is_active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found or inactive'; END IF;
  IF EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.product_id=p_product_id AND pv.is_active=true) THEN
    RAISE EXCEPTION 'Purchase order receiving is not variant-aware. Use the variant stock adjustment until variant receiving is supported.';
  END IF;

  INSERT INTO public.purchase_order_items(
    purchase_order_id,product_id,description,quantity_ordered,unit_cost,total_price
  )
  VALUES(
    p_purchase_order_id,p_product_id,trim(p_description),p_quantity,p_unit_cost,
    round(p_quantity*p_unit_cost,2)
  )
  RETURNING id INTO v_id;

  SELECT coalesce(sum(quantity_ordered*unit_cost),0)
    INTO v_total
  FROM public.purchase_order_items
  WHERE purchase_order_id=p_purchase_order_id;

  UPDATE public.purchase_orders
  SET total_amount=round(v_total,2),updated_at=now()
  WHERE id=p_purchase_order_id;

  INSERT INTO public.procurement_events(
    purchase_order_id,event_type,note,created_by
  )
  VALUES(
    p_purchase_order_id,'item_added',
    format('Added item %s, qty %s at %s',trim(p_description),p_quantity,p_unit_cost),
    v_user
  );

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_stock(
  p_from_warehouse_id uuid, p_to_warehouse_id uuid, p_product_id uuid, p_quantity integer, p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE v_user uuid; v_from integer; v_to integer; v_id uuid := gen_random_uuid(); v_no text;
BEGIN
  v_user := private.require_staff_permission('inventory','update');
  IF p_from_warehouse_id = p_to_warehouse_id THEN RAISE EXCEPTION 'Source and destination must differ'; END IF;
  IF p_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;
  PERFORM 1 FROM public.products WHERE id=p_product_id AND is_active=true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product is inactive or missing'; END IF;
  IF EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.product_id=p_product_id AND pv.is_active=true) THEN
    RAISE EXCEPTION 'Warehouse transfers are not variant-aware. Adjust stock on the specific variant.';
  END IF;
  PERFORM 1 FROM public.warehouses WHERE id=p_from_warehouse_id AND is_active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Source warehouse is inactive or missing'; END IF;
  PERFORM 1 FROM public.warehouses WHERE id=p_to_warehouse_id AND is_active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Destination warehouse is inactive or missing'; END IF;
  SELECT quantity INTO v_from FROM public.warehouse_stock WHERE warehouse_id=p_from_warehouse_id AND product_id=p_product_id FOR UPDATE;
  v_from := COALESCE(v_from,0); IF v_from < p_quantity THEN RAISE EXCEPTION 'Insufficient stock at source warehouse'; END IF;
  SELECT quantity INTO v_to FROM public.warehouse_stock WHERE warehouse_id=p_to_warehouse_id AND product_id=p_product_id FOR UPDATE;
  v_to := COALESCE(v_to,0);
  UPDATE public.warehouse_stock SET quantity=v_from-p_quantity,updated_at=now() WHERE warehouse_id=p_from_warehouse_id AND product_id=p_product_id;
  INSERT INTO public.warehouse_stock(warehouse_id,product_id,quantity) VALUES(p_to_warehouse_id,p_product_id,v_to+p_quantity)
    ON CONFLICT (warehouse_id,product_id) DO UPDATE SET quantity=EXCLUDED.quantity,updated_at=now();
  v_no := 'TR-' || to_char(now(),'YYYYMMDDHH24MISS') || '-' || substr(replace(v_id::text,'-',''),1,6);
  INSERT INTO public.stock_transfers(id,transfer_number,from_warehouse_id,to_warehouse_id,product_id,quantity,status,notes,created_by)
  VALUES(v_id,v_no,p_from_warehouse_id,p_to_warehouse_id,p_product_id,p_quantity,'completed',p_notes,v_user);
  INSERT INTO public.inventory_movements(product_id,warehouse_id,movement_type,quantity,previous_stock,new_stock,reference_type,reference_id,notes,created_by)
  VALUES(p_product_id,p_from_warehouse_id,'out',p_quantity,v_from,v_from-p_quantity,'transfer',v_id::text,p_notes,v_user),
        (p_product_id,p_to_warehouse_id,'in',p_quantity,v_to,v_to+p_quantity,'transfer',v_id::text,p_notes,v_user);
  RETURN jsonb_build_object('id',v_id,'transfer_number',v_no,'from_quantity',v_from-p_quantity,'to_quantity',v_to+p_quantity);
END;
$$;

CREATE OR REPLACE FUNCTION public.receive_purchase_order_item(p_item_id uuid, p_quantity numeric)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE
  v_user uuid; v_item public.purchase_order_items%ROWTYPE; v_po public.purchase_orders%ROWTYPE;
  v_delta numeric; v_product_stock integer; v_wh integer; v_prev integer; v_new integer; v_purchase_order_id uuid;
BEGIN
  v_user := private.require_staff_permission('inventory','update');
  IF p_quantity <= 0 OR p_quantity <> trunc(p_quantity) THEN
    RAISE EXCEPTION 'Receipt quantity must be a positive whole number';
  END IF;
  SELECT purchase_order_id INTO v_purchase_order_id
  FROM public.purchase_order_items WHERE id=p_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase order item not found'; END IF;

  SELECT * INTO v_po FROM public.purchase_orders WHERE id=v_purchase_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase order not found'; END IF;
  IF v_po.status NOT IN ('ordered','partial') THEN
    RAISE EXCEPTION 'Purchase order is not open for receiving';
  END IF;

  SELECT * INTO v_item FROM public.purchase_order_items WHERE id=p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase order item not found'; END IF;
  v_delta := p_quantity;
  IF v_item.quantity_received + v_delta > v_item.quantity_ordered THEN RAISE EXCEPTION 'Cannot receive more than ordered'; END IF;
  IF v_item.product_id IS NULL THEN RAISE EXCEPTION 'Receipt requires a linked product'; END IF;
  SELECT stock_quantity INTO v_product_stock FROM public.products WHERE id=v_item.product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.product_id=v_item.product_id AND pv.is_active=true) THEN
    RAISE EXCEPTION 'Purchase order receiving is not variant-aware. Do not receive this line against parent-product stock.';
  END IF;
  v_new := v_product_stock + v_delta::integer;
  UPDATE public.products SET stock_quantity=v_new,in_stock=true,updated_at=now() WHERE id=v_item.product_id;
  UPDATE public.purchase_order_items SET quantity_received=quantity_received+v_delta WHERE id=p_item_id;
  IF v_po.warehouse_id IS NOT NULL THEN
    SELECT quantity INTO v_prev FROM public.warehouse_stock WHERE warehouse_id=v_po.warehouse_id AND product_id=v_item.product_id FOR UPDATE;
    v_prev := COALESCE(v_prev,0); v_wh := v_prev + v_delta::integer;
    INSERT INTO public.warehouse_stock(warehouse_id,product_id,quantity) VALUES(v_po.warehouse_id,v_item.product_id,v_wh)
      ON CONFLICT (warehouse_id,product_id) DO UPDATE SET quantity=EXCLUDED.quantity,updated_at=now();
  END IF;
  INSERT INTO public.inventory_movements(product_id,warehouse_id,movement_type,quantity,previous_stock,new_stock,reference_type,reference_id,notes,created_by)
  VALUES(v_item.product_id,v_po.warehouse_id,'in',v_delta::integer,v_product_stock,v_new,'purchase_receipt',v_po.id::text,'Goods received',v_user);
  UPDATE public.purchase_orders SET status=CASE WHEN NOT EXISTS(SELECT 1 FROM public.purchase_order_items WHERE purchase_order_id=v_po.id AND quantity_received < quantity_ordered) THEN 'received' ELSE 'partial' END,
    actual_delivery_date=CASE WHEN NOT EXISTS(SELECT 1 FROM public.purchase_order_items WHERE purchase_order_id=v_po.id AND quantity_received < quantity_ordered) THEN current_date ELSE actual_delivery_date END,updated_at=now() WHERE id=v_po.id;

  INSERT INTO public.procurement_events(purchase_order_id,event_type,from_status,to_status,note,created_by)
  SELECT v_po.id,'goods_received',v_po.status,po.status,
    format('Received %s units for %s',v_delta,v_item.description),v_user
  FROM public.purchase_orders po WHERE po.id=v_po.id;

  RETURN jsonb_build_object('purchase_order_id',v_po.id,'item_id',p_item_id,'received',v_item.quantity_received+v_delta,'stock',v_new);
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
        PERFORM 1 FROM public.products WHERE id=v_item.product_id FOR UPDATE;
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
        product_id,variant_id,movement_type,quantity,reference_type,reference_id,notes,created_by
      ) VALUES(
        v_item.product_id,v_item.variant_id,'out',v_item.qty,'order',p_order_id::text,
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


-- Low-stock alerts were readable/resolvable in the admin UI but no database
-- lifecycle created them. Maintain one active alert per product or variant and
-- resolve it automatically when stock recovers or the item is deactivated.
WITH ranked_product_alerts AS (
  SELECT id,row_number() OVER (PARTITION BY product_id ORDER BY created_at DESC,id DESC) AS rn
  FROM public.inventory_alerts
  WHERE product_id IS NOT NULL AND variant_id IS NULL AND alert_type='low_stock' AND is_resolved=false
)
UPDATE public.inventory_alerts
SET is_resolved=true,resolved_at=now()
WHERE id IN (SELECT id FROM ranked_product_alerts WHERE rn>1);

WITH ranked_variant_alerts AS (
  SELECT id,row_number() OVER (PARTITION BY variant_id ORDER BY created_at DESC,id DESC) AS rn
  FROM public.inventory_alerts
  WHERE variant_id IS NOT NULL AND alert_type='low_stock' AND is_resolved=false
)
UPDATE public.inventory_alerts
SET is_resolved=true,resolved_at=now()
WHERE id IN (SELECT id FROM ranked_variant_alerts WHERE rn>1);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_alerts_active_product_low_stock_uidx
ON public.inventory_alerts(product_id)
WHERE product_id IS NOT NULL AND variant_id IS NULL AND alert_type='low_stock' AND is_resolved=false;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_alerts_active_variant_low_stock_uidx
ON public.inventory_alerts(variant_id)
WHERE variant_id IS NOT NULL AND alert_type='low_stock' AND is_resolved=false;

CREATE OR REPLACE FUNCTION public.sync_product_low_stock_alert()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_active
     AND NOT EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.product_id=NEW.id AND pv.is_active=true)
     AND NEW.stock_quantity <= NEW.low_stock_threshold THEN
    INSERT INTO public.inventory_alerts(product_id,variant_id,alert_type,threshold,current_stock,is_resolved)
    VALUES(NEW.id,NULL,'low_stock',NEW.low_stock_threshold,NEW.stock_quantity,false)
    ON CONFLICT (product_id)
      WHERE product_id IS NOT NULL AND variant_id IS NULL AND alert_type='low_stock' AND is_resolved=false
    DO UPDATE SET threshold=EXCLUDED.threshold,current_stock=EXCLUDED.current_stock;
  ELSE
    UPDATE public.inventory_alerts
    SET is_resolved=true,resolved_at=now()
    WHERE product_id=NEW.id AND variant_id IS NULL AND alert_type='low_stock' AND is_resolved=false;
  END IF;

  IF NOT NEW.is_active THEN
    UPDATE public.inventory_alerts
    SET is_resolved=true,resolved_at=now()
    WHERE product_id=NEW.id AND variant_id IS NOT NULL AND alert_type='low_stock' AND is_resolved=false;
  ELSE
    INSERT INTO public.inventory_alerts(product_id,variant_id,alert_type,threshold,current_stock,is_resolved)
    SELECT pv.product_id,pv.id,'low_stock',pv.low_stock_threshold,pv.stock_quantity,false
    FROM public.product_variants pv
    WHERE pv.product_id=NEW.id AND pv.is_active=true
      AND pv.stock_quantity<=pv.low_stock_threshold
    ON CONFLICT (variant_id)
      WHERE variant_id IS NOT NULL AND alert_type='low_stock' AND is_resolved=false
    DO UPDATE SET threshold=EXCLUDED.threshold,current_stock=EXCLUDED.current_stock;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_variant_low_stock_alert()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_product_active boolean;
BEGIN
  SELECT is_active INTO v_product_active
  FROM public.products WHERE id=NEW.product_id;

  IF NEW.is_active AND coalesce(v_product_active,false)
     AND NEW.stock_quantity <= NEW.low_stock_threshold THEN
    INSERT INTO public.inventory_alerts(product_id,variant_id,alert_type,threshold,current_stock,is_resolved)
    VALUES(NEW.product_id,NEW.id,'low_stock',NEW.low_stock_threshold,NEW.stock_quantity,false)
    ON CONFLICT (variant_id)
      WHERE variant_id IS NOT NULL AND alert_type='low_stock' AND is_resolved=false
    DO UPDATE SET threshold=EXCLUDED.threshold,current_stock=EXCLUDED.current_stock;
  ELSE
    UPDATE public.inventory_alerts
    SET is_resolved=true,resolved_at=now()
    WHERE variant_id=NEW.id AND alert_type='low_stock' AND is_resolved=false;
  END IF;

  IF EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.product_id=NEW.product_id AND pv.is_active=true) THEN
    UPDATE public.inventory_alerts
    SET is_resolved=true,resolved_at=now()
    WHERE product_id=NEW.product_id AND variant_id IS NULL AND alert_type='low_stock' AND is_resolved=false;
  ELSIF coalesce(v_product_active,false) THEN
    INSERT INTO public.inventory_alerts(product_id,variant_id,alert_type,threshold,current_stock,is_resolved)
    SELECT p.id,NULL,'low_stock',p.low_stock_threshold,p.stock_quantity,false
    FROM public.products p
    WHERE p.id=NEW.product_id AND p.stock_quantity<=p.low_stock_threshold
    ON CONFLICT (product_id)
      WHERE product_id IS NOT NULL AND variant_id IS NULL AND alert_type='low_stock' AND is_resolved=false
    DO UPDATE SET threshold=EXCLUDED.threshold,current_stock=EXCLUDED.current_stock;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_low_stock_alert ON public.products;
CREATE TRIGGER trg_sync_product_low_stock_alert
AFTER INSERT OR UPDATE OF stock_quantity,low_stock_threshold,is_active
ON public.products FOR EACH ROW EXECUTE FUNCTION public.sync_product_low_stock_alert();

DROP TRIGGER IF EXISTS trg_sync_variant_low_stock_alert ON public.product_variants;
CREATE TRIGGER trg_sync_variant_low_stock_alert
AFTER INSERT OR UPDATE OF stock_quantity,low_stock_threshold,is_active
ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.sync_variant_low_stock_alert();

REVOKE ALL ON FUNCTION public.sync_product_low_stock_alert() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sync_variant_low_stock_alert() FROM PUBLIC,anon,authenticated;

-- Backfill current low-stock state once so the admin queue reflects existing
-- inventory as well as future stock movements.
INSERT INTO public.inventory_alerts(product_id,variant_id,alert_type,threshold,current_stock,is_resolved)
SELECT p.id,NULL,'low_stock',p.low_stock_threshold,p.stock_quantity,false
FROM public.products p
WHERE p.is_active=true
  AND p.stock_quantity<=p.low_stock_threshold
  AND NOT EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.product_id=p.id AND pv.is_active=true)
ON CONFLICT (product_id)
  WHERE product_id IS NOT NULL AND variant_id IS NULL AND alert_type='low_stock' AND is_resolved=false
DO UPDATE SET threshold=EXCLUDED.threshold,current_stock=EXCLUDED.current_stock;

INSERT INTO public.inventory_alerts(product_id,variant_id,alert_type,threshold,current_stock,is_resolved)
SELECT pv.product_id,pv.id,'low_stock',pv.low_stock_threshold,pv.stock_quantity,false
FROM public.product_variants pv
JOIN public.products p ON p.id=pv.product_id AND p.is_active=true
WHERE pv.is_active=true AND pv.stock_quantity<=pv.low_stock_threshold
ON CONFLICT (variant_id)
  WHERE variant_id IS NOT NULL AND alert_type='low_stock' AND is_resolved=false
DO UPDATE SET threshold=EXCLUDED.threshold,current_stock=EXCLUDED.current_stock;
CREATE OR REPLACE FUNCTION public.remove_purchase_order_item(
  p_item_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private
AS $$
DECLARE
  v_user uuid; v_item public.purchase_order_items%ROWTYPE; v_total numeric; v_po_id uuid; v_po_status text;
BEGIN
  v_user := private.require_staff_permission('procurement','update');

  SELECT purchase_order_id INTO v_po_id
  FROM public.purchase_order_items WHERE id=p_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase order item not found'; END IF;

  SELECT status INTO v_po_status
  FROM public.purchase_orders WHERE id=v_po_id FOR UPDATE;
  IF NOT FOUND OR v_po_status NOT IN ('draft','pending') THEN
    RAISE EXCEPTION 'Purchase order is not editable';
  END IF;

  SELECT * INTO v_item
  FROM public.purchase_order_items
  WHERE id=p_item_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase order item not found'; END IF;
  IF v_item.quantity_received > 0 THEN RAISE EXCEPTION 'Received items cannot be removed'; END IF;

  DELETE FROM public.purchase_order_items WHERE id=p_item_id;

  SELECT coalesce(sum(quantity_ordered*unit_cost),0)
    INTO v_total
  FROM public.purchase_order_items
  WHERE purchase_order_id=v_item.purchase_order_id;

  UPDATE public.purchase_orders
  SET total_amount=round(v_total,2),updated_at=now()
  WHERE id=v_item.purchase_order_id;

  INSERT INTO public.procurement_events(
    purchase_order_id,event_type,note,created_by
  )
  VALUES(v_item.purchase_order_id,'item_removed',
         format('Removed item %s',v_item.description),v_user);

  RETURN jsonb_build_object('success',true,'purchase_order_id',v_item.purchase_order_id);
END;
$$;Phase 2 inventory hardening: exact stock counts, variant audit trail and
-- correct global/warehouse quantity reconciliation.
--
-- `adjustment` with a warehouse means "set this warehouse's counted quantity";
-- the global product total changes only by that warehouse's delta. Without a
-- warehouse it means "set the global product total".
CREATE OR REPLACE FUNCTION public.adjust_product_stock(
  p_product_id uuid,
  p_quantity integer,
  p_movement_type text DEFAULT 'adjustment',
  p_warehouse_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_reference_type text DEFAULT NULL,
  p_reference_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE
  v_user uuid;
  v_old integer;
  v_new integer;
  v_wh_old integer := 0;
  v_wh_new integer;
  v_delta integer;
BEGIN
  v_user := private.require_staff_permission('inventory','update');
  IF p_movement_type IS NULL OR p_movement_type NOT IN ('in','out','adjustment') THEN
    RAISE EXCEPTION 'Invalid movement type';
  END IF;
  IF p_quantity < 0 OR (p_movement_type IN ('in','out') AND p_quantity = 0) THEN
    RAISE EXCEPTION 'Quantity must be positive for stock in/out and cannot be negative for adjustment';
  END IF;

  SELECT stock_quantity INTO v_old
  FROM public.products WHERE id=p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.product_id=p_product_id AND pv.is_active=true) THEN
    RAISE EXCEPTION 'This product has active variants. Adjust stock on the specific variant.';
  END IF;

  IF p_warehouse_id IS NOT NULL THEN
    PERFORM 1 FROM public.warehouses WHERE id=p_warehouse_id AND is_active=true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Warehouse is inactive or missing'; END IF;

    SELECT quantity INTO v_wh_old
    FROM public.warehouse_stock
    WHERE warehouse_id=p_warehouse_id AND product_id=p_product_id
    FOR UPDATE;
    v_wh_old := COALESCE(v_wh_old,0);

    v_wh_new := CASE
      WHEN p_movement_type='adjustment' THEN p_quantity
      WHEN p_movement_type='in' THEN v_wh_old + p_quantity
      ELSE v_wh_old - p_quantity
    END;
    IF v_wh_new < 0 THEN RAISE EXCEPTION 'Insufficient warehouse stock'; END IF;
    v_delta := v_wh_new-v_wh_old;
    v_new := v_old+v_delta;
  ELSE
    v_new := CASE
      WHEN p_movement_type='adjustment' THEN p_quantity
      WHEN p_movement_type='in' THEN v_old+p_quantity
      ELSE v_old-p_quantity
    END;
    v_delta := v_new-v_old;
  END IF;

  IF v_new < 0 THEN RAISE EXCEPTION 'Insufficient product stock'; END IF;

  UPDATE public.products
  SET stock_quantity=v_new,in_stock=(v_new>0),updated_at=now()
  WHERE id=p_product_id;

  IF p_warehouse_id IS NOT NULL THEN
    INSERT INTO public.warehouse_stock(warehouse_id,product_id,quantity,updated_at)
    VALUES(p_warehouse_id,p_product_id,v_wh_new,now())
    ON CONFLICT (warehouse_id,product_id)
    DO UPDATE SET quantity=EXCLUDED.quantity,updated_at=now();
  END IF;

  IF v_delta <> 0 THEN
    INSERT INTO public.inventory_movements(
      product_id,warehouse_id,movement_type,quantity,previous_stock,new_stock,
      reference_type,reference_id,notes,created_by
    ) VALUES (
      p_product_id,p_warehouse_id,p_movement_type,abs(v_delta),
      CASE WHEN p_warehouse_id IS NULL THEN v_old ELSE v_wh_old END,
      CASE WHEN p_warehouse_id IS NULL THEN v_new ELSE v_wh_new END,
      COALESCE(p_reference_type,'manual_adjustment'),p_reference_id,p_notes,v_user
    );
  END IF;

  RETURN jsonb_build_object(
    'product_id',p_product_id,'previous_stock',v_old,'new_stock',v_new,
    'warehouse_previous',v_wh_old,'warehouse_new',v_wh_new,'delta',v_delta
  );
END;
$$;

-- Variant stock has its own stock counter and is consumed by variant-aware
-- checkout. All staff-side changes must use this audited exact-count RPC.
CREATE OR REPLACE FUNCTION public.set_product_variant_stock(
  p_variant_id uuid,
  p_quantity integer,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE
  v_user uuid;
  v_variant public.product_variants%ROWTYPE;
  v_product_id uuid;
  v_delta integer;
BEGIN
  v_user := private.require_staff_permission('inventory','update');
  IF p_quantity < 0 THEN RAISE EXCEPTION 'Variant stock cannot be negative'; END IF;

  SELECT product_id INTO v_product_id
  FROM public.product_variants WHERE id=p_variant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product variant not found'; END IF;

  PERFORM 1 FROM public.products WHERE id=v_product_id FOR UPDATE;

  SELECT * INTO v_variant
  FROM public.product_variants WHERE id=p_variant_id AND product_id=v_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product variant not found'; END IF;

  v_delta := p_quantity-v_variant.stock_quantity;
  IF v_delta = 0 THEN
    RETURN jsonb_build_object('variant_id',p_variant_id,'previous_stock',v_variant.stock_quantity,'new_stock',p_quantity,'unchanged',true);
  END IF;

  UPDATE public.product_variants
  SET stock_quantity=p_quantity,updated_at=now()
  WHERE id=p_variant_id;

  UPDATE public.products p
  SET in_stock=EXISTS (
    SELECT 1 FROM public.product_variants pv
    WHERE pv.product_id=p.id AND pv.is_active=true AND pv.stock_quantity>0
  ),updated_at=now()
  WHERE p.id=v_variant.product_id;

  INSERT INTO public.inventory_movements(
    product_id,variant_id,movement_type,quantity,previous_stock,new_stock,
    reference_type,notes,created_by
  ) VALUES (
    v_variant.product_id,p_variant_id,'adjustment',abs(v_delta),
    v_variant.stock_quantity,p_quantity,'variant_stock_adjustment',
    NULLIF(trim(p_notes),''),v_user
  );

  RETURN jsonb_build_object('variant_id',p_variant_id,'previous_stock',v_variant.stock_quantity,'new_stock',p_quantity,'delta',v_delta);
END;
$$;

REVOKE ALL ON FUNCTION public.set_product_variant_stock(uuid,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_product_variant_stock(uuid,integer,text) TO authenticated;
REVOKE ALL ON FUNCTION public.adjust_product_stock(uuid,integer,text,uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(uuid,integer,text,uuid,text,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.transfer_stock(uuid,uuid,uuid,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.transfer_stock(uuid,uuid,uuid,integer,text) TO authenticated;
REVOKE ALL ON FUNCTION public.receive_purchase_order_item(uuid,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.receive_purchase_order_item(uuid,numeric) TO authenticated;
REVOKE ALL ON FUNCTION public.create_purchase_order(uuid,uuid,date,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_purchase_order(uuid,uuid,date,text) TO authenticated;
REVOKE ALL ON FUNCTION public.add_purchase_order_item(uuid,uuid,text,numeric,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.add_purchase_order_item(uuid,uuid,text,numeric,numeric) TO authenticated;
REVOKE ALL ON FUNCTION public.transition_purchase_order_lifecycle(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.transition_purchase_order_lifecycle(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_warehouse_stock(
  p_warehouse_id uuid, p_product_id uuid, p_quantity integer, p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE
  v_user uuid;
  v_old integer;
  v_delta integer;
  v_total integer;
  v_new integer;
BEGIN
  v_user := private.require_staff_permission('inventory','update');
  IF p_quantity < 0 THEN RAISE EXCEPTION 'Warehouse stock cannot be negative'; END IF;
  PERFORM 1 FROM public.warehouses WHERE id=p_warehouse_id AND is_active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Warehouse is inactive or missing'; END IF;

  SELECT stock_quantity INTO v_total
  FROM public.products WHERE id=p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.product_id=p_product_id AND pv.is_active=true) THEN
    RAISE EXCEPTION 'Warehouse stock is not variant-aware. Adjust stock on the specific variant.';
  END IF;

  SELECT quantity INTO v_old
  FROM public.warehouse_stock
  WHERE warehouse_id=p_warehouse_id AND product_id=p_product_id
  FOR UPDATE;
  v_old := COALESCE(v_old,0);
  v_delta := p_quantity-v_old;
  v_new := v_total+v_delta;
  IF v_new < 0 THEN RAISE EXCEPTION 'Product stock cannot be negative'; END IF;

  INSERT INTO public.warehouse_stock(warehouse_id,product_id,quantity)
  VALUES(p_warehouse_id,p_product_id,p_quantity)
  ON CONFLICT (warehouse_id,product_id)
  DO UPDATE SET quantity=EXCLUDED.quantity,updated_at=now();

  UPDATE public.products
  SET stock_quantity=v_new,in_stock=(v_new>0),updated_at=now()
  WHERE id=p_product_id;

  IF v_delta <> 0 THEN
    INSERT INTO public.inventory_movements(
      product_id,warehouse_id,movement_type,quantity,previous_stock,new_stock,
      reference_type,notes,created_by
    ) VALUES (
      p_product_id,p_warehouse_id,'adjustment',abs(v_delta),v_old,p_quantity,
      'warehouse_adjustment',p_notes,v_user
    );
  END IF;

  RETURN jsonb_build_object(
    'warehouse_previous',v_old,'warehouse_new',p_quantity,
    'product_previous',v_total,'product_new',v_new,'delta',v_delta
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_warehouse_stock(uuid,uuid,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_warehouse_stock(uuid,uuid,integer,text) TO authenticated;

-- A warehouse cannot be deleted while it holds stock: ON DELETE CASCADE on
-- warehouse_stock would otherwise erase inventory records without reducing
-- the product total or preserving a transfer/adjustment audit trail.
-- Variant deletion must never cascade away inventory movement history or
-- detach variants from active reservations/orders. Retire variants by setting
-- is_active=false after stock has been reconciled to zero.
CREATE OR REPLACE FUNCTION public.prevent_product_variant_delete_with_history()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.stock_quantity > 0 THEN
    RAISE EXCEPTION 'Variant still has stock. Record a stock adjustment to zero before archiving it.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.inventory_movements im WHERE im.variant_id=OLD.id)
     OR EXISTS (SELECT 1 FROM public.inventory_reservations ir WHERE ir.variant_id=OLD.id)
     OR EXISTS (SELECT 1 FROM public.inventory_alerts ia WHERE ia.variant_id=OLD.id)
     OR EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.variant_id=OLD.id) THEN
    RAISE EXCEPTION 'Variant has inventory or order history. Archive it instead of deleting it.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_product_variant_delete_with_history ON public.product_variants;
CREATE TRIGGER trg_prevent_product_variant_delete_with_history
BEFORE DELETE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.prevent_product_variant_delete_with_history();
REVOKE ALL ON FUNCTION public.prevent_product_variant_delete_with_history() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.prevent_warehouse_delete_with_stock()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.warehouse_stock ws
    WHERE ws.warehouse_id=OLD.id AND ws.quantity>0
  ) THEN
    RAISE EXCEPTION 'Warehouse still holds stock. Transfer or write off all stock before deleting it.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_warehouse_delete_with_stock ON public.warehouses;
CREATE TRIGGER trg_prevent_warehouse_delete_with_stock
BEFORE DELETE ON public.warehouses
FOR EACH ROW EXECUTE FUNCTION public.prevent_warehouse_delete_with_stock();
REVOKE ALL ON FUNCTION public.prevent_warehouse_delete_with_stock() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.transition_purchase_order_lifecycle(
  p_purchase_order_id uuid,
  p_status text,
  p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private
AS $$
DECLARE
  v_user uuid;
  v_po public.purchase_orders%ROWTYPE;
  v_allowed boolean := false;
  v_item_count integer;
  v_remaining numeric;
BEGIN
  v_user := private.require_staff_permission('procurement','update');

  IF p_status NOT IN ('draft','pending','sent','ordered','partial','received','cancelled')
    THEN RAISE EXCEPTION 'Invalid purchase order status'; END IF;

  SELECT * INTO v_po
  FROM public.purchase_orders
  WHERE id=p_purchase_order_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase order not found'; END IF;

  IF v_po.status = p_status THEN
    RETURN jsonb_build_object('success',true,'purchase_order_id',p_purchase_order_id,
                              'status',p_status,'unchanged',true);
  END IF;

  v_allowed := CASE v_po.status
    WHEN 'draft' THEN p_status IN ('pending','sent','cancelled')
    WHEN 'pending' THEN p_status IN ('sent','ordered','cancelled')
    WHEN 'sent' THEN p_status IN ('ordered','cancelled')
    WHEN 'ordered' THEN p_status IN ('partial','received','cancelled')
    WHEN 'partial' THEN p_status IN ('received','cancelled')
    WHEN 'received' THEN false
    WHEN 'cancelled' THEN false
    ELSE false
  END;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Invalid purchase order transition from % to %',v_po.status,p_status;
  END IF;

  SELECT count(*) INTO v_item_count
  FROM public.purchase_order_items
  WHERE purchase_order_id=p_purchase_order_id;

  IF p_status IN ('pending','sent','ordered') AND v_item_count=0
    THEN RAISE EXCEPTION 'Purchase order must contain at least one line item'; END IF;
  IF p_status IN ('pending','sent','ordered') AND EXISTS (
    SELECT 1 FROM public.purchase_order_items
    WHERE purchase_order_id=p_purchase_order_id AND product_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Every stock purchase order line must be linked to a product before ordering';
  END IF;
  IF p_status IN ('pending','sent','ordered') AND EXISTS (
    SELECT 1 FROM public.purchase_order_items
    WHERE purchase_order_id=p_purchase_order_id
      AND (quantity_ordered <> trunc(quantity_ordered) OR quantity_received <> trunc(quantity_received))
  ) THEN
    RAISE EXCEPTION 'Purchase order inventory quantities must be whole units';
  END IF;

  IF p_status='ordered' AND v_po.warehouse_id IS NULL
    THEN RAISE EXCEPTION 'Purchase order requires a receiving warehouse'; END IF;

  IF p_status='received' THEN
    SELECT coalesce(sum(greatest(quantity_ordered-quantity_received,0)),0)
      INTO v_remaining
    FROM public.purchase_order_items
    WHERE purchase_order_id=p_purchase_order_id;
    IF v_remaining > 0 THEN RAISE EXCEPTION 'Purchase order still has unreceived quantities'; END IF;
  END IF;

  UPDATE public.purchase_orders
  SET status=p_status,
      actual_delivery_date=CASE WHEN p_status='received' THEN coalesce(actual_delivery_date,current_date)
                                ELSE actual_delivery_date END,
      updated_at=now()
  WHERE id=p_purchase_order_id;

  INSERT INTO public.procurement_events(
    purchase_order_id,event_type,from_status,to_status,note,created_by
  )
  VALUES(
    p_purchase_order_id,p_status,v_po.status,p_status,
    NULLIF(trim(p_note),''),v_user
  );

  RETURN jsonb_build_object('success',true,'purchase_order_id',p_purchase_order_id,
                            'status',p_status,'updated_by',v_user);
END;
$$;

CREATE OR REPLACE FUNCTION public.add_purchase_order_item(
  p_purchase_order_id uuid,
  p_product_id uuid,
  p_description text,
  p_quantity numeric,
  p_unit_cost numeric
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private
AS $$
DECLARE v_user uuid; v_id uuid; v_total numeric; v_status text;
BEGIN
  v_user := private.require_staff_permission('procurement','insert');

  IF p_product_id IS NULL THEN
    RAISE EXCEPTION 'Select a catalogue product for every stock purchase order line';
  END IF;
  IF p_quantity <= 0 OR p_quantity <> trunc(p_quantity) OR p_unit_cost < 0 THEN
    RAISE EXCEPTION 'Quantity must be a positive whole number and unit cost cannot be negative';
  END IF;
  IF NULLIF(trim(p_description),'') IS NULL THEN
    RAISE EXCEPTION 'Item description is required';
  END IF;

  SELECT status INTO v_status
  FROM public.purchase_orders
  WHERE id=p_purchase_order_id
  FOR UPDATE;
  IF NOT FOUND OR v_status NOT IN ('draft','pending') THEN
    RAISE EXCEPTION 'Purchase order is not editable';
  END IF;

  PERFORM 1 FROM public.products WHERE id=p_product_id AND is_active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found or inactive'; END IF;
  IF EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.product_id=p_product_id AND pv.is_active=true) THEN
    RAISE EXCEPTION 'Purchase order receiving is not variant-aware. Use the variant stock adjustment until variant receiving is supported.';
  END IF;

  INSERT INTO public.purchase_order_items(
    purchase_order_id,product_id,description,quantity_ordered,unit_cost,total_price
  )
  VALUES(
    p_purchase_order_id,p_product_id,trim(p_description),p_quantity,p_unit_cost,
    round(p_quantity*p_unit_cost,2)
  )
  RETURNING id INTO v_id;

  SELECT coalesce(sum(quantity_ordered*unit_cost),0)
    INTO v_total
  FROM public.purchase_order_items
  WHERE purchase_order_id=p_purchase_order_id;

  UPDATE public.purchase_orders
  SET total_amount=round(v_total,2),updated_at=now()
  WHERE id=p_purchase_order_id;

  INSERT INTO public.procurement_events(
    purchase_order_id,event_type,note,created_by
  )
  VALUES(
    p_purchase_order_id,'item_added',
    format('Added item %s, qty %s at %s',trim(p_description),p_quantity,p_unit_cost),
    v_user
  );

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_stock(
  p_from_warehouse_id uuid, p_to_warehouse_id uuid, p_product_id uuid, p_quantity integer, p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE v_user uuid; v_from integer; v_to integer; v_id uuid := gen_random_uuid(); v_no text;
BEGIN
  v_user := private.require_staff_permission('inventory','update');
  IF p_from_warehouse_id = p_to_warehouse_id THEN RAISE EXCEPTION 'Source and destination must differ'; END IF;
  IF p_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;
  PERFORM 1 FROM public.products WHERE id=p_product_id AND is_active=true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product is inactive or missing'; END IF;
  IF EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.product_id=p_product_id AND pv.is_active=true) THEN
    RAISE EXCEPTION 'Warehouse transfers are not variant-aware. Adjust stock on the specific variant.';
  END IF;
  PERFORM 1 FROM public.warehouses WHERE id=p_from_warehouse_id AND is_active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Source warehouse is inactive or missing'; END IF;
  PERFORM 1 FROM public.warehouses WHERE id=p_to_warehouse_id AND is_active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Destination warehouse is inactive or missing'; END IF;
  SELECT quantity INTO v_from FROM public.warehouse_stock WHERE warehouse_id=p_from_warehouse_id AND product_id=p_product_id FOR UPDATE;
  v_from := COALESCE(v_from,0); IF v_from < p_quantity THEN RAISE EXCEPTION 'Insufficient stock at source warehouse'; END IF;
  SELECT quantity INTO v_to FROM public.warehouse_stock WHERE warehouse_id=p_to_warehouse_id AND product_id=p_product_id FOR UPDATE;
  v_to := COALESCE(v_to,0);
  UPDATE public.warehouse_stock SET quantity=v_from-p_quantity,updated_at=now() WHERE warehouse_id=p_from_warehouse_id AND product_id=p_product_id;
  INSERT INTO public.warehouse_stock(warehouse_id,product_id,quantity) VALUES(p_to_warehouse_id,p_product_id,v_to+p_quantity)
    ON CONFLICT (warehouse_id,product_id) DO UPDATE SET quantity=EXCLUDED.quantity,updated_at=now();
  v_no := 'TR-' || to_char(now(),'YYYYMMDDHH24MISS') || '-' || substr(replace(v_id::text,'-',''),1,6);
  INSERT INTO public.stock_transfers(id,transfer_number,from_warehouse_id,to_warehouse_id,product_id,quantity,status,notes,created_by)
  VALUES(v_id,v_no,p_from_warehouse_id,p_to_warehouse_id,p_product_id,p_quantity,'completed',p_notes,v_user);
  INSERT INTO public.inventory_movements(product_id,warehouse_id,movement_type,quantity,previous_stock,new_stock,reference_type,reference_id,notes,created_by)
  VALUES(p_product_id,p_from_warehouse_id,'out',p_quantity,v_from,v_from-p_quantity,'transfer',v_id::text,p_notes,v_user),
        (p_product_id,p_to_warehouse_id,'in',p_quantity,v_to,v_to+p_quantity,'transfer',v_id::text,p_notes,v_user);
  RETURN jsonb_build_object('id',v_id,'transfer_number',v_no,'from_quantity',v_from-p_quantity,'to_quantity',v_to+p_quantity);
END;
$$;

CREATE OR REPLACE FUNCTION public.receive_purchase_order_item(p_item_id uuid, p_quantity numeric)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE
  v_user uuid; v_item public.purchase_order_items%ROWTYPE; v_po public.purchase_orders%ROWTYPE;
  v_delta numeric; v_product_stock integer; v_wh integer; v_prev integer; v_new integer; v_purchase_order_id uuid;
BEGIN
  v_user := private.require_staff_permission('inventory','update');
  IF p_quantity <= 0 OR p_quantity <> trunc(p_quantity) THEN
    RAISE EXCEPTION 'Receipt quantity must be a positive whole number';
  END IF;
  SELECT purchase_order_id INTO v_purchase_order_id
  FROM public.purchase_order_items WHERE id=p_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase order item not found'; END IF;

  SELECT * INTO v_po FROM public.purchase_orders WHERE id=v_purchase_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase order not found'; END IF;
  IF v_po.status NOT IN ('ordered','partial') THEN
    RAISE EXCEPTION 'Purchase order is not open for receiving';
  END IF;

  SELECT * INTO v_item FROM public.purchase_order_items WHERE id=p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase order item not found'; END IF;
  v_delta := p_quantity;
  IF v_item.quantity_received + v_delta > v_item.quantity_ordered THEN RAISE EXCEPTION 'Cannot receive more than ordered'; END IF;
  IF v_item.product_id IS NULL THEN RAISE EXCEPTION 'Receipt requires a linked product'; END IF;
  SELECT stock_quantity INTO v_product_stock FROM public.products WHERE id=v_item.product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.product_id=v_item.product_id AND pv.is_active=true) THEN
    RAISE EXCEPTION 'Purchase order receiving is not variant-aware. Do not receive this line against parent-product stock.';
  END IF;
  v_new := v_product_stock + v_delta::integer;
  UPDATE public.products SET stock_quantity=v_new,in_stock=true,updated_at=now() WHERE id=v_item.product_id;
  UPDATE public.purchase_order_items SET quantity_received=quantity_received+v_delta WHERE id=p_item_id;
  IF v_po.warehouse_id IS NOT NULL THEN
    SELECT quantity INTO v_prev FROM public.warehouse_stock WHERE warehouse_id=v_po.warehouse_id AND product_id=v_item.product_id FOR UPDATE;
    v_prev := COALESCE(v_prev,0); v_wh := v_prev + v_delta::integer;
    INSERT INTO public.warehouse_stock(warehouse_id,product_id,quantity) VALUES(v_po.warehouse_id,v_item.product_id,v_wh)
      ON CONFLICT (warehouse_id,product_id) DO UPDATE SET quantity=EXCLUDED.quantity,updated_at=now();
  END IF;
  INSERT INTO public.inventory_movements(product_id,warehouse_id,movement_type,quantity,previous_stock,new_stock,reference_type,reference_id,notes,created_by)
  VALUES(v_item.product_id,v_po.warehouse_id,'in',v_delta::integer,v_product_stock,v_new,'purchase_receipt',v_po.id::text,'Goods received',v_user);
  UPDATE public.purchase_orders SET status=CASE WHEN NOT EXISTS(SELECT 1 FROM public.purchase_order_items WHERE purchase_order_id=v_po.id AND quantity_received < quantity_ordered) THEN 'received' ELSE 'partial' END,
    actual_delivery_date=CASE WHEN NOT EXISTS(SELECT 1 FROM public.purchase_order_items WHERE purchase_order_id=v_po.id AND quantity_received < quantity_ordered) THEN current_date ELSE actual_delivery_date END,updated_at=now() WHERE id=v_po.id;
  RETURN jsonb_build_object('purchase_order_id',v_po.id,'item_id',p_item_id,'received',v_item.quantity_received+v_delta,'stock',v_new);
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
        PERFORM 1 FROM public.products WHERE id=v_item.product_id FOR UPDATE;
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
        product_id,variant_id,movement_type,quantity,reference_type,reference_id,notes,created_by
      ) VALUES(
        v_item.product_id,v_item.variant_id,'out',v_item.qty,'order',p_order_id::text,
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


-- Low-stock alerts were readable/resolvable in the admin UI but no database
-- lifecycle created them. Maintain one active alert per product or variant and
-- resolve it automatically when stock recovers or the item is deactivated.
WITH ranked_product_alerts AS (
  SELECT id,row_number() OVER (PARTITION BY product_id ORDER BY created_at DESC,id DESC) AS rn
  FROM public.inventory_alerts
  WHERE product_id IS NOT NULL AND variant_id IS NULL AND alert_type='low_stock' AND is_resolved=false
)
UPDATE public.inventory_alerts
SET is_resolved=true,resolved_at=now()
WHERE id IN (SELECT id FROM ranked_product_alerts WHERE rn>1);

WITH ranked_variant_alerts AS (
  SELECT id,row_number() OVER (PARTITION BY variant_id ORDER BY created_at DESC,id DESC) AS rn
  FROM public.inventory_alerts
  WHERE variant_id IS NOT NULL AND alert_type='low_stock' AND is_resolved=false
)
UPDATE public.inventory_alerts
SET is_resolved=true,resolved_at=now()
WHERE id IN (SELECT id FROM ranked_variant_alerts WHERE rn>1);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_alerts_active_product_low_stock_uidx
ON public.inventory_alerts(product_id)
WHERE product_id IS NOT NULL AND variant_id IS NULL AND alert_type='low_stock' AND is_resolved=false;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_alerts_active_variant_low_stock_uidx
ON public.inventory_alerts(variant_id)
WHERE variant_id IS NOT NULL AND alert_type='low_stock' AND is_resolved=false;

CREATE OR REPLACE FUNCTION public.sync_product_low_stock_alert()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_active
     AND NOT EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.product_id=NEW.id AND pv.is_active=true)
     AND NEW.stock_quantity <= NEW.low_stock_threshold THEN
    INSERT INTO public.inventory_alerts(product_id,variant_id,alert_type,threshold,current_stock,is_resolved)
    VALUES(NEW.id,NULL,'low_stock',NEW.low_stock_threshold,NEW.stock_quantity,false)
    ON CONFLICT (product_id)
      WHERE product_id IS NOT NULL AND variant_id IS NULL AND alert_type='low_stock' AND is_resolved=false
    DO UPDATE SET threshold=EXCLUDED.threshold,current_stock=EXCLUDED.current_stock;
  ELSE
    UPDATE public.inventory_alerts
    SET is_resolved=true,resolved_at=now()
    WHERE product_id=NEW.id AND variant_id IS NULL AND alert_type='low_stock' AND is_resolved=false;
  END IF;

  IF NOT NEW.is_active THEN
    UPDATE public.inventory_alerts
    SET is_resolved=true,resolved_at=now()
    WHERE product_id=NEW.id AND variant_id IS NOT NULL AND alert_type='low_stock' AND is_resolved=false;
  ELSE
    INSERT INTO public.inventory_alerts(product_id,variant_id,alert_type,threshold,current_stock,is_resolved)
    SELECT pv.product_id,pv.id,'low_stock',pv.low_stock_threshold,pv.stock_quantity,false
    FROM public.product_variants pv
    WHERE pv.product_id=NEW.id AND pv.is_active=true
      AND pv.stock_quantity<=pv.low_stock_threshold
    ON CONFLICT (variant_id)
      WHERE variant_id IS NOT NULL AND alert_type='low_stock' AND is_resolved=false
    DO UPDATE SET threshold=EXCLUDED.threshold,current_stock=EXCLUDED.current_stock;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_variant_low_stock_alert()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_product_active boolean;
BEGIN
  SELECT is_active INTO v_product_active
  FROM public.products WHERE id=NEW.product_id;

  IF NEW.is_active AND coalesce(v_product_active,false)
     AND NEW.stock_quantity <= NEW.low_stock_threshold THEN
    INSERT INTO public.inventory_alerts(product_id,variant_id,alert_type,threshold,current_stock,is_resolved)
    VALUES(NEW.product_id,NEW.id,'low_stock',NEW.low_stock_threshold,NEW.stock_quantity,false)
    ON CONFLICT (variant_id)
      WHERE variant_id IS NOT NULL AND alert_type='low_stock' AND is_resolved=false
    DO UPDATE SET threshold=EXCLUDED.threshold,current_stock=EXCLUDED.current_stock;
  ELSE
    UPDATE public.inventory_alerts
    SET is_resolved=true,resolved_at=now()
    WHERE variant_id=NEW.id AND alert_type='low_stock' AND is_resolved=false;
  END IF;

  IF EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.product_id=NEW.product_id AND pv.is_active=true) THEN
    UPDATE public.inventory_alerts
    SET is_resolved=true,resolved_at=now()
    WHERE product_id=NEW.product_id AND variant_id IS NULL AND alert_type='low_stock' AND is_resolved=false;
  ELSIF coalesce(v_product_active,false) THEN
    INSERT INTO public.inventory_alerts(product_id,variant_id,alert_type,threshold,current_stock,is_resolved)
    SELECT p.id,NULL,'low_stock',p.low_stock_threshold,p.stock_quantity,false
    FROM public.products p
    WHERE p.id=NEW.product_id AND p.stock_quantity<=p.low_stock_threshold
    ON CONFLICT (product_id)
      WHERE product_id IS NOT NULL AND variant_id IS NULL AND alert_type='low_stock' AND is_resolved=false
    DO UPDATE SET threshold=EXCLUDED.threshold,current_stock=EXCLUDED.current_stock;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_low_stock_alert ON public.products;
CREATE TRIGGER trg_sync_product_low_stock_alert
AFTER INSERT OR UPDATE OF stock_quantity,low_stock_threshold,is_active
ON public.products FOR EACH ROW EXECUTE FUNCTION public.sync_product_low_stock_alert();

DROP TRIGGER IF EXISTS trg_sync_variant_low_stock_alert ON public.product_variants;
CREATE TRIGGER trg_sync_variant_low_stock_alert
AFTER INSERT OR UPDATE OF stock_quantity,low_stock_threshold,is_active
ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.sync_variant_low_stock_alert();

REVOKE ALL ON FUNCTION public.sync_product_low_stock_alert() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sync_variant_low_stock_alert() FROM PUBLIC,anon,authenticated;

-- Backfill current low-stock state once so the admin queue reflects existing
-- inventory as well as future stock movements.
INSERT INTO public.inventory_alerts(product_id,variant_id,alert_type,threshold,current_stock,is_resolved)
SELECT p.id,NULL,'low_stock',p.low_stock_threshold,p.stock_quantity,false
FROM public.products p
WHERE p.is_active=true
  AND p.stock_quantity<=p.low_stock_threshold
  AND NOT EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.product_id=p.id AND pv.is_active=true)
ON CONFLICT (product_id)
  WHERE product_id IS NOT NULL AND variant_id IS NULL AND alert_type='low_stock' AND is_resolved=false
DO UPDATE SET threshold=EXCLUDED.threshold,current_stock=EXCLUDED.current_stock;

INSERT INTO public.inventory_alerts(product_id,variant_id,alert_type,threshold,current_stock,is_resolved)
SELECT pv.product_id,pv.id,'low_stock',pv.low_stock_threshold,pv.stock_quantity,false
FROM public.product_variants pv
JOIN public.products p ON p.id=pv.product_id AND p.is_active=true
WHERE pv.is_active=true AND pv.stock_quantity<=pv.low_stock_threshold
ON CONFLICT (variant_id)
  WHERE variant_id IS NOT NULL AND alert_type='low_stock' AND is_resolved=false
DO UPDATE SET threshold=EXCLUDED.threshold,current_stock=EXCLUDED.current_stock;

