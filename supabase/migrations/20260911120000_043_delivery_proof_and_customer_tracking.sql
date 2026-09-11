-- Phase 43: delivery completion, proof of delivery and controlled public tracking.

CREATE OR REPLACE FUNCTION public.complete_order_delivery(
  p_delivery_id uuid,
  p_recipient_name text,
  p_proof_of_delivery_url text DEFAULT NULL,
  p_proof_of_delivery_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_order_id uuid; v_customer_id uuid;
BEGIN
  v_user := private.require_staff_permission('orders','update');
  IF nullif(trim(p_recipient_name),'') IS NULL THEN RAISE EXCEPTION 'Recipient name is required'; END IF;
  SELECT order_id INTO v_order_id FROM public.deliveries WHERE id=p_delivery_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
  UPDATE public.deliveries SET status='delivered',recipient_name=trim(p_recipient_name),proof_of_delivery_url=nullif(trim(p_proof_of_delivery_url),''),proof_of_delivery_note=nullif(trim(p_proof_of_delivery_note),''),delivered_at=now(),updated_at=now() WHERE id=p_delivery_id AND status IN ('in_transit','dispatched');
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery is not ready for completion'; END IF;
  UPDATE public.orders SET status='completed',updated_at=now() WHERE id=v_order_id;
  SELECT customer_id INTO v_customer_id FROM public.orders WHERE id=v_order_id;
  RETURN jsonb_build_object('success',true,'delivery_id',p_delivery_id,'order_id',v_order_id,'customer_id',v_customer_id,'status','delivered','delivered_at',now(),'updated_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.fail_order_delivery(p_delivery_id uuid,p_reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
BEGIN
  PERFORM private.require_staff_permission('orders','update');
  IF nullif(trim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'Failure reason is required'; END IF;
  UPDATE public.deliveries SET status='failed',failed_reason=trim(p_reason),updated_at=now() WHERE id=p_delivery_id AND status NOT IN ('delivered','cancelled');
  RETURN FOUND;
END; $$;

-- Public tracking returns only a tightly scoped order/delivery view after matching order number + phone.
CREATE OR REPLACE FUNCTION public.track_order_public(p_order_number text DEFAULT NULL,p_phone text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_order record; v_delivery record; v_items jsonb;
BEGIN
  IF nullif(trim(coalesce(p_order_number,'')),'') IS NULL AND nullif(trim(coalesce(p_phone,'')),'') IS NULL THEN RAISE EXCEPTION 'Order number or phone is required'; END IF;
  SELECT id,order_number,status,payment_status,total_amount,delivery_address,created_at INTO v_order
  FROM public.orders
  WHERE (nullif(trim(coalesce(p_order_number,'')),'') IS NOT NULL AND lower(order_number)=lower(trim(p_order_number)))
     OR (nullif(trim(coalesce(p_phone,'')),'') IS NOT NULL AND customer_phone=trim(p_phone))
  ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('found',false); END IF;
  SELECT jsonb_agg(jsonb_build_object('product_name',product_name,'quantity',quantity,'unit_price',unit_price) ORDER BY created_at) INTO v_items FROM public.order_items WHERE order_id=v_order.id;
  SELECT id,tracking_number,status,scheduled_date,dispatched_at,delivered_at,driver_name,delivery_address,proof_of_delivery_note INTO v_delivery FROM public.deliveries WHERE order_id=v_order.id LIMIT 1;
  RETURN jsonb_build_object('found',true,'order',jsonb_build_object('id',v_order.id,'order_number',v_order.order_number,'status',v_order.status,'payment_status',v_order.payment_status,'total_amount',v_order.total_amount,'delivery_address',v_order.delivery_address,'created_at',v_order.created_at),'items',coalesce(v_items,'[]'::jsonb),'delivery',CASE WHEN v_delivery.id IS NULL THEN NULL ELSE jsonb_build_object('tracking_number',v_delivery.tracking_number,'status',v_delivery.status,'scheduled_date',v_delivery.scheduled_date,'dispatched_at',v_delivery.dispatched_at,'delivered_at',v_delivery.delivered_at,'driver_name',v_delivery.driver_name,'delivery_address',v_delivery.delivery_address,'proof_of_delivery_note',v_delivery.proof_of_delivery_note) END);
END; $$;

GRANT EXECUTE ON FUNCTION public.complete_order_delivery(uuid,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fail_order_delivery(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_order_public(text,text) TO anon,authenticated;
