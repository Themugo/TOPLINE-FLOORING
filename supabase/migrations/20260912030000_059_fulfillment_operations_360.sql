-- Phase 77-79: Fulfillment Operations 360 — controlled delivery scheduling,
-- proof-of-delivery capture, operational event history and customer in-app events.

CREATE TABLE IF NOT EXISTS public.delivery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT delivery_events_type_chk CHECK (event_type IN ('created','updated','dispatched','in_transit','delivered','failed'))
);
CREATE INDEX IF NOT EXISTS delivery_events_delivery_idx ON public.delivery_events(delivery_id, created_at DESC);
CREATE INDEX IF NOT EXISTS delivery_events_order_idx ON public.delivery_events(order_id, created_at DESC);
ALTER TABLE public.delivery_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.delivery_events FROM anon;
GRANT SELECT ON public.delivery_events TO authenticated;
DROP POLICY IF EXISTS delivery_events_staff_read ON public.delivery_events;
CREATE POLICY delivery_events_staff_read ON public.delivery_events FOR SELECT TO authenticated
USING (private.current_user_has_permission('orders','select'));

CREATE OR REPLACE FUNCTION public.create_order_delivery(
  p_order_id uuid,
  p_scheduled_date date DEFAULT NULL,
  p_driver_name text DEFAULT NULL,
  p_driver_phone text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_delivery_id uuid; v_tracking text; v_order public.orders%ROWTYPE;
BEGIN
  v_user := private.require_staff_permission('orders','update');
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status IN ('cancelled','completed') THEN RAISE EXCEPTION 'Order is not eligible for delivery'; END IF;
  IF EXISTS (SELECT 1 FROM public.deliveries WHERE order_id=p_order_id) THEN RAISE EXCEPTION 'Delivery already exists for this order'; END IF;
  v_tracking := 'TOP-' || to_char(current_date,'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  INSERT INTO public.deliveries(order_id,zone_id,tracking_number,status,delivery_address,delivery_notes,scheduled_date,driver_name,driver_phone)
  VALUES(p_order_id,v_order.delivery_zone_id,v_tracking,'pending',v_order.delivery_address,p_notes,p_scheduled_date,p_driver_name,p_driver_phone)
  RETURNING id INTO v_delivery_id;
  UPDATE public.orders SET status=CASE WHEN status='pending' THEN 'confirmed' ELSE status END,updated_at=now() WHERE id=p_order_id;
  INSERT INTO public.delivery_events(delivery_id,order_id,event_type,to_status,note,metadata,created_by)
  VALUES(v_delivery_id,p_order_id,'created','pending',nullif(trim(p_notes),''),jsonb_build_object('tracking_number',v_tracking),v_user);
  RETURN jsonb_build_object('success',true,'delivery_id',v_delivery_id,'tracking_number',v_tracking,'status','pending','updated_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.update_delivery_dispatch(
  p_delivery_id uuid,
  p_scheduled_date date DEFAULT NULL,
  p_driver_name text DEFAULT NULL,
  p_driver_phone text DEFAULT NULL,
  p_delivery_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_order_id uuid; v_status text; v_old_date date; v_old_driver text; v_old_phone text;
BEGIN
  v_user := private.require_staff_permission('orders','update');
  SELECT order_id,status,scheduled_date,driver_name,driver_phone INTO v_order_id,v_status,v_old_date,v_old_driver,v_old_phone FROM public.deliveries WHERE id=p_delivery_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
  IF v_status IN ('delivered','cancelled') THEN RAISE EXCEPTION 'Delivery is closed'; END IF;
  UPDATE public.deliveries SET scheduled_date=COALESCE(p_scheduled_date,scheduled_date),driver_name=COALESCE(NULLIF(trim(p_driver_name),''),driver_name),driver_phone=COALESCE(NULLIF(trim(p_driver_phone),''),driver_phone),delivery_notes=COALESCE(p_delivery_notes,delivery_notes),updated_at=now() WHERE id=p_delivery_id;
  UPDATE public.orders SET status=CASE WHEN status IN ('pending','confirmed') THEN 'processing' ELSE status END,updated_at=now() WHERE id=v_order_id;
  INSERT INTO public.delivery_events(delivery_id,order_id,event_type,from_status,to_status,note,metadata,created_by)
  VALUES(p_delivery_id,v_order_id,'updated',v_status,v_status,nullif(trim(p_delivery_notes),''),jsonb_build_object('previous_scheduled_date',v_old_date,'previous_driver_name',v_old_driver,'previous_driver_phone',v_old_phone),v_user);
  RETURN jsonb_build_object('success',true,'delivery_id',p_delivery_id,'status',v_status,'updated_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.dispatch_order_delivery(p_delivery_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_order_id uuid; v_from text;
BEGIN
  v_user := private.require_staff_permission('orders','update');
  SELECT order_id,status INTO v_order_id,v_from FROM public.deliveries WHERE id=p_delivery_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
  UPDATE public.deliveries SET status='dispatched',dispatched_at=now(),updated_at=now() WHERE id=p_delivery_id AND status IN ('pending','processing');
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery cannot be dispatched from its current state'; END IF;
  UPDATE public.orders SET status='processing',updated_at=now() WHERE id=v_order_id;
  INSERT INTO public.delivery_events(delivery_id,order_id,event_type,from_status,to_status,created_by) VALUES(p_delivery_id,v_order_id,'dispatched',v_from,'dispatched',v_user);
  RETURN jsonb_build_object('success',true,'delivery_id',p_delivery_id,'status','dispatched','updated_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.advance_delivery_in_transit(p_delivery_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_order_id uuid;
BEGIN
  v_user := private.require_staff_permission('orders','update');
  SELECT order_id INTO v_order_id FROM public.deliveries WHERE id=p_delivery_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
  UPDATE public.deliveries SET status='in_transit',updated_at=now() WHERE id=p_delivery_id AND status='dispatched';
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery must be dispatched first'; END IF;
  INSERT INTO public.delivery_events(delivery_id,order_id,event_type,from_status,to_status,created_by) VALUES(p_delivery_id,v_order_id,'in_transit','dispatched','in_transit',v_user);
  RETURN jsonb_build_object('success',true,'delivery_id',p_delivery_id,'status','in_transit','updated_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.complete_order_delivery(
  p_delivery_id uuid,
  p_recipient_name text,
  p_proof_of_delivery_url text DEFAULT NULL,
  p_proof_of_delivery_note text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_order_id uuid; v_customer_id uuid; v_from text;
BEGIN
  v_user := private.require_staff_permission('orders','update');
  IF nullif(trim(p_recipient_name),'') IS NULL THEN RAISE EXCEPTION 'Recipient name is required'; END IF;
  IF nullif(trim(p_proof_of_delivery_url),'') IS NULL AND nullif(trim(p_proof_of_delivery_note),'') IS NULL THEN RAISE EXCEPTION 'Proof of delivery note or URL is required'; END IF;
  SELECT order_id,status INTO v_order_id,v_from FROM public.deliveries WHERE id=p_delivery_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
  UPDATE public.deliveries SET status='delivered',recipient_name=trim(p_recipient_name),proof_of_delivery_url=nullif(trim(p_proof_of_delivery_url),''),proof_of_delivery_note=nullif(trim(p_proof_of_delivery_note),''),delivered_at=now(),updated_at=now() WHERE id=p_delivery_id AND status IN ('in_transit','dispatched');
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery is not ready for completion'; END IF;
  UPDATE public.orders SET status='completed',updated_at=now() WHERE id=v_order_id;
  SELECT customer_id INTO v_customer_id FROM public.orders WHERE id=v_order_id;
  INSERT INTO public.delivery_events(delivery_id,order_id,event_type,from_status,to_status,note,metadata,created_by)
  VALUES(p_delivery_id,v_order_id,'delivered',v_from,'delivered',nullif(trim(p_proof_of_delivery_note),''),jsonb_build_object('recipient_name',trim(p_recipient_name),'proof_url',nullif(trim(p_proof_of_delivery_url),'')),v_user);
  IF v_customer_id IS NOT NULL THEN
    INSERT INTO public.notification_events(event_type,entity_type,entity_id,customer_id,title,message,severity,audience,metadata)
    VALUES('delivery_delivered','delivery',p_delivery_id,v_customer_id,'Delivery completed','Your order has been delivered.', 'info','customer',jsonb_build_object('order_id',v_order_id));
  END IF;
  RETURN jsonb_build_object('success',true,'delivery_id',p_delivery_id,'order_id',v_order_id,'customer_id',v_customer_id,'status','delivered','delivered_at',now(),'updated_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.fail_order_delivery(p_delivery_id uuid,p_reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_order_id uuid; v_from text; v_customer_id uuid;
BEGIN
  v_user := private.require_staff_permission('orders','update');
  IF nullif(trim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'Failure reason is required'; END IF;
  SELECT order_id,status INTO v_order_id,v_from FROM public.deliveries WHERE id=p_delivery_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
  UPDATE public.deliveries SET status='failed',failed_reason=trim(p_reason),updated_at=now() WHERE id=p_delivery_id AND status NOT IN ('delivered','cancelled');
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery is closed'; END IF;
  INSERT INTO public.delivery_events(delivery_id,order_id,event_type,from_status,to_status,note,created_by) VALUES(p_delivery_id,v_order_id,'failed',v_from,'failed',trim(p_reason),v_user);
  SELECT customer_id INTO v_customer_id FROM public.orders WHERE id=v_order_id;
  IF v_customer_id IS NOT NULL THEN
    INSERT INTO public.notification_events(event_type,entity_type,entity_id,customer_id,title,message,severity,audience,metadata)
    VALUES('delivery_failed','delivery',p_delivery_id,v_customer_id,'Delivery exception','Your delivery requires an operational follow-up.', 'warning','customer',jsonb_build_object('order_id',v_order_id));
  END IF;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.get_delivery_operations_360(p_delivery_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_delivery public.deliveries%ROWTYPE; v_order public.orders%ROWTYPE; v_user uuid; v_events jsonb;
BEGIN
  v_user := private.require_staff_permission('orders','select');
  SELECT * INTO v_delivery FROM public.deliveries WHERE id=p_delivery_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id=v_delivery.order_id;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',e.id,'event_type',e.event_type,'from_status',e.from_status,'to_status',e.to_status,'note',e.note,'metadata',e.metadata,'created_at',e.created_at,'created_by',e.created_by) ORDER BY e.created_at DESC),'[]'::jsonb) INTO v_events FROM public.delivery_events e WHERE e.delivery_id=p_delivery_id;
  RETURN jsonb_build_object('delivery',to_jsonb(v_delivery),'order',jsonb_build_object('id',v_order.id,'order_number',v_order.order_number,'customer_name',v_order.customer_name,'customer_phone',v_order.customer_phone,'delivery_address',v_order.delivery_address,'total_amount',v_order.total_amount,'status',v_order.status,'payment_status',v_order.payment_status),'events',v_events,'viewer',v_user);
END; $$;

GRANT EXECUTE ON FUNCTION public.get_delivery_operations_360(uuid) TO authenticated;
