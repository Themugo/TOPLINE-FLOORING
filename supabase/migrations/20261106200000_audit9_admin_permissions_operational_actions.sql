-- Phase 9: Admin permissions and operational action hardening.
-- Preserve the existing fulfillment workflow while enforcing terminal-state,
-- payment and active-driver checks at the SECURITY DEFINER boundary.

CREATE OR REPLACE FUNCTION public.mark_delivery_picked(p_delivery_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  v_user uuid;
  v_order_id uuid;
  v_status text;
  v_payment_status text;
BEGIN
  v_user := private.require_staff_permission('orders','update');
  SELECT d.order_id, d.status, o.payment_status
    INTO v_order_id, v_status, v_payment_status
  FROM public.deliveries d
  JOIN public.orders o ON o.id = d.order_id
  WHERE d.id = p_delivery_id
  FOR UPDATE OF d, o;
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
  IF v_status NOT IN ('processing','pending') THEN
    RAISE EXCEPTION 'Delivery must be processing or pending before picking';
  END IF;
  IF v_payment_status <> 'paid' THEN
    RAISE EXCEPTION 'Order must be fully paid before picking';
  END IF;
  UPDATE public.deliveries
     SET status='processing', picked_at=COALESCE(picked_at,now()), updated_at=now()
   WHERE id=p_delivery_id;
  INSERT INTO public.fulfillment_events(order_id,delivery_id,event_type,from_status,to_status,created_by)
  VALUES(v_order_id,p_delivery_id,'picked',v_status,'processing',v_user);
  RETURN jsonb_build_object('success',true,'delivery_id',p_delivery_id,'status','processing','picked_at',now());
END; $$;

CREATE OR REPLACE FUNCTION public.reschedule_order_delivery(p_delivery_id uuid,p_scheduled_date date,p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_order_id uuid; v_status text; v_old date;
BEGIN
  v_user := private.require_staff_permission('orders','update');
  IF p_scheduled_date IS NULL OR p_scheduled_date < current_date THEN RAISE EXCEPTION 'Scheduled date must be today or later'; END IF;
  SELECT order_id,status,scheduled_date INTO v_order_id,v_status,v_old
    FROM public.deliveries WHERE id=p_delivery_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
  IF v_status IN ('delivered','cancelled') THEN RAISE EXCEPTION 'Closed delivery cannot be rescheduled'; END IF;
  UPDATE public.deliveries SET scheduled_date=p_scheduled_date,updated_at=now() WHERE id=p_delivery_id;
  INSERT INTO public.fulfillment_events(order_id,delivery_id,event_type,note,metadata,created_by)
  VALUES(v_order_id,p_delivery_id,'rescheduled',nullif(trim(p_note),''),jsonb_build_object('previous_date',v_old,'new_date',p_scheduled_date),v_user);
  RETURN jsonb_build_object('success',true,'delivery_id',p_delivery_id,'scheduled_date',p_scheduled_date);
END; $$;

CREATE OR REPLACE FUNCTION public.record_delivery_exception(p_delivery_id uuid,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_order_id uuid; v_status text;
BEGIN
  v_user := private.require_staff_permission('orders','update');
  IF nullif(trim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'Exception reason is required'; END IF;
  SELECT order_id,status INTO v_order_id,v_status FROM public.deliveries WHERE id=p_delivery_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
  IF v_status IN ('delivered','cancelled') THEN RAISE EXCEPTION 'Closed delivery cannot receive an exception'; END IF;
  UPDATE public.deliveries
     SET status='failed',failed_reason=trim(p_reason),failed_at=now(),exception_count=exception_count+1,last_exception_at=now(),updated_at=now()
   WHERE id=p_delivery_id;
  INSERT INTO public.fulfillment_events(order_id,delivery_id,event_type,from_status,to_status,note,created_by)
  VALUES(v_order_id,p_delivery_id,'exception',v_status,'failed',trim(p_reason),v_user);
  RETURN jsonb_build_object('success',true,'delivery_id',p_delivery_id,'status','failed','reason',trim(p_reason));
END; $$;

CREATE OR REPLACE FUNCTION public.recover_failed_delivery(p_delivery_id uuid,p_scheduled_date date DEFAULT NULL,p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_order_id uuid; v_status text; v_order_status text; v_payment_status text;
BEGIN
  v_user := private.require_staff_permission('orders','update');
  SELECT d.order_id,d.status,o.status,o.payment_status
    INTO v_order_id,v_status,v_order_status,v_payment_status
  FROM public.deliveries d JOIN public.orders o ON o.id=d.order_id
  WHERE d.id=p_delivery_id
  FOR UPDATE OF d,o;
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
  IF v_status <> 'failed' THEN RAISE EXCEPTION 'Only failed deliveries can be recovered'; END IF;
  IF v_order_status IN ('cancelled','completed') THEN RAISE EXCEPTION 'Closed order cannot recover a delivery'; END IF;
  IF v_payment_status <> 'paid' THEN RAISE EXCEPTION 'Order must be fully paid before recovery'; END IF;
  IF p_scheduled_date IS NOT NULL AND p_scheduled_date < current_date THEN RAISE EXCEPTION 'Scheduled date must be today or later'; END IF;
  UPDATE public.deliveries SET status='processing',scheduled_date=COALESCE(p_scheduled_date,scheduled_date),failed_reason=NULL,updated_at=now() WHERE id=p_delivery_id;
  INSERT INTO public.fulfillment_events(order_id,delivery_id,event_type,from_status,to_status,note,created_by)
  VALUES(v_order_id,p_delivery_id,'exception_cleared','failed','processing',nullif(trim(p_note),''),v_user);
  RETURN jsonb_build_object('success',true,'delivery_id',p_delivery_id,'status','processing');
END; $$;

CREATE OR REPLACE FUNCTION public.dispatch_order_delivery(p_delivery_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  v_user uuid; v_order_id uuid; v_from text; v_payment text; v_address text; v_driver uuid; v_driver_active boolean;
BEGIN
  v_user := private.require_staff_permission('orders','update');
  SELECT d.order_id,d.status,d.assigned_driver_user_id,o.payment_status,o.delivery_address,
         EXISTS (SELECT 1 FROM public.staff_profiles sp WHERE sp.user_id=d.assigned_driver_user_id AND sp.is_active=true)
    INTO v_order_id,v_from,v_driver,v_payment,v_address,v_driver_active
  FROM public.deliveries d JOIN public.orders o ON o.id=d.order_id
  WHERE d.id=p_delivery_id FOR UPDATE OF d,o;
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
  IF v_payment <> 'paid' THEN RAISE EXCEPTION 'Order must be fully paid before dispatch'; END IF;
  IF nullif(trim(COALESCE(v_address,'')),'') IS NULL THEN RAISE EXCEPTION 'Delivery address is required before dispatch'; END IF;
  IF v_driver IS NULL OR NOT v_driver_active THEN RAISE EXCEPTION 'An active delivery driver must be assigned before dispatch'; END IF;
  IF v_from NOT IN ('pending','processing') THEN RAISE EXCEPTION 'Delivery cannot be dispatched from its current state'; END IF;
  UPDATE public.deliveries SET status='dispatched',dispatched_at=now(),updated_at=now() WHERE id=p_delivery_id;
  UPDATE public.orders SET status='processing',updated_at=now() WHERE id=v_order_id;
  INSERT INTO public.delivery_events(delivery_id,order_id,event_type,from_status,to_status,created_by) VALUES(p_delivery_id,v_order_id,'dispatched',v_from,'dispatched',v_user);
  INSERT INTO public.fulfillment_events(order_id,delivery_id,event_type,from_status,to_status,created_by) VALUES(v_order_id,p_delivery_id,'assigned',v_from,'dispatched',v_user);
  RETURN jsonb_build_object('success',true,'delivery_id',p_delivery_id,'status','dispatched');
END; $$;

COMMENT ON FUNCTION public.mark_delivery_picked(uuid) IS 'Staff-only picking boundary; paid orders only and auditable transition.';
COMMENT ON FUNCTION public.reschedule_order_delivery(uuid,date,text) IS 'Staff-only reschedule boundary; delivered and cancelled deliveries are terminal.';
COMMENT ON FUNCTION public.record_delivery_exception(uuid,text) IS 'Staff-only exception boundary; delivered and cancelled deliveries are terminal.';
COMMENT ON FUNCTION public.recover_failed_delivery(uuid,date,text) IS 'Staff-only recovery boundary; closed orders and unpaid orders cannot re-enter fulfilment.';
COMMENT ON FUNCTION public.dispatch_order_delivery(uuid) IS 'Staff-only dispatch boundary; payment, address, state and active-driver checks are server enforced.';
