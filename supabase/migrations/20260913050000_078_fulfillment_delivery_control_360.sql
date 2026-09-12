-- Operation 5: Fulfillment & Delivery 360
-- End-to-end control plane: paid order -> readiness -> assignment -> dispatch -> transit -> POD -> tracking -> exception recovery.

ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS assigned_driver_user_id uuid REFERENCES public.staff_profiles(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS picked_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS exception_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_exception_at timestamptz;

CREATE INDEX IF NOT EXISTS deliveries_order_status_idx ON public.deliveries(order_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS deliveries_driver_status_idx ON public.deliveries(assigned_driver_user_id,status) WHERE assigned_driver_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.fulfillment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  delivery_id uuid REFERENCES public.deliveries(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('readiness_checked','ready','not_ready','picked','assigned','rescheduled','exception','exception_cleared','completed')),
  from_status text,
  to_status text,
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fulfillment_events_order_idx ON public.fulfillment_events(order_id,created_at DESC);
CREATE INDEX IF NOT EXISTS fulfillment_events_delivery_idx ON public.fulfillment_events(delivery_id,created_at DESC);
ALTER TABLE public.fulfillment_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fulfillment_events FROM anon;
GRANT SELECT ON public.fulfillment_events TO authenticated;
DROP POLICY IF EXISTS fulfillment_events_staff_read ON public.fulfillment_events;
CREATE POLICY fulfillment_events_staff_read ON public.fulfillment_events FOR SELECT TO authenticated
USING (private.current_user_has_permission('orders','select'));

CREATE OR REPLACE FUNCTION public.check_order_fulfillment_readiness(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_order public.orders%ROWTYPE; v_missing integer := 0; v_reserved numeric := 0; v_required numeric := 0; v_reasons jsonb := '[]'::jsonb;
BEGIN
  v_user := private.require_staff_permission('orders','select');
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status IN ('cancelled','completed') THEN v_reasons := v_reasons || jsonb_build_array('Order is closed'); END IF;
  IF COALESCE(v_order.payment_status,'pending') <> 'paid' THEN v_reasons := v_reasons || jsonb_build_array('Order is not fully paid'); END IF;
  SELECT COALESCE(SUM(oi.quantity),0), COALESCE(SUM(CASE WHEN r.status='converted' THEN r.quantity ELSE 0 END),0)
    INTO v_required,v_reserved
  FROM public.order_items oi
  LEFT JOIN public.inventory_reservations r ON r.order_id=oi.order_id AND r.product_id=oi.product_id AND r.variant_id IS NOT DISTINCT FROM oi.variant_id
  WHERE oi.order_id=p_order_id;
  IF v_required > 0 AND v_reserved < v_required THEN v_reasons := v_reasons || jsonb_build_array('Inventory reservations are not fully converted'); END IF;
  IF nullif(trim(COALESCE(v_order.delivery_address,'')),'') IS NULL THEN v_reasons := v_reasons || jsonb_build_array('Delivery address is missing'); END IF;
  IF jsonb_array_length(v_reasons)=0 THEN
    INSERT INTO public.fulfillment_events(order_id,event_type,to_status,metadata,created_by) VALUES(p_order_id,'ready','ready',jsonb_build_object('payment_status',v_order.payment_status),v_user);
  ELSE
    INSERT INTO public.fulfillment_events(order_id,event_type,to_status,note,metadata,created_by) VALUES(p_order_id,'not_ready','not_ready',v_reasons->>0,jsonb_build_object('reasons',v_reasons),v_user);
  END IF;
  RETURN jsonb_build_object('ready',jsonb_array_length(v_reasons)=0,'reasons',v_reasons,'required_quantity',v_required,'converted_quantity',v_reserved,'viewer',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.mark_order_ready_for_fulfillment(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_delivery public.deliveries%ROWTYPE; v_readiness jsonb;
BEGIN
  v_user := private.require_staff_permission('orders','update');
  v_readiness := public.check_order_fulfillment_readiness(p_order_id);
  IF COALESCE((v_readiness->>'ready')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION 'Order is not ready for fulfillment: %',v_readiness->>'reasons'; END IF;
  SELECT * INTO v_delivery FROM public.deliveries WHERE order_id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM public.create_order_delivery(p_order_id,NULL,NULL,NULL,NULL);
    SELECT * INTO v_delivery FROM public.deliveries WHERE order_id=p_order_id FOR UPDATE;
  END IF;
  UPDATE public.deliveries SET status=CASE WHEN status='pending' THEN 'processing' ELSE status END,ready_at=COALESCE(ready_at,now()),updated_at=now() WHERE id=v_delivery.id;
  UPDATE public.orders SET status='processing',updated_at=now() WHERE id=p_order_id AND status IN ('pending','confirmed','processing');
  INSERT INTO public.fulfillment_events(order_id,delivery_id,event_type,from_status,to_status,created_by) VALUES(p_order_id,v_delivery.id,'ready',v_delivery.status,'processing',v_user);
  RETURN jsonb_build_object('success',true,'order_id',p_order_id,'delivery_id',v_delivery.id,'status','processing','ready_at',now());
END; $$;

CREATE OR REPLACE FUNCTION public.assign_delivery_driver(p_delivery_id uuid,p_driver_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_order_id uuid; v_old uuid; v_status text; v_name text; v_phone text;
BEGIN
  v_user := private.require_staff_permission('orders','update');
  SELECT order_id,assigned_driver_user_id,status INTO v_order_id,v_old,v_status FROM public.deliveries WHERE id=p_delivery_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
  IF v_status IN ('delivered','cancelled') THEN RAISE EXCEPTION 'Delivery is closed'; END IF;
  SELECT display_name,phone INTO v_name,v_phone FROM public.staff_profiles WHERE user_id=p_driver_user_id AND is_active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Assigned driver must be an active staff member'; END IF;
  UPDATE public.deliveries SET assigned_driver_user_id=p_driver_user_id,driver_name=COALESCE(v_name,driver_name),driver_phone=COALESCE(v_phone,driver_phone),updated_at=now() WHERE id=p_delivery_id;
  INSERT INTO public.fulfillment_events(order_id,delivery_id,event_type,metadata,created_by) VALUES(v_order_id,p_delivery_id,'assigned',jsonb_build_object('previous_driver_user_id',v_old,'driver_user_id',p_driver_user_id),v_user);
  RETURN jsonb_build_object('success',true,'delivery_id',p_delivery_id,'driver_user_id',p_driver_user_id,'driver_name',v_name);
END; $$;

CREATE OR REPLACE FUNCTION public.mark_delivery_picked(p_delivery_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_order_id uuid; v_status text;
BEGIN
  v_user := private.require_staff_permission('orders','update');
  SELECT order_id,status INTO v_order_id,v_status FROM public.deliveries WHERE id=p_delivery_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
  IF v_status NOT IN ('processing','pending') THEN RAISE EXCEPTION 'Delivery must be processing or pending before picking'; END IF;
  UPDATE public.deliveries SET status='processing',picked_at=COALESCE(picked_at,now()),updated_at=now() WHERE id=p_delivery_id;
  INSERT INTO public.fulfillment_events(order_id,delivery_id,event_type,from_status,to_status,created_by) VALUES(v_order_id,p_delivery_id,'picked',v_status,'processing',v_user);
  RETURN jsonb_build_object('success',true,'delivery_id',p_delivery_id,'status','processing','picked_at',now());
END; $$;

CREATE OR REPLACE FUNCTION public.reschedule_order_delivery(p_delivery_id uuid,p_scheduled_date date,p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_order_id uuid; v_status text; v_old date;
BEGIN
  v_user := private.require_staff_permission('orders','update');
  IF p_scheduled_date IS NULL OR p_scheduled_date < current_date THEN RAISE EXCEPTION 'Scheduled date must be today or later'; END IF;
  SELECT order_id,status,scheduled_date INTO v_order_id,v_status,v_old FROM public.deliveries WHERE id=p_delivery_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
  IF v_status='delivered' THEN RAISE EXCEPTION 'Delivered delivery cannot be rescheduled'; END IF;
  UPDATE public.deliveries SET scheduled_date=p_scheduled_date,updated_at=now() WHERE id=p_delivery_id;
  INSERT INTO public.fulfillment_events(order_id,delivery_id,event_type,note,metadata,created_by) VALUES(v_order_id,p_delivery_id,'rescheduled',nullif(trim(p_note),''),jsonb_build_object('previous_date',v_old,'new_date',p_scheduled_date),v_user);
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
  IF v_status='delivered' THEN RAISE EXCEPTION 'Delivered delivery cannot receive an exception'; END IF;
  UPDATE public.deliveries SET status='failed',failed_reason=trim(p_reason),failed_at=now(),exception_count=exception_count+1,last_exception_at=now(),updated_at=now() WHERE id=p_delivery_id;
  INSERT INTO public.fulfillment_events(order_id,delivery_id,event_type,from_status,to_status,note,created_by) VALUES(v_order_id,p_delivery_id,'exception',v_status,'failed',trim(p_reason),v_user);
  RETURN jsonb_build_object('success',true,'delivery_id',p_delivery_id,'status','failed','reason',trim(p_reason));
END; $$;

CREATE OR REPLACE FUNCTION public.recover_failed_delivery(p_delivery_id uuid,p_scheduled_date date DEFAULT NULL,p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_order_id uuid; v_status text;
BEGIN
  v_user := private.require_staff_permission('orders','update');
  SELECT order_id,status INTO v_order_id,v_status FROM public.deliveries WHERE id=p_delivery_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
  IF v_status<>'failed' THEN RAISE EXCEPTION 'Only failed deliveries can be recovered'; END IF;
  IF p_scheduled_date IS NOT NULL AND p_scheduled_date < current_date THEN RAISE EXCEPTION 'Scheduled date must be today or later'; END IF;
  UPDATE public.deliveries SET status='processing',scheduled_date=COALESCE(p_scheduled_date,scheduled_date),failed_reason=NULL,updated_at=now() WHERE id=p_delivery_id;
  INSERT INTO public.fulfillment_events(order_id,delivery_id,event_type,from_status,to_status,note,created_by) VALUES(v_order_id,p_delivery_id,'exception_cleared','failed','processing',nullif(trim(p_note),''),v_user);
  RETURN jsonb_build_object('success',true,'delivery_id',p_delivery_id,'status','processing');
END; $$;

CREATE OR REPLACE FUNCTION public.get_fulfillment_delivery_360(p_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_days integer:=LEAST(GREATEST(COALESCE(p_days,30),1),365); v_since timestamptz:=now()-(LEAST(GREATEST(COALESCE(p_days,30),1),365)||' days')::interval;
BEGIN
  v_user := private.require_staff_permission('orders','select');
  RETURN jsonb_build_object(
    'days',v_days,
    'orders_paid',(SELECT count(*) FROM public.orders WHERE payment_status='paid' AND status NOT IN ('cancelled')),
    'deliveries_total',(SELECT count(*) FROM public.deliveries WHERE created_at>=v_since),
    'pending',(SELECT count(*) FROM public.deliveries WHERE status='pending'),
    'processing',(SELECT count(*) FROM public.deliveries WHERE status='processing'),
    'dispatched',(SELECT count(*) FROM public.deliveries WHERE status='dispatched'),
    'in_transit',(SELECT count(*) FROM public.deliveries WHERE status='in_transit'),
    'delivered',(SELECT count(*) FROM public.deliveries WHERE status='delivered' AND delivered_at>=v_since),
    'failed',(SELECT count(*) FROM public.deliveries WHERE status='failed'),
    'unscheduled',(SELECT count(*) FROM public.deliveries WHERE status NOT IN ('delivered','cancelled') AND scheduled_date IS NULL),
    'unassigned',(SELECT count(*) FROM public.deliveries WHERE status NOT IN ('delivered','cancelled') AND assigned_driver_user_id IS NULL),
    'overdue',(SELECT count(*) FROM public.deliveries WHERE status NOT IN ('delivered','cancelled') AND scheduled_date < current_date),
    'exceptions',(SELECT count(*) FROM public.deliveries WHERE exception_count>0 AND last_exception_at>=v_since),
    'recent_events',(SELECT COALESCE(jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC),'[]'::jsonb) FROM (SELECT * FROM public.fulfillment_events WHERE created_at>=v_since ORDER BY created_at DESC LIMIT 100) e),
    'viewer',v_user
  );
END; $$;

REVOKE ALL ON FUNCTION public.check_order_fulfillment_readiness(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.mark_order_ready_for_fulfillment(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.assign_delivery_driver(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.mark_delivery_picked(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reschedule_order_delivery(uuid,date,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.record_delivery_exception(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.recover_failed_delivery(uuid,date,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.get_fulfillment_delivery_360(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.check_order_fulfillment_readiness(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_ready_for_fulfillment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_delivery_driver(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_delivery_picked(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_order_delivery(uuid,date,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_delivery_exception(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recover_failed_delivery(uuid,date,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_fulfillment_delivery_360(integer) TO authenticated;

COMMENT ON TABLE public.fulfillment_events IS 'End-to-end fulfillment and delivery operational audit trail.';
COMMENT ON FUNCTION public.get_fulfillment_delivery_360(integer) IS 'Staff-authorized server snapshot for the complete fulfillment and delivery operation.';

CREATE OR REPLACE FUNCTION public.get_active_delivery_drivers()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid;
BEGIN
  v_user := private.require_staff_permission('orders','select');
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id',sp.user_id,'display_name',sp.display_name,'phone',sp.phone) ORDER BY sp.display_name) FROM public.staff_profiles sp WHERE sp.is_active=true),'[]'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.get_active_delivery_drivers() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_delivery_drivers() TO authenticated;

CREATE OR REPLACE FUNCTION public.dispatch_order_delivery(p_delivery_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_order_id uuid; v_from text; v_payment text; v_address text; v_driver uuid;
BEGIN
  v_user := private.require_staff_permission('orders','update');
  SELECT d.order_id,d.status,d.assigned_driver_user_id,o.payment_status,o.delivery_address
    INTO v_order_id,v_from,v_driver,v_payment,v_address
  FROM public.deliveries d JOIN public.orders o ON o.id=d.order_id
  WHERE d.id=p_delivery_id FOR UPDATE OF d,o;
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
  IF v_payment <> 'paid' THEN RAISE EXCEPTION 'Order must be fully paid before dispatch'; END IF;
  IF nullif(trim(COALESCE(v_address,'')),'') IS NULL THEN RAISE EXCEPTION 'Delivery address is required before dispatch'; END IF;
  IF v_driver IS NULL THEN RAISE EXCEPTION 'An active delivery driver must be assigned before dispatch'; END IF;
  IF v_from NOT IN ('pending','processing') THEN RAISE EXCEPTION 'Delivery cannot be dispatched from its current state'; END IF;
  UPDATE public.deliveries SET status='dispatched',dispatched_at=now(),updated_at=now() WHERE id=p_delivery_id;
  UPDATE public.orders SET status='processing',updated_at=now() WHERE id=v_order_id;
  INSERT INTO public.delivery_events(delivery_id,order_id,event_type,from_status,to_status,created_by) VALUES(p_delivery_id,v_order_id,'dispatched',v_from,'dispatched',v_user);
  INSERT INTO public.fulfillment_events(order_id,delivery_id,event_type,from_status,to_status,created_by) VALUES(v_order_id,p_delivery_id,'assigned',v_from,'dispatched',v_user);
  RETURN jsonb_build_object('success',true,'delivery_id',p_delivery_id,'status','dispatched');
END; $$;
GRANT EXECUTE ON FUNCTION public.dispatch_order_delivery(uuid) TO authenticated;
