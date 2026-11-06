-- Phase 5: order creation, cancellation and fulfilment lifecycle integrity.
-- Keep manual status changes behind the same payment and delivery gates as
-- the operational fulfilment RPCs.

CREATE OR REPLACE FUNCTION public.update_order_status_transaction(
  p_order_id uuid,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,private
AS $$
DECLARE
  v_user uuid;
  v_old text;
  v_payment_status text;
  v_delivery_id uuid;
  v_delivery_status text;
BEGIN
  v_user := private.require_staff_permission('orders','update');
  SELECT status, payment_status INTO v_old, v_payment_status
    FROM public.orders
   WHERE id=p_order_id
   FOR UPDATE;
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
  IF p_status='cancelled' AND v_payment_status IN ('paid','partial') THEN
    RAISE EXCEPTION 'Paid or partially paid orders require payment/refund handling before cancellation';
  END IF;
  IF p_status='completed' THEN
    IF v_payment_status <> 'paid' THEN
      RAISE EXCEPTION 'Order must be fully paid before completion';
    END IF;
    IF EXISTS (SELECT 1 FROM public.inventory_reservations WHERE order_id=p_order_id AND status='reserved') THEN
      RAISE EXCEPTION 'Order has active inventory reservations';
    END IF;
    IF EXISTS (SELECT 1 FROM public.deliveries WHERE order_id=p_order_id)
       AND NOT EXISTS (SELECT 1 FROM public.deliveries WHERE order_id=p_order_id AND status='delivered') THEN
      RAISE EXCEPTION 'Order delivery must be completed before order completion';
    END IF;
  END IF;

  IF p_status='cancelled' THEN
    UPDATE public.inventory_reservations
       SET status='released',released_at=now(),updated_at=now()
     WHERE order_id=p_order_id AND status='reserved';

    FOR v_delivery_id, v_delivery_status IN
      SELECT id,status FROM public.deliveries
       WHERE order_id=p_order_id AND status NOT IN ('delivered','cancelled')
       FOR UPDATE
    LOOP
      UPDATE public.deliveries
         SET status='cancelled',updated_at=now()
       WHERE id=v_delivery_id;
      INSERT INTO public.fulfillment_events(
        order_id,delivery_id,event_type,from_status,to_status,note,created_by
      ) VALUES (
        p_order_id,v_delivery_id,'exception',v_delivery_status,'cancelled',
        'Delivery cancelled with order',v_user
      );
    END LOOP;

    IF EXISTS (
      SELECT 1 FROM public.orders
       WHERE id=p_order_id AND coupon_id IS NOT NULL
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

REVOKE ALL ON FUNCTION public.update_order_status_transaction(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_order_status_transaction(uuid,text) TO authenticated;

COMMENT ON FUNCTION public.update_order_status_transaction(uuid,text)
  IS 'Staff order status transition with payment/completion gates and atomic reservation/delivery cancellation cleanup.';
