-- ============================================================
-- Phases 71-73: Authorization Contract Repair + Order Operations 360
--
-- Repairs a latent RBAC mismatch introduced by the original helper:
--   * staff_profiles is keyed by user_id, not id
--   * permission catalogue uses select/update/etc.; older RPCs use read
--
-- Also adds one controlled, permission-aware order operations snapshot RPC
-- so staff can inspect fulfillment state without exposing finance data to
-- roles that do not have payment visibility.
-- ============================================================

CREATE OR REPLACE FUNCTION private.require_staff_permission(p_resource text, p_action text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_action text := CASE WHEN lower(coalesce(p_action,'')) = 'read' THEN 'select' ELSE lower(coalesce(p_action,'')) END;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.staff_role_assignments ra
    JOIN public.staff_role_permissions rp ON rp.role_id = ra.role_id
    JOIN public.staff_permissions p ON p.id = rp.permission_id
    JOIN public.staff_profiles sp ON sp.user_id = ra.user_id
    WHERE sp.user_id = v_user
      AND sp.is_active = true
      AND (p.resource = p_resource)
      AND (p.action = v_action OR p.action = 'manage')
  ) THEN
    RAISE EXCEPTION 'Permission denied: %.%', p_resource, p_action;
  END IF;
  RETURN v_user;
END;
$$;

CREATE OR REPLACE FUNCTION private.current_user_has_permission(p_resource text, p_action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_profiles sp
    JOIN public.staff_role_assignments ra ON ra.user_id = sp.user_id
    JOIN public.staff_roles sr ON sr.id = ra.role_id
    JOIN public.staff_role_permissions rp ON rp.role_id = sr.id
    JOIN public.staff_permissions p ON p.id = rp.permission_id
    WHERE sp.user_id = (select auth.uid())
      AND sp.is_active = true
      AND p.resource = p_resource
      AND (p.action = CASE WHEN lower(coalesce(p_action,'')) = 'read' THEN 'select' ELSE lower(coalesce(p_action,'')) END OR p.action = 'manage')
  );
$$;

-- Replace the invalid historical policy function reference with the canonical helper.
DROP POLICY IF EXISTS payment_refunds_staff_read ON public.payment_refunds;
CREATE POLICY payment_refunds_staff_read
  ON public.payment_refunds FOR SELECT TO authenticated
  USING (private.current_user_has_permission('finance','select'));

REVOKE ALL ON FUNCTION private.require_staff_permission(text,text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION private.current_user_has_permission(text,text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_order_operations_360(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user uuid;
  v_order public.orders%ROWTYPE;
  v_finance boolean;
  v_inventory boolean;
  v_items jsonb;
  v_deliveries jsonb;
  v_reservations jsonb;
  v_payments jsonb := '[]'::jsonb;
  v_refunds jsonb := '[]'::jsonb;
  v_paid numeric(12,2) := 0;
  v_refunded numeric(12,2) := 0;
BEGIN
  v_user := private.require_staff_permission('orders','select');
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  v_finance := private.current_user_has_permission('payments','select');
  v_inventory := private.current_user_has_permission('inventory','select');

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at), '[]'::jsonb)
    INTO v_items
    FROM (
      SELECT id, order_id, product_id, variant_id, product_name, quantity, unit_price, created_at
      FROM public.order_items WHERE order_id = p_order_id
    ) x;

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb)
    INTO v_deliveries
    FROM (
      SELECT id, order_id, tracking_number, status, scheduled_date, dispatched_at, delivered_at, driver_name, delivery_address, proof_of_delivery_note, created_at
      FROM public.deliveries WHERE order_id = p_order_id
    ) x;

  IF v_inventory THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb)
      INTO v_reservations
      FROM (
        SELECT id, order_id, product_id, variant_id, quantity, status, expires_at, released_at, created_at
        FROM public.inventory_reservations WHERE order_id = p_order_id
      ) x;
  ELSE
    v_reservations := '[]'::jsonb;
  END IF;

  IF v_finance THEN
    SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.payment_transactions WHERE order_id=p_order_id AND status='successful';
    SELECT COALESCE(SUM(amount),0) INTO v_refunded FROM public.payment_refunds WHERE order_id=p_order_id AND status IN ('pending','processing','successful');
    SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb)
      INTO v_payments
      FROM (
        SELECT id, order_id, amount, currency, method, provider, provider_transaction_id, provider_reference, status, failure_reason, paid_at, created_at
        FROM public.payment_transactions WHERE order_id = p_order_id
      ) x;
    SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb)
      INTO v_refunds
      FROM (
        SELECT id, payment_transaction_id, order_id, amount, status, provider, provider_refund_id, reason, processed_at, created_at
        FROM public.payment_refunds WHERE order_id = p_order_id
      ) x;
  END IF;

  RETURN jsonb_build_object(
    'order', to_jsonb(v_order),
    'items', v_items,
    'deliveries', v_deliveries,
    'reservations', v_reservations,
    'finance_access', v_finance,
    'inventory_access', v_inventory,
    'paid_amount', v_paid,
    'refunded_amount', v_refunded,
    'outstanding_amount', GREATEST(v_order.total_amount - v_paid + v_refunded, 0),
    'payments', v_payments,
    'refunds', v_refunds,
    'retrieved_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_order_operations_360(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_order_operations_360(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_order_operations_360(uuid) IS
  'Permission-aware staff order snapshot covering items, fulfillment, reservations and finance visibility.';
