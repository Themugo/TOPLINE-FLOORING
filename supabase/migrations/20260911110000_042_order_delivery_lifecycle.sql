-- Phase 42: order delivery lifecycle foundation.
-- Delivery state is authoritative and order status follows delivery milestones.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_chk;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_chk CHECK (payment_status IN ('pending','partial','paid','failed','refunded'));

ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_status_check;
ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_status_check CHECK (status IN ('pending','processing','dispatched','in_transit','delivered','failed','cancelled'));
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS dispatched_at timestamptz;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS recipient_name text;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS proof_of_delivery_url text;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS proof_of_delivery_note text;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS failed_reason text;

CREATE UNIQUE INDEX IF NOT EXISTS deliveries_order_unique_idx ON public.deliveries(order_id);
CREATE INDEX IF NOT EXISTS deliveries_status_idx ON public.deliveries(status, scheduled_date);
CREATE INDEX IF NOT EXISTS deliveries_tracking_idx ON public.deliveries(tracking_number) WHERE tracking_number IS NOT NULL;

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.deliveries FROM anon;
GRANT SELECT ON public.deliveries TO authenticated;
DROP POLICY IF EXISTS deliveries_staff_read ON public.deliveries;
CREATE POLICY deliveries_staff_read ON public.deliveries FOR SELECT TO authenticated
USING (private.current_user_has_permission('orders','select'));

CREATE OR REPLACE FUNCTION public.create_order_delivery(
  p_order_id uuid,
  p_scheduled_date date DEFAULT NULL,
  p_driver_name text DEFAULT NULL,
  p_driver_phone text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
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
  RETURN jsonb_build_object('success',true,'delivery_id',v_delivery_id,'tracking_number',v_tracking,'status','pending','updated_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.update_delivery_dispatch(
  p_delivery_id uuid,
  p_scheduled_date date DEFAULT NULL,
  p_driver_name text DEFAULT NULL,
  p_driver_phone text DEFAULT NULL,
  p_delivery_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_order_id uuid; v_status text;
BEGIN
  v_user := private.require_staff_permission('orders','update');
  SELECT order_id,status INTO v_order_id,v_status FROM public.deliveries WHERE id=p_delivery_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
  IF v_status IN ('delivered','cancelled') THEN RAISE EXCEPTION 'Delivery is closed'; END IF;
  UPDATE public.deliveries SET scheduled_date=COALESCE(p_scheduled_date,scheduled_date),driver_name=COALESCE(NULLIF(trim(p_driver_name),''),driver_name),driver_phone=COALESCE(NULLIF(trim(p_driver_phone),''),driver_phone),delivery_notes=COALESCE(p_delivery_notes,delivery_notes),updated_at=now() WHERE id=p_delivery_id;
  UPDATE public.orders SET status=CASE WHEN status IN ('pending','confirmed') THEN 'processing' ELSE status END,updated_at=now() WHERE id=v_order_id;
  RETURN jsonb_build_object('success',true,'delivery_id',p_delivery_id,'status',v_status,'updated_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.dispatch_order_delivery(p_delivery_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_order_id uuid;
BEGIN
  v_user := private.require_staff_permission('orders','update');
  SELECT order_id INTO v_order_id FROM public.deliveries WHERE id=p_delivery_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
  UPDATE public.deliveries SET status='dispatched',dispatched_at=now(),updated_at=now() WHERE id=p_delivery_id AND status IN ('pending','processing');
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery cannot be dispatched from its current state'; END IF;
  UPDATE public.orders SET status='processing',updated_at=now() WHERE id=v_order_id;
  RETURN jsonb_build_object('success',true,'delivery_id',p_delivery_id,'status','dispatched','updated_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.advance_delivery_in_transit(p_delivery_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid;
BEGIN
  v_user := private.require_staff_permission('orders','update');
  UPDATE public.deliveries SET status='in_transit',updated_at=now() WHERE id=p_delivery_id AND status='dispatched';
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery must be dispatched first'; END IF;
  RETURN jsonb_build_object('success',true,'delivery_id',p_delivery_id,'status','in_transit','updated_by',v_user);
END; $$;

GRANT EXECUTE ON FUNCTION public.create_order_delivery(uuid,date,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_delivery_dispatch(uuid,date,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_order_delivery(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_delivery_in_transit(uuid) TO authenticated;
