-- Staff had no way to set or correct an order's delivery address. Orders converted from quotations are created
-- without one, so the fulfilment readiness check ("Delivery address is missing") and dispatch could never succeed.
-- This RPC lets authorised staff set it. It only changes the address: delivery zone, charge and totals stay as priced.

CREATE OR REPLACE FUNCTION public.update_order_delivery_address(p_order_id uuid, p_delivery_address text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE
  v_user uuid;
  v_order public.orders%ROWTYPE;
  v_address text := NULLIF(trim(coalesce(p_delivery_address, '')), '');
  v_delivery record;
BEGIN
  v_user := private.require_staff_permission('orders', 'update');
  IF v_address IS NULL OR length(v_address) < 5 THEN RAISE EXCEPTION 'Enter a delivery address of at least 5 characters'; END IF;
  IF length(v_address) > 500 THEN RAISE EXCEPTION 'Delivery address is too long'; END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status IN ('completed', 'cancelled') THEN RAISE EXCEPTION 'The delivery address of a completed or cancelled order cannot be changed'; END IF;
  IF EXISTS (SELECT 1 FROM public.deliveries d WHERE d.order_id = p_order_id AND d.status IN ('dispatched', 'in_transit', 'delivered')) THEN
    RAISE EXCEPTION 'The delivery has already left the warehouse; record a delivery exception instead of changing the address';
  END IF;
  IF v_order.delivery_address IS NOT DISTINCT FROM v_address THEN
    RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'delivery_address', v_address, 'idempotent_replay', true);
  END IF;

  UPDATE public.orders SET delivery_address = v_address, updated_at = now() WHERE id = p_order_id;

  -- Keep any not-yet-dispatched delivery in step with the order and leave an audit trail.
  FOR v_delivery IN
    SELECT id, status FROM public.deliveries
    WHERE order_id = p_order_id AND status NOT IN ('cancelled', 'delivered', 'failed')
    FOR UPDATE
  LOOP
    UPDATE public.deliveries SET delivery_address = v_address, updated_at = now() WHERE id = v_delivery.id;
    INSERT INTO public.delivery_events(delivery_id, order_id, event_type, from_status, to_status, note, created_by)
    VALUES (v_delivery.id, p_order_id, 'updated', v_delivery.status, v_delivery.status, 'Delivery address updated by staff', v_user);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'delivery_address', v_address, 'updated_by', v_user);
END; $function$;
REVOKE ALL ON FUNCTION public.update_order_delivery_address(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_order_delivery_address(uuid, text) TO authenticated;
COMMENT ON FUNCTION public.update_order_delivery_address(uuid, text) IS 'Staff-only: sets the delivery address of an open order (and its undispatched delivery) so fulfilment readiness and dispatch can proceed. Does not change pricing.';
