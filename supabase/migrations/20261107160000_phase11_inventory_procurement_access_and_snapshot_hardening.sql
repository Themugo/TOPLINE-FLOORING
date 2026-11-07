-- Phase 11 hardening: align reporting RPC authorization with the route and
-- permission catalogue, expose procurement event history to the matching role,
-- and remove implicit PUBLIC execution from privileged SECURITY DEFINER RPCs.

CREATE OR REPLACE FUNCTION public.reconcile_inventory_procurement()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private
AS $$
DECLARE
  v_user uuid;
  v_product_discrepancies jsonb;
  v_warehouse_orphans jsonb;
BEGIN
  v_user := private.require_staff_permission('inventory','select');

  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.product_name),'[]'::jsonb)
  INTO v_product_discrepancies
  FROM (
    SELECT p.id AS product_id, p.name AS product_name,
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
    SELECT ws.warehouse_id,w.name AS warehouse_name,ws.product_id,
           p.name AS product_name,ws.quantity
    FROM public.warehouse_stock ws
    JOIN public.warehouses w ON w.id=ws.warehouse_id
    LEFT JOIN public.products p ON p.id=ws.product_id
    WHERE p.id IS NULL OR p.is_active=false
  ) x;

  RETURN jsonb_build_object(
    'checked_by',v_user,'checked_at',now(),
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
  v_user := private.require_staff_permission('inventory','select');
  v_since := now()-make_interval(days=>v_days);

  SELECT jsonb_build_object(
    'days',v_days,
    'active_products',(SELECT count(*) FROM public.products WHERE is_active=true),
    'low_stock',(SELECT count(*) FROM public.products WHERE is_active=true AND stock_quantity<=low_stock_threshold),
    'active_warehouses',(SELECT count(*) FROM public.warehouses WHERE is_active=true),
    'active_suppliers',(SELECT count(*) FROM public.suppliers WHERE is_active=true),
    'open_purchase_orders',(SELECT count(*) FROM public.purchase_orders WHERE status NOT IN ('received','cancelled')),
    'pending_receipts',(SELECT count(*) FROM public.purchase_orders WHERE status IN ('ordered','partial','sent','pending')),
    'procurement_value',(SELECT coalesce(sum(total_amount),0) FROM public.purchase_orders WHERE created_at>=v_since AND status<>'cancelled'),
    'received_value',(SELECT coalesce(sum(total_amount),0) FROM public.purchase_orders WHERE actual_delivery_date>=current_date-v_days AND status='received'),
    'movement_count',(SELECT count(*) FROM public.inventory_movements WHERE created_at>=v_since),
    'stock_units',(SELECT coalesce(sum(stock_quantity),0) FROM public.products WHERE is_active=true),
    'active_alerts',(SELECT count(*) FROM public.inventory_alerts WHERE is_resolved=false),
    'status_breakdown',(SELECT coalesce(jsonb_object_agg(status,cnt),'{}'::jsonb)
      FROM (SELECT status,count(*) cnt FROM public.purchase_orders WHERE status IS NOT NULL GROUP BY status) s)
  ) INTO v_result;

  RETURN v_result || jsonb_build_object('checked_by',v_user,'generated_at',now());
END;
$$;

ALTER TABLE public.procurement_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS procurement_events_read ON public.procurement_events;
CREATE POLICY procurement_events_read ON public.procurement_events
  FOR SELECT TO authenticated
  USING (private.current_user_has_permission('procurement','select'));

-- SECURITY DEFINER functions must never inherit the default PUBLIC EXECUTE grant.
REVOKE ALL ON FUNCTION public.create_supplier(text,text,text,text,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.update_supplier(uuid,text,text,text,text,text,text,boolean) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.transition_purchase_order_lifecycle(uuid,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.add_purchase_order_item(uuid,uuid,text,numeric,numeric) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.remove_purchase_order_item(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.reconcile_inventory_procurement() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_inventory_procurement_operations_360(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_supplier(text,text,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_supplier(uuid,text,text,text,text,text,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_purchase_order_lifecycle(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_purchase_order_item(uuid,uuid,text,numeric,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_purchase_order_item(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_inventory_procurement() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_inventory_procurement_operations_360(integer) TO authenticated;
