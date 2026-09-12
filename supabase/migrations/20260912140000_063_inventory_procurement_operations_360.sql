-- Phase 11: Inventory & Procurement Operations 360
-- Direct client DML is intentionally revoked; sensitive mutations must use the RPC boundary below.
REVOKE INSERT, UPDATE, DELETE ON public.suppliers FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.purchase_orders FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.purchase_order_items FROM authenticated;

-- Hardens the existing catalogue/inventory/procurement transaction engine.
-- Canonical tables remain authoritative; all sensitive mutations use SECURITY DEFINER RPCs.

CREATE TABLE IF NOT EXISTS public.procurement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'created','item_added','item_removed','submitted','sent','ordered',
    'partial','received','cancelled','reopened','note'
  )),
  from_status text,
  to_status text,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS procurement_events_po_idx
  ON public.procurement_events(purchase_order_id, created_at DESC);

ALTER TABLE public.procurement_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.procurement_events FROM anon, authenticated;
GRANT SELECT ON public.procurement_events TO authenticated;

DROP POLICY IF EXISTS procurement_events_read ON public.procurement_events;
CREATE POLICY procurement_events_read
  ON public.procurement_events
  FOR SELECT TO authenticated
  USING (private.current_user_has_permission('procurement','read'));

CREATE OR REPLACE FUNCTION public.create_supplier(
  p_name text,
  p_contact_person text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private
AS $$
DECLARE v_user uuid; v_id uuid;
BEGIN
  v_user := private.require_staff_permission('procurement','insert');
  IF NULLIF(trim(p_name),'') IS NULL THEN RAISE EXCEPTION 'Supplier name is required'; END IF;

  INSERT INTO public.suppliers(name,contact_person,email,phone,address,notes,is_active)
  VALUES(trim(p_name),NULLIF(trim(p_contact_person),''),NULLIF(trim(p_email),''),
         NULLIF(trim(p_phone),''),NULLIF(trim(p_address),''),NULLIF(trim(p_notes),''),true)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_supplier(
  p_supplier_id uuid,
  p_name text,
  p_contact_person text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_is_active boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private
AS $$
DECLARE v_user uuid;
BEGIN
  v_user := private.require_staff_permission('procurement','update');
  IF NULLIF(trim(p_name),'') IS NULL THEN RAISE EXCEPTION 'Supplier name is required'; END IF;

  UPDATE public.suppliers
  SET name=trim(p_name),
      contact_person=NULLIF(trim(p_contact_person),''),
      email=NULLIF(trim(p_email),''),
      phone=NULLIF(trim(p_phone),''),
      address=NULLIF(trim(p_address),''),
      notes=NULLIF(trim(p_notes),''),
      is_active=coalesce(p_is_active,true),
      updated_at=now()
  WHERE id=p_supplier_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Supplier not found'; END IF;
  RETURN jsonb_build_object('success',true,'supplier_id',p_supplier_id,'updated_by',v_user);
END;
$$;

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
DECLARE v_user uuid; v_id uuid; v_total numeric;
BEGIN
  v_user := private.require_staff_permission('procurement','insert');

  IF p_quantity <= 0 OR p_unit_cost < 0 THEN
    RAISE EXCEPTION 'Invalid quantity or unit cost';
  END IF;
  IF NULLIF(trim(p_description),'') IS NULL THEN
    RAISE EXCEPTION 'Item description is required';
  END IF;

  PERFORM 1 FROM public.purchase_orders
  WHERE id=p_purchase_order_id AND status IN ('draft','pending');
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase order is not editable'; END IF;

  IF p_product_id IS NOT NULL THEN
    PERFORM 1 FROM public.products WHERE id=p_product_id AND is_active=true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product not found or inactive'; END IF;
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

CREATE OR REPLACE FUNCTION public.remove_purchase_order_item(
  p_item_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private
AS $$
DECLARE
  v_user uuid; v_item public.purchase_order_items%ROWTYPE; v_total numeric;
BEGIN
  v_user := private.require_staff_permission('procurement','update');

  SELECT * INTO v_item
  FROM public.purchase_order_items
  WHERE id=p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase order item not found'; END IF;
  IF v_item.quantity_received > 0 THEN RAISE EXCEPTION 'Received items cannot be removed'; END IF;

  PERFORM 1 FROM public.purchase_orders
  WHERE id=v_item.purchase_order_id AND status IN ('draft','pending');
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase order is not editable'; END IF;

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
$$;

CREATE OR REPLACE FUNCTION public.reconcile_inventory_procurement()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private
AS $$
DECLARE
  v_user uuid;
  v_product_discrepancies jsonb;
  v_warehouse_orphans jsonb;
BEGIN
  v_user := private.require_staff_permission('inventory','read');

  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.product_name),'[]'::jsonb)
  INTO v_product_discrepancies
  FROM (
    SELECT
      p.id AS product_id,
      p.name AS product_name,
      p.stock_quantity AS product_stock,
      coalesce(sum(ws.quantity),0) AS warehouse_stock,
      p.stock_quantity - coalesce(sum(ws.quantity),0) AS discrepancy
    FROM public.products p
    LEFT JOIN public.warehouse_stock ws ON ws.product_id=p.id
    WHERE p.is_active=true
    GROUP BY p.id,p.name,p.stock_quantity
    HAVING p.stock_quantity <> coalesce(sum(ws.quantity),0)
  ) x;

  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.warehouse_name,x.product_name),'[]'::jsonb)
  INTO v_warehouse_orphans
  FROM (
    SELECT ws.warehouse_id,w.name AS warehouse_name,ws.product_id,p.name AS product_name,ws.quantity
    FROM public.warehouse_stock ws
    JOIN public.warehouses w ON w.id=ws.warehouse_id
    LEFT JOIN public.products p ON p.id=ws.product_id
    WHERE w.is_active=true AND (p.id IS NULL OR p.is_active=false)
  ) x;

  RETURN jsonb_build_object(
    'checked_by',v_user,
    'checked_at',now(),
    'product_discrepancies',v_product_discrepancies,
    'warehouse_orphans',v_warehouse_orphans,
    'discrepancy_count',jsonb_array_length(v_product_discrepancies),
    'orphan_count',jsonb_array_length(v_warehouse_orphans)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_inventory_procurement_operations_360(
  p_days integer DEFAULT 30
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private
AS $$
DECLARE
  v_user uuid;
  v_days integer := greatest(1,least(coalesce(p_days,30),365));
  v_since timestamptz;
  v_result jsonb;
BEGIN
  v_user := private.require_staff_permission('reports','read');
  v_since := now()-make_interval(days=>v_days);

  SELECT jsonb_build_object(
    'days',v_days,
    'active_products',(SELECT count(*) FROM public.products WHERE is_active=true),
    'low_stock',(SELECT count(*) FROM public.products WHERE is_active=true AND stock_quantity<=low_stock_threshold),
    'active_warehouses',(SELECT count(*) FROM public.warehouses WHERE is_active=true),
    'active_suppliers',(SELECT count(*) FROM public.suppliers WHERE is_active=true),
    'open_purchase_orders',(SELECT count(*) FROM public.purchase_orders WHERE status NOT IN ('received','cancelled')),
    'pending_receipts',(SELECT count(*) FROM public.purchase_orders WHERE status IN ('ordered','partial','sent','pending')),
    'procurement_value',(SELECT coalesce(sum(total_amount),0) FROM public.purchase_orders
                          WHERE created_at>=v_since AND status<>'cancelled'),
    'received_value',(SELECT coalesce(sum(total_amount),0) FROM public.purchase_orders
                      WHERE actual_delivery_date>=current_date-v_days AND status='received'),
    'movement_count',(SELECT count(*) FROM public.inventory_movements WHERE created_at>=v_since),
    'stock_units',(SELECT coalesce(sum(stock_quantity),0) FROM public.products WHERE is_active=true),
    'active_alerts',(SELECT count(*) FROM public.inventory_alerts WHERE is_resolved=false),
    'status_breakdown',(
      SELECT coalesce(jsonb_object_agg(status,cnt),'{}'::jsonb)
      FROM (
        SELECT status,count(*) cnt
        FROM public.purchase_orders
        WHERE status IS NOT NULL
        GROUP BY status
      ) s
    )
  ) INTO v_result;

  RETURN v_result || jsonb_build_object('checked_by',v_user,'generated_at',now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_supplier(text,text,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_supplier(uuid,text,text,text,text,text,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_purchase_order_lifecycle(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_purchase_order_item(uuid,uuid,text,numeric,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_purchase_order_item(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_inventory_procurement() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_inventory_procurement_operations_360(integer) TO authenticated;
