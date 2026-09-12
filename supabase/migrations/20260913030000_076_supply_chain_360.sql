-- Operation 3: Supply Chain 360
-- Inventory -> procurement -> warehouse -> project allocation -> consumption -> reconciliation.

CREATE TABLE IF NOT EXISTS public.supply_chain_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('warehouse_created','warehouse_updated','warehouse_deactivated','receipt','allocation','issue','return','transfer','adjustment','reconciliation')),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  installation_id uuid REFERENCES public.installations(id) ON DELETE SET NULL,
  quantity numeric(12,3),
  reference_id text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS supply_chain_events_created_idx ON public.supply_chain_events(created_at DESC);
CREATE INDEX IF NOT EXISTS supply_chain_events_product_idx ON public.supply_chain_events(product_id,created_at DESC);
CREATE INDEX IF NOT EXISTS supply_chain_events_installation_idx ON public.supply_chain_events(installation_id,created_at DESC);
ALTER TABLE public.supply_chain_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.supply_chain_events FROM anon, authenticated;
GRANT SELECT ON public.supply_chain_events TO authenticated;
DROP POLICY IF EXISTS supply_chain_events_read ON public.supply_chain_events;
CREATE POLICY supply_chain_events_read ON public.supply_chain_events FOR SELECT TO authenticated USING (private.current_user_has_permission('inventory','read'));

-- Warehouses are controlled operational resources; browser DML is removed.
REVOKE INSERT, UPDATE, DELETE ON public.warehouses FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.warehouse_stock FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.stock_transfers FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.inventory_movements FROM authenticated;

CREATE OR REPLACE FUNCTION public.create_warehouse(p_name text,p_code text DEFAULT NULL,p_address text DEFAULT NULL,p_phone text DEFAULT NULL,p_manager_name text DEFAULT NULL,p_is_default boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_id uuid;
BEGIN
 v_user:=private.require_staff_permission('inventory','insert');
 IF nullif(trim(p_name),'') IS NULL THEN RAISE EXCEPTION 'Warehouse name is required'; END IF;
 IF p_is_default THEN UPDATE public.warehouses SET is_default=false WHERE is_default=true; END IF;
 INSERT INTO public.warehouses(name,code,address,phone,manager_name,is_default,is_active) VALUES(trim(p_name),nullif(trim(p_code),''),nullif(trim(p_address),''),nullif(trim(p_phone),''),nullif(trim(p_manager_name),''),coalesce(p_is_default,false),true) RETURNING id INTO v_id;
 INSERT INTO public.supply_chain_events(event_type,warehouse_id,notes,created_by) VALUES('warehouse_created',v_id,'Warehouse created',v_user);
 RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.update_warehouse(p_warehouse_id uuid,p_name text,p_code text DEFAULT NULL,p_address text DEFAULT NULL,p_phone text DEFAULT NULL,p_manager_name text DEFAULT NULL,p_is_default boolean DEFAULT false,p_is_active boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_old public.warehouses%ROWTYPE;
BEGIN
 v_user:=private.require_staff_permission('inventory','update');
 SELECT * INTO v_old FROM public.warehouses WHERE id=p_warehouse_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Warehouse not found'; END IF;
 IF nullif(trim(p_name),'') IS NULL THEN RAISE EXCEPTION 'Warehouse name is required'; END IF;
 IF NOT coalesce(p_is_active,true) AND EXISTS(SELECT 1 FROM public.warehouse_stock WHERE warehouse_id=p_warehouse_id AND quantity>0) THEN RAISE EXCEPTION 'Warehouse with stock cannot be deactivated'; END IF;
 IF p_is_default THEN UPDATE public.warehouses SET is_default=false WHERE is_default=true AND id<>p_warehouse_id; END IF;
 UPDATE public.warehouses SET name=trim(p_name),code=nullif(trim(p_code),''),address=nullif(trim(p_address),''),phone=nullif(trim(p_phone),''),manager_name=nullif(trim(p_manager_name),''),is_default=coalesce(p_is_default,false),is_active=coalesce(p_is_active,true),updated_at=now() WHERE id=p_warehouse_id;
 INSERT INTO public.supply_chain_events(event_type,warehouse_id,notes,created_by) VALUES(CASE WHEN coalesce(p_is_active,true) THEN 'warehouse_updated' ELSE 'warehouse_deactivated' END,p_warehouse_id,'Warehouse master data updated',v_user);
 RETURN jsonb_build_object('success',true,'warehouse_id',p_warehouse_id,'is_active',coalesce(p_is_active,true));
END; $$;

CREATE OR REPLACE FUNCTION public.delete_warehouse(p_warehouse_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid;
BEGIN
 v_user:=private.require_staff_permission('inventory','delete');
 IF EXISTS(SELECT 1 FROM public.warehouse_stock WHERE warehouse_id=p_warehouse_id AND quantity>0) THEN RAISE EXCEPTION 'Warehouse with stock cannot be deleted'; END IF;
 IF EXISTS(SELECT 1 FROM public.purchase_orders WHERE warehouse_id=p_warehouse_id AND status NOT IN ('received','cancelled')) THEN RAISE EXCEPTION 'Warehouse has open purchase orders'; END IF;
 DELETE FROM public.warehouses WHERE id=p_warehouse_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Warehouse not found'; END IF;
 RETURN jsonb_build_object('success',true,'warehouse_id',p_warehouse_id,'deleted_by',v_user);
END; $$;

-- Replace receipt logic with a single audited, warehouse-required transaction.
CREATE OR REPLACE FUNCTION public.receive_purchase_order_item(p_item_id uuid,p_quantity numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_item public.purchase_order_items%ROWTYPE; v_po public.purchase_orders%ROWTYPE; v_delta integer; v_product_stock integer; v_prev integer; v_new integer;
BEGIN
 v_user:=private.require_staff_permission('inventory','update');
 IF p_quantity IS NULL OR p_quantity<=0 OR p_quantity<>trunc(p_quantity) THEN RAISE EXCEPTION 'Receipt quantity must be a positive whole number'; END IF;
 SELECT * INTO v_item FROM public.purchase_order_items WHERE id=p_item_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Purchase order item not found'; END IF;
 SELECT * INTO v_po FROM public.purchase_orders WHERE id=v_item.purchase_order_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Purchase order not found'; END IF;
 IF v_po.status IN ('draft','cancelled','received') THEN RAISE EXCEPTION 'Purchase order is not receivable'; END IF;
 IF v_po.warehouse_id IS NULL THEN RAISE EXCEPTION 'Purchase order requires a receiving warehouse'; END IF;
 v_delta:=p_quantity::integer;
 IF v_item.quantity_received+v_delta>v_item.quantity_ordered THEN RAISE EXCEPTION 'Cannot receive more than ordered'; END IF;
 IF v_item.product_id IS NULL THEN RAISE EXCEPTION 'Receipt requires a linked product'; END IF;
 PERFORM 1 FROM public.warehouses WHERE id=v_po.warehouse_id AND is_active=true; IF NOT FOUND THEN RAISE EXCEPTION 'Receiving warehouse is inactive or missing'; END IF;
 SELECT stock_quantity INTO v_product_stock FROM public.products WHERE id=v_item.product_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
 SELECT quantity INTO v_prev FROM public.warehouse_stock WHERE warehouse_id=v_po.warehouse_id AND product_id=v_item.product_id FOR UPDATE; v_prev:=coalesce(v_prev,0); v_new:=v_prev+v_delta;
 UPDATE public.products SET stock_quantity=v_product_stock+v_delta,in_stock=true,updated_at=now() WHERE id=v_item.product_id;
 UPDATE public.purchase_order_items SET quantity_received=quantity_received+v_delta WHERE id=p_item_id;
 INSERT INTO public.warehouse_stock(warehouse_id,product_id,quantity,updated_at) VALUES(v_po.warehouse_id,v_item.product_id,v_new,now()) ON CONFLICT(warehouse_id,product_id) DO UPDATE SET quantity=EXCLUDED.quantity,updated_at=now();
 INSERT INTO public.inventory_movements(product_id,warehouse_id,movement_type,quantity,previous_stock,new_stock,reference_type,reference_id,notes,created_by) VALUES(v_item.product_id,v_po.warehouse_id,'in',v_delta,v_product_stock,v_product_stock+v_delta,'purchase_receipt',v_po.id::text,'Goods received',v_user);
 UPDATE public.purchase_orders SET status=CASE WHEN NOT EXISTS(SELECT 1 FROM public.purchase_order_items WHERE purchase_order_id=v_po.id AND quantity_received<quantity_ordered) THEN 'received' ELSE 'partial' END,actual_delivery_date=CASE WHEN NOT EXISTS(SELECT 1 FROM public.purchase_order_items WHERE purchase_order_id=v_po.id AND quantity_received<quantity_ordered) THEN current_date ELSE actual_delivery_date END,updated_at=now() WHERE id=v_po.id;
 INSERT INTO public.procurement_events(purchase_order_id,event_type,to_status,note,created_by) VALUES(v_po.id,CASE WHEN NOT EXISTS(SELECT 1 FROM public.purchase_order_items WHERE purchase_order_id=v_po.id AND quantity_received<quantity_ordered) THEN 'received' ELSE 'partial' END,(SELECT status FROM public.purchase_orders WHERE id=v_po.id),'Receipt recorded',v_user);
 INSERT INTO public.supply_chain_events(event_type,product_id,warehouse_id,purchase_order_id,quantity,reference_id,notes,created_by) VALUES('receipt',v_item.product_id,v_po.warehouse_id,v_po.id,v_delta,p_item_id::text,'Purchase receipt posted',v_user);
 RETURN jsonb_build_object('success',true,'purchase_order_id',v_po.id,'item_id',p_item_id,'received',v_item.quantity_received+v_delta,'warehouse_stock',v_new,'product_stock',v_product_stock+v_delta,'status',(SELECT status FROM public.purchase_orders WHERE id=v_po.id));
END; $$;

-- Tie field allocation status to actual warehouse/product stock. Allocation is a reservation; issue consumes physical stock; return restores it.
CREATE OR REPLACE FUNCTION public.update_installation_material_allocation(p_allocation_id uuid,p_status text,p_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_row public.installation_material_allocations%ROWTYPE; v_install public.installations%ROWTYPE; v_wh uuid; v_stock integer; v_product_stock integer; v_delta integer; v_old_status text;
BEGIN
 v_user:=private.require_staff_permission('projects','update');
 IF p_status NOT IN ('allocated','issued','returned','cancelled') THEN RAISE EXCEPTION 'Invalid material allocation status'; END IF;
 SELECT * INTO v_row FROM public.installation_material_allocations WHERE id=p_allocation_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Material allocation not found'; END IF;
 SELECT * INTO v_install FROM public.installations WHERE id=v_row.installation_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Installation not found'; END IF;
 v_old_status:=v_row.status;
 IF v_old_status IN ('returned','cancelled') AND p_status NOT IN (v_old_status) THEN RAISE EXCEPTION 'Terminal material allocation cannot be reopened'; END IF;
 IF v_old_status=p_status THEN RETURN jsonb_build_object('success',true,'allocation_id',p_allocation_id,'status',p_status,'unchanged',true); END IF;
 IF p_status='issued' AND v_old_status='allocated' THEN
   SELECT id INTO v_wh FROM public.warehouses WHERE is_default=true AND is_active=true ORDER BY id LIMIT 1;
   IF v_wh IS NULL THEN RAISE EXCEPTION 'No active default warehouse available for issue'; END IF;
   SELECT quantity INTO v_stock FROM public.warehouse_stock WHERE warehouse_id=v_wh AND product_id=v_row.product_id FOR UPDATE; v_stock:=coalesce(v_stock,0);
   IF v_stock < ceil(v_row.quantity)::integer THEN RAISE EXCEPTION 'Insufficient default warehouse stock for material issue'; END IF;
   SELECT stock_quantity INTO v_product_stock FROM public.products WHERE id=v_row.product_id FOR UPDATE;
   v_delta:=ceil(v_row.quantity)::integer;
   UPDATE public.warehouse_stock SET quantity=v_stock-v_delta,updated_at=now() WHERE warehouse_id=v_wh AND product_id=v_row.product_id;
   UPDATE public.products SET stock_quantity=v_product_stock-v_delta,in_stock=(v_product_stock-v_delta>0),updated_at=now() WHERE id=v_row.product_id;
   INSERT INTO public.inventory_movements(product_id,warehouse_id,movement_type,quantity,previous_stock,new_stock,reference_type,reference_id,notes,created_by) VALUES(v_row.product_id,v_wh,'out',v_delta,v_product_stock,v_product_stock-v_delta,'installation_issue',v_row.installation_id::text,'Issued to installation',v_user);
   INSERT INTO public.supply_chain_events(event_type,product_id,warehouse_id,installation_id,quantity,reference_id,notes,created_by) VALUES('issue',v_row.product_id,v_wh,v_row.installation_id,v_delta,p_allocation_id::text,'Material issued to installation',v_user);
 ELSIF p_status='returned' AND v_old_status='issued' THEN
   SELECT id INTO v_wh FROM public.warehouses WHERE is_default=true AND is_active=true ORDER BY id LIMIT 1;
   IF v_wh IS NULL THEN RAISE EXCEPTION 'No active default warehouse available for return'; END IF;
   SELECT quantity INTO v_stock FROM public.warehouse_stock WHERE warehouse_id=v_wh AND product_id=v_row.product_id FOR UPDATE; v_stock:=coalesce(v_stock,0);
   SELECT stock_quantity INTO v_product_stock FROM public.products WHERE id=v_row.product_id FOR UPDATE;
   v_delta:=ceil(v_row.quantity)::integer;
   INSERT INTO public.warehouse_stock(warehouse_id,product_id,quantity,updated_at) VALUES(v_wh,v_row.product_id,v_stock+v_delta,now()) ON CONFLICT(warehouse_id,product_id) DO UPDATE SET quantity=EXCLUDED.quantity,updated_at=now();
   UPDATE public.products SET stock_quantity=v_product_stock+v_delta,in_stock=true,updated_at=now() WHERE id=v_row.product_id;
   INSERT INTO public.inventory_movements(product_id,warehouse_id,movement_type,quantity,previous_stock,new_stock,reference_type,reference_id,notes,created_by) VALUES(v_row.product_id,v_wh,'in',v_delta,v_product_stock,v_product_stock+v_delta,'installation_return',v_row.installation_id::text,'Material returned from installation',v_user);
   INSERT INTO public.supply_chain_events(event_type,product_id,warehouse_id,installation_id,quantity,reference_id,notes,created_by) VALUES('return',v_row.product_id,v_wh,v_row.installation_id,v_delta,p_allocation_id::text,'Material returned from installation',v_user);
 END IF;
 UPDATE public.installation_material_allocations SET status=p_status,notes=coalesce(nullif(trim(p_notes),''),notes),updated_at=now() WHERE id=p_allocation_id;
 RETURN jsonb_build_object('success',true,'allocation_id',p_allocation_id,'from_status',v_old_status,'status',p_status);
END; $$;

-- Comprehensive reconciliation: product stock, warehouse totals, open allocations and procurement receipts.
CREATE OR REPLACE FUNCTION public.reconcile_supply_chain_360()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_products jsonb; v_po jsonb; v_alloc jsonb;
BEGIN
 v_user:=private.require_staff_permission('inventory','read');
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.product_name),'[]'::jsonb) INTO v_products FROM (
   SELECT p.id product_id,p.name product_name,p.stock_quantity product_stock,coalesce(sum(ws.quantity),0) warehouse_stock,p.stock_quantity-coalesce(sum(ws.quantity),0) discrepancy FROM public.products p LEFT JOIN public.warehouse_stock ws ON ws.product_id=p.id WHERE p.is_active=true GROUP BY p.id,p.name,p.stock_quantity HAVING p.stock_quantity<>coalesce(sum(ws.quantity),0)
 ) x;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.po_number),'[]'::jsonb) INTO v_po FROM (
   SELECT po.id purchase_order_id,po.po_number,po.status,coalesce(sum(poi.quantity_ordered),0) ordered,coalesce(sum(poi.quantity_received),0) received,coalesce(sum(greatest(poi.quantity_ordered-poi.quantity_received,0)),0) remaining FROM public.purchase_orders po JOIN public.purchase_order_items poi ON poi.purchase_order_id=po.id WHERE po.status NOT IN ('cancelled') GROUP BY po.id,po.po_number,po.status HAVING (po.status='received' AND coalesce(sum(greatest(poi.quantity_ordered-poi.quantity_received,0)),0)>0) OR (po.status<>'received' AND coalesce(sum(greatest(poi.quantity_ordered-poi.quantity_received,0)),0)=0)
 ) x;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.installation_id),'[]'::jsonb) INTO v_alloc FROM (
   SELECT ima.installation_id,count(*) FILTER(WHERE ima.status='allocated') allocated,count(*) FILTER(WHERE ima.status='issued') issued,count(*) FILTER(WHERE ima.status='returned') returned FROM public.installation_material_allocations ima GROUP BY ima.installation_id HAVING count(*) FILTER(WHERE ima.status='issued')>count(*) FILTER(WHERE ima.status IN ('allocated','issued'))
 ) x;
 INSERT INTO public.supply_chain_events(event_type,notes,created_by) VALUES('reconciliation',format('Product discrepancies: %s; PO discrepancies: %s; allocation discrepancies: %s',jsonb_array_length(v_products),jsonb_array_length(v_po),jsonb_array_length(v_alloc)),v_user);
 RETURN jsonb_build_object('checked_by',v_user,'checked_at',now(),'product_discrepancies',v_products,'purchase_order_discrepancies',v_po,'allocation_discrepancies',v_alloc,'discrepancy_count',jsonb_array_length(v_products)+jsonb_array_length(v_po)+jsonb_array_length(v_alloc));
END; $$;

CREATE OR REPLACE FUNCTION public.get_supply_chain_360(p_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_days integer:=greatest(1,least(coalesce(p_days,30),365)); v_since timestamptz; v_result jsonb;
BEGIN
 v_user:=private.require_staff_permission('reports','read'); v_since:=now()-make_interval(days=>v_days);
 SELECT jsonb_build_object(
  'days',v_days,'active_products',(SELECT count(*) FROM public.products WHERE is_active=true),'low_stock',(SELECT count(*) FROM public.products WHERE is_active=true AND stock_quantity<=low_stock_threshold),'stock_units',(SELECT coalesce(sum(stock_quantity),0) FROM public.products WHERE is_active=true),'active_warehouses',(SELECT count(*) FROM public.warehouses WHERE is_active=true),'warehouse_stock_units',(SELECT coalesce(sum(quantity),0) FROM public.warehouse_stock ws JOIN public.warehouses w ON w.id=ws.warehouse_id WHERE w.is_active=true),'active_suppliers',(SELECT count(*) FROM public.suppliers WHERE is_active=true),'open_purchase_orders',(SELECT count(*) FROM public.purchase_orders WHERE status NOT IN ('received','cancelled')),'pending_receipts',(SELECT count(*) FROM public.purchase_orders WHERE status IN ('ordered','partial','sent','pending')),'procurement_value',(SELECT coalesce(sum(total_amount),0) FROM public.purchase_orders WHERE created_at>=v_since AND status<>'cancelled'),'received_value',(SELECT coalesce(sum(total_amount),0) FROM public.purchase_orders WHERE actual_delivery_date>=current_date-v_days AND status='received'),'inventory_movements',(SELECT count(*) FROM public.inventory_movements WHERE created_at>=v_since),'active_allocations',(SELECT count(*) FROM public.installation_material_allocations WHERE status IN ('allocated','issued')),'unresolved_alerts',(SELECT count(*) FROM public.inventory_alerts WHERE is_resolved=false),'events',(SELECT count(*) FROM public.supply_chain_events WHERE created_at>=v_since)
 ) INTO v_result;
 RETURN v_result||jsonb_build_object('checked_by',v_user,'generated_at',now());
END; $$;

GRANT EXECUTE ON FUNCTION public.create_warehouse(text,text,text,text,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_warehouse(uuid,text,text,text,text,text,boolean,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_warehouse(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.receive_purchase_order_item(uuid,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_installation_material_allocation(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_supply_chain_360() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_supply_chain_360(integer) TO authenticated;
