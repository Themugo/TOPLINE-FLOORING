-- Phases 9-11: Catalogue, Inventory & Procurement transaction engine
-- All sensitive stock mutations are transactional SECURITY DEFINER RPCs.

ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_warehouse ON public.purchase_orders(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product ON public.purchase_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_created ON public.inventory_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_product ON public.warehouse_stock(product_id);

CREATE OR REPLACE FUNCTION private.require_staff_permission(p_resource text, p_action text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.staff_role_assignments ra
    JOIN public.staff_role_permissions rp ON rp.role_id = ra.role_id
    JOIN public.staff_permissions p ON p.id = rp.permission_id
    JOIN public.staff_profiles sp ON sp.id = ra.staff_id
    WHERE sp.user_id = v_user AND sp.is_active = true
      AND p.resource = p_resource AND p.action = p_action
  ) THEN RAISE EXCEPTION 'Permission denied: %.%', p_resource, p_action; END IF;
  RETURN v_user;
END;
$$;

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
  v_user uuid; v_old integer; v_new integer; v_wh_old integer := 0; v_wh_new integer;
BEGIN
  v_user := private.require_staff_permission('inventory','update');
  IF p_quantity = 0 THEN RAISE EXCEPTION 'Quantity must not be zero'; END IF;
  IF p_movement_type NOT IN ('in','out','adjustment') THEN RAISE EXCEPTION 'Invalid movement type'; END IF;

  SELECT stock_quantity INTO v_old FROM public.products WHERE id=p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  v_new := CASE WHEN p_movement_type='adjustment' THEN p_quantity ELSE v_old + CASE WHEN p_movement_type='in' THEN p_quantity ELSE -p_quantity END END;
  IF v_new < 0 THEN RAISE EXCEPTION 'Insufficient product stock'; END IF;

  UPDATE public.products SET stock_quantity=v_new, in_stock=(v_new>0), updated_at=now() WHERE id=p_product_id;

  IF p_warehouse_id IS NOT NULL THEN
    SELECT quantity INTO v_wh_old FROM public.warehouse_stock WHERE warehouse_id=p_warehouse_id AND product_id=p_product_id FOR UPDATE;
    v_wh_old := COALESCE(v_wh_old,0);
    v_wh_new := CASE WHEN p_movement_type='adjustment' THEN p_quantity ELSE v_wh_old + CASE WHEN p_movement_type='in' THEN p_quantity ELSE -p_quantity END END;
    IF v_wh_new < 0 THEN RAISE EXCEPTION 'Insufficient warehouse stock'; END IF;
    INSERT INTO public.warehouse_stock(warehouse_id,product_id,quantity,updated_at)
    VALUES(p_warehouse_id,p_product_id,v_wh_new,now())
    ON CONFLICT (warehouse_id,product_id) DO UPDATE SET quantity=EXCLUDED.quantity,updated_at=now();
  END IF;

  INSERT INTO public.inventory_movements(product_id,warehouse_id,movement_type,quantity,previous_stock,new_stock,reference_type,reference_id,notes,created_by)
  VALUES(p_product_id,p_warehouse_id,p_movement_type,ABS(p_quantity),v_old,v_new,p_reference_type,p_reference_id,p_notes,v_user);
  RETURN jsonb_build_object('product_id',p_product_id,'previous_stock',v_old,'new_stock',v_new,'warehouse_previous',v_wh_old,'warehouse_new',v_wh_new);
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
  v_delta numeric; v_product_stock integer; v_wh integer; v_prev integer; v_new integer;
BEGIN
  v_user := private.require_staff_permission('inventory','update');
  IF p_quantity <= 0 THEN RAISE EXCEPTION 'Receipt quantity must be positive'; END IF;
  SELECT * INTO v_item FROM public.purchase_order_items WHERE id=p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase order item not found'; END IF;
  SELECT * INTO v_po FROM public.purchase_orders WHERE id=v_item.purchase_order_id FOR UPDATE;
  v_delta := p_quantity;
  IF v_item.quantity_received + v_delta > v_item.quantity_ordered THEN RAISE EXCEPTION 'Cannot receive more than ordered'; END IF;
  IF v_item.product_id IS NULL THEN RAISE EXCEPTION 'Receipt requires a linked product'; END IF;
  SELECT stock_quantity INTO v_product_stock FROM public.products WHERE id=v_item.product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
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

CREATE OR REPLACE FUNCTION public.create_purchase_order(
  p_supplier_id uuid, p_warehouse_id uuid, p_expected_date date DEFAULT NULL, p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE v_user uuid; v_id uuid; v_no text;
BEGIN
  v_user := private.require_staff_permission('procurement','insert');
  IF p_warehouse_id IS NULL THEN RAISE EXCEPTION 'Receiving warehouse is required'; END IF;
  v_id := gen_random_uuid(); v_no := 'PO-' || to_char(now(),'YYYYMMDDHH24MISS') || '-' || substr(replace(v_id::text,'-',''),1,6);
  INSERT INTO public.purchase_orders(id,po_number,supplier_id,warehouse_id,expected_date,status,notes,created_by)
  VALUES(v_id,v_no,p_supplier_id,p_warehouse_id,p_expected_date,'draft',p_notes,v_user);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_purchase_order_item(
  p_purchase_order_id uuid, p_product_id uuid, p_description text, p_quantity numeric, p_unit_cost numeric
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE v_user uuid; v_id uuid;
BEGIN
  v_user := private.require_staff_permission('procurement','insert');
  IF p_quantity <= 0 OR p_unit_cost < 0 THEN RAISE EXCEPTION 'Invalid quantity or cost'; END IF;
  PERFORM 1 FROM public.purchase_orders WHERE id=p_purchase_order_id AND status IN ('draft','pending');
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase order is not editable'; END IF;
  IF p_product_id IS NOT NULL THEN PERFORM 1 FROM public.products WHERE id=p_product_id AND is_active=true; IF NOT FOUND THEN RAISE EXCEPTION 'Product not found or inactive'; END IF; END IF;
  INSERT INTO public.purchase_order_items(purchase_order_id,product_id,description,quantity_ordered,unit_cost,total_price)
  VALUES(p_purchase_order_id,p_product_id,p_description,p_quantity,p_unit_cost,round(p_quantity*p_unit_cost,2)) RETURNING id INTO v_id;
  UPDATE public.purchase_orders SET total_amount=(SELECT COALESCE(SUM(quantity_ordered*unit_cost),0) FROM public.purchase_order_items WHERE purchase_order_id=p_purchase_order_id),updated_at=now() WHERE id=p_purchase_order_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_product_stock(uuid,integer,text,uuid,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_stock(uuid,uuid,uuid,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.receive_purchase_order_item(uuid,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_purchase_order(uuid,uuid,date,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_purchase_order_item(uuid,uuid,text,numeric,numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_warehouse_stock(
  p_warehouse_id uuid, p_product_id uuid, p_quantity integer, p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE v_user uuid; v_old integer; v_delta integer; v_total integer; v_new integer;
BEGIN
  v_user := private.require_staff_permission('inventory','update');
  IF p_quantity < 0 THEN RAISE EXCEPTION 'Warehouse stock cannot be negative'; END IF;
  SELECT quantity INTO v_old FROM public.warehouse_stock WHERE warehouse_id=p_warehouse_id AND product_id=p_product_id FOR UPDATE;
  v_old := COALESCE(v_old,0); v_delta := p_quantity-v_old;
  SELECT stock_quantity INTO v_total FROM public.products WHERE id=p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  v_new := v_total+v_delta; IF v_new < 0 THEN RAISE EXCEPTION 'Product stock cannot be negative'; END IF;
  INSERT INTO public.warehouse_stock(warehouse_id,product_id,quantity) VALUES(p_warehouse_id,p_product_id,p_quantity)
    ON CONFLICT (warehouse_id,product_id) DO UPDATE SET quantity=EXCLUDED.quantity,updated_at=now();
  UPDATE public.products SET stock_quantity=v_new,in_stock=(v_new>0),updated_at=now() WHERE id=p_product_id;
  IF v_delta <> 0 THEN
    INSERT INTO public.inventory_movements(product_id,warehouse_id,movement_type,quantity,previous_stock,new_stock,reference_type,notes,created_by)
    VALUES(p_product_id,p_warehouse_id,'adjustment',ABS(v_delta),v_old,p_quantity,'warehouse_adjustment',p_notes,v_user);
  END IF;
  RETURN jsonb_build_object('warehouse_previous',v_old,'warehouse_new',p_quantity,'product_previous',v_total,'product_new',v_new);
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_warehouse_stock(uuid,uuid,integer,text) TO authenticated;
