-- Phase 65-67: public order tracking privacy hardening.
-- Require both the order number and the checkout phone number before exposing
-- the tightly scoped public order/delivery view.

CREATE OR REPLACE FUNCTION public.track_order_public(
  p_order_number text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public,private
AS $$
DECLARE
  v_order record;
  v_delivery record;
  v_items jsonb;
BEGIN
  IF nullif(trim(coalesce(p_order_number, '')), '') IS NULL
     OR nullif(trim(coalesce(p_phone, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Order number and phone number are required';
  END IF;

  SELECT id, order_number, status, payment_status, total_amount,
         delivery_address, created_at
    INTO v_order
    FROM public.orders
   WHERE lower(order_number) = lower(trim(p_order_number))
     AND customer_phone = trim(p_phone)
   ORDER BY created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT jsonb_agg(
           jsonb_build_object(
             'product_name', product_name,
             'quantity', quantity,
             'unit_price', unit_price
           ) ORDER BY created_at
         )
    INTO v_items
    FROM public.order_items
   WHERE order_id = v_order.id;

  SELECT id, tracking_number, status, scheduled_date, dispatched_at,
         delivered_at, driver_name, delivery_address, proof_of_delivery_note
    INTO v_delivery
    FROM public.deliveries
   WHERE order_id = v_order.id
   ORDER BY created_at DESC
   LIMIT 1;

  RETURN jsonb_build_object(
    'found', true,
    'order', jsonb_build_object(
      'id', v_order.id,
      'order_number', v_order.order_number,
      'status', v_order.status,
      'payment_status', v_order.payment_status,
      'total_amount', v_order.total_amount,
      'delivery_address', v_order.delivery_address,
      'created_at', v_order.created_at
    ),
    'items', coalesce(v_items, '[]'::jsonb),
    'delivery', CASE
      WHEN v_delivery.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'tracking_number', v_delivery.tracking_number,
        'status', v_delivery.status,
        'scheduled_date', v_delivery.scheduled_date,
        'dispatched_at', v_delivery.dispatched_at,
        'delivered_at', v_delivery.delivered_at,
        'driver_name', v_delivery.driver_name,
        'delivery_address', v_delivery.delivery_address,
        'proof_of_delivery_note', v_delivery.proof_of_delivery_note
      )
    END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.track_order_public(text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_order_public(text, text) TO anon, authenticated;
