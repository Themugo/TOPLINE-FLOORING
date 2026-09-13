-- Operation: Payments + Reconciliation + Provider Webhooks 360
-- Provider-neutral, replay-safe payment event boundary.

CREATE TABLE IF NOT EXISTS public.payment_provider_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('received','processed','ignored','failed')) DEFAULT 'received',
  payment_transaction_id uuid REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  amount numeric(12,2),
  currency text,
  payload_hash text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  error_message text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS payment_provider_events_order_idx
  ON public.payment_provider_events(order_id, received_at DESC);
CREATE INDEX IF NOT EXISTS payment_provider_events_status_idx
  ON public.payment_provider_events(status, received_at DESC);

ALTER TABLE public.payment_provider_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_provider_events FROM anon, authenticated;

-- Only the service-role webhook boundary may mutate/read the raw provider ledger.
REVOKE ALL ON FUNCTION public.apply_payment_provider_event(text,text,text,text,numeric,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.apply_payment_provider_event(
  p_provider text,
  p_provider_event_id text,
  p_event_type text,
  p_status text,
  p_amount numeric,
  p_currency text,
  p_order_id text DEFAULT NULL,
  p_provider_transaction_id text DEFAULT NULL,
  p_provider_reference text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE
  v_event public.payment_provider_events%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_tx public.payment_transactions%ROWTYPE;
  v_order_id uuid;
  v_amount numeric(12,2);
  v_paid numeric(12,2);
  v_refunded numeric(12,2);
  v_new_status text;
  v_item record;
  v_stock numeric(12,2);
  v_event_status text := lower(trim(coalesce(p_status,'')));
  v_event_type text := lower(trim(coalesce(p_event_type,'')));
  v_provider text := lower(trim(coalesce(p_provider,'')));
  v_event_id text := trim(coalesce(p_provider_event_id,''));
  v_payload_hash text;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Payment provider event boundary is service-role only';
  END IF;
  IF v_provider = '' OR v_event_id = '' THEN RAISE EXCEPTION 'Provider and event id are required'; END IF;
  IF length(v_provider) > 80 OR length(v_event_id) > 200 THEN RAISE EXCEPTION 'Provider event identity is invalid'; END IF;
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN RAISE EXCEPTION 'Payment payload must be an object'; END IF;
  v_payload_hash := encode(pg_catalog.digest(p_payload::text, 'sha256'), 'hex');

  SELECT * INTO v_event FROM public.payment_provider_events
   WHERE provider=v_provider AND provider_event_id=v_event_id FOR UPDATE;
  IF FOUND THEN
    IF v_event.payload_hash <> v_payload_hash THEN
      UPDATE public.payment_provider_events
         SET status='failed', error_message='Replay with different payload hash', updated_at=now()
       WHERE id=v_event.id;
      RAISE EXCEPTION 'Provider event replay payload mismatch';
    END IF;
    IF v_event.status IN ('processed','ignored') THEN
      RETURN jsonb_build_object('success',true,'event_id',v_event.id,'status',v_event.status,'idempotent_replay',true);
    END IF;
    UPDATE public.payment_provider_events SET status='received',error_message=NULL,updated_at=now() WHERE id=v_event.id;
  END IF;

  v_order_id := NULLIF(trim(coalesce(p_order_id,'')),'')::uuid;
  v_amount := NULLIF(p_amount,0);
  IF v_amount IS NOT NULL AND v_amount < 0 THEN RAISE EXCEPTION 'Payment amount cannot be negative'; END IF;

  INSERT INTO public.payment_provider_events(
    provider,provider_event_id,event_type,status,order_id,amount,currency,payload_hash,payload
  ) VALUES(
    v_provider,v_event_id,coalesce(nullif(v_event_type,''),'unknown'),'received',v_order_id,v_amount,upper(nullif(trim(coalesce(p_currency,'')),'')),v_payload_hash,p_payload
  ) RETURNING * INTO v_event;

  IF v_event_type IN ('payment.success','payment.succeeded','payment.completed','charge.succeeded','paid','success','successful')
     AND v_order_id IS NOT NULL AND v_amount IS NOT NULL AND v_amount > 0 THEN
    SELECT * INTO v_order FROM public.orders WHERE id=v_order_id FOR UPDATE;
    IF NOT FOUND THEN
      UPDATE public.payment_provider_events SET status='failed', error_message='Order not found', updated_at=now() WHERE id=v_event.id;
      RETURN jsonb_build_object('success',false,'event_id',v_event.id,'error','Order not found');
    END IF;
    IF v_order.status='cancelled' THEN
      UPDATE public.payment_provider_events SET status='failed', error_message='Cancelled order cannot receive payment', updated_at=now() WHERE id=v_event.id;
      RETURN jsonb_build_object('success',false,'event_id',v_event.id,'error','Cancelled order cannot receive payment');
    END IF;
    IF p_provider_transaction_id IS NOT NULL THEN
      SELECT * INTO v_tx FROM public.payment_transactions
       WHERE provider=v_provider AND provider_transaction_id=trim(p_provider_transaction_id) FOR UPDATE;
      IF FOUND THEN
        IF v_tx.amount <> v_amount OR v_tx.order_id IS DISTINCT FROM v_order_id THEN
          RAISE EXCEPTION 'Provider transaction conflicts with existing payment';
        END IF;
      ELSE
        SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.payment_transactions WHERE order_id=v_order_id AND status='successful';
        IF v_paid + v_amount > v_order.total_amount THEN RAISE EXCEPTION 'Provider payment exceeds outstanding order balance'; END IF;
        INSERT INTO public.payment_transactions(
          order_id,amount,currency,method,provider,provider_transaction_id,provider_reference,status,idempotency_key,metadata,notes,paid_at,created_at,updated_at
        ) VALUES(
          v_order_id,v_amount,coalesce(nullif(upper(trim(coalesce(p_currency,''))),''),'KES'),
          CASE WHEN v_provider='mpesa' THEN 'mpesa' WHEN v_provider IN ('stripe','card') THEN 'card' ELSE 'other' END,
          v_provider,trim(p_provider_transaction_id),NULLIF(trim(coalesce(p_provider_reference,'')),''),'successful',
          'provider-event:'||v_provider||':'||v_event_id,
          jsonb_build_object('provider_event_id',v_event_id,'event_type',v_event_type),
          'Provider webhook payment',now(),now(),now()
        ) RETURNING * INTO v_tx;
      END IF;
      SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.payment_transactions WHERE order_id=v_order_id AND status='successful';
      SELECT COALESCE(SUM(amount),0) INTO v_refunded FROM public.payment_refunds WHERE order_id=v_order_id AND status='successful';
      v_new_status := CASE
        WHEN v_refunded >= v_paid AND v_refunded > 0 THEN 'refunded'
        WHEN v_paid >= v_order.total_amount THEN 'paid'
        WHEN v_paid > 0 THEN 'partial'
        ELSE 'pending'
      END;
      UPDATE public.orders
         SET payment_status=v_new_status,
             status=CASE WHEN v_new_status='paid' AND status='pending' THEN 'confirmed' ELSE status END,
             updated_at=now()
       WHERE id=v_order_id;

      -- A provider-confirmed full payment consumes the same reserved stock
      -- boundary as the staff payment RPC. The order lock prevents races.
      IF v_new_status='paid' THEN
        FOR v_item IN
          SELECT r.product_id,r.variant_id,SUM(r.quantity)::integer AS qty
            FROM public.inventory_reservations r
           WHERE r.order_id=v_order_id AND r.status='reserved'
           GROUP BY r.product_id,r.variant_id
        LOOP
          IF v_item.variant_id IS NOT NULL THEN
            UPDATE public.product_variants
               SET stock_quantity=stock_quantity-v_item.qty,updated_at=now()
             WHERE id=v_item.variant_id AND stock_quantity >= v_item.qty;
            IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient variant stock to complete provider payment'; END IF;
            UPDATE public.products p
               SET in_stock=EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.product_id=p.id AND pv.is_active=true AND pv.stock_quantity>0),updated_at=now()
             WHERE p.id=v_item.product_id;
          ELSE
            UPDATE public.products
               SET stock_quantity=stock_quantity-v_item.qty,in_stock=(stock_quantity-v_item.qty > 0),updated_at=now()
             WHERE id=v_item.product_id AND stock_quantity >= v_item.qty;
            IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient stock to complete provider payment'; END IF;
          END IF;
          INSERT INTO public.inventory_movements(product_id,movement_type,quantity,reference_type,reference_id,notes,created_by)
          VALUES(v_item.product_id,'out',v_item.qty,'order',v_order_id::text,
            CASE WHEN v_item.variant_id IS NOT NULL THEN 'Stock consumed by paid provider-confirmed ecommerce order variant' ELSE 'Stock consumed by paid provider-confirmed ecommerce order' END,NULL);
        END LOOP;
        UPDATE public.inventory_reservations SET status='converted',updated_at=now()
         WHERE order_id=v_order_id AND status='reserved';
      END IF;

      UPDATE public.payment_provider_events
         SET status='processed',payment_transaction_id=v_tx.id,processed_at=now(),updated_at=now()
       WHERE id=v_event.id;
      RETURN jsonb_build_object('success',true,'event_id',v_event.id,'payment_id',v_tx.id,'order_id',v_order_id,'payment_status',v_new_status);
    END IF;
  END IF;

  IF v_event_type IN ('payment.failed','payment.cancelled','charge.failed','failed','failure') AND v_order_id IS NOT NULL THEN
    UPDATE public.payment_provider_events
       SET status='processed',processed_at=now(),updated_at=now()
     WHERE id=v_event.id;
    RETURN jsonb_build_object('success',true,'event_id',v_event.id,'status','processed','payment_status','failed');
  END IF;

  UPDATE public.payment_provider_events
     SET status='ignored',processed_at=now(),updated_at=now()
   WHERE id=v_event.id;
  RETURN jsonb_build_object('success',true,'event_id',v_event.id,'status','ignored');
EXCEPTION WHEN others THEN
  IF v_event.id IS NOT NULL THEN
    UPDATE public.payment_provider_events SET status='failed',error_message=left(SQLERRM,1000),updated_at=now() WHERE id=v_event.id;
  END IF;
  RAISE;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.apply_payment_provider_event(text,text,text,text,numeric,text,text,text,text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.reconcile_payment_provider_events(p_since timestamptz DEFAULT now()-interval '24 hours')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE
  v_failed integer;
  v_received integer;
  v_mismatch integer;
BEGIN
  IF auth.role() <> 'service_role' AND NOT private.current_user_has_permission('finance','update') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT count(*) INTO v_failed FROM public.payment_provider_events WHERE status='failed' AND received_at>=p_since;
  SELECT count(*) INTO v_received FROM public.payment_provider_events WHERE status='received' AND received_at>=p_since;
  SELECT count(*) INTO v_mismatch
    FROM public.orders o
   WHERE o.updated_at>=p_since
     AND o.payment_status IS DISTINCT FROM CASE
       WHEN (SELECT COALESCE(sum(pr.amount),0) FROM public.payment_refunds pr WHERE pr.order_id=o.id AND pr.status='successful') >= o.total_amount AND o.total_amount>0 THEN 'refunded'
       WHEN (SELECT COALESCE(sum(pt.amount),0) FROM public.payment_transactions pt WHERE pt.order_id=o.id AND pt.status='successful') >= o.total_amount AND o.total_amount>0 THEN 'paid'
       WHEN (SELECT COALESCE(sum(pt.amount),0) FROM public.payment_transactions pt WHERE pt.order_id=o.id AND pt.status='successful') > 0 THEN 'partial'
       ELSE 'pending' END;
  RETURN jsonb_build_object('success',true,'since',p_since,'failed_provider_events',v_failed,'unprocessed_provider_events',v_received,'order_payment_mismatches',v_mismatch);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.reconcile_payment_provider_events(timestamptz) TO authenticated, service_role;

COMMENT ON TABLE public.payment_provider_events IS 'Durable, hash-bound payment provider webhook ledger providing replay protection and auditability.';
COMMENT ON FUNCTION public.apply_payment_provider_event(text,text,text,text,numeric,text,text,text,text,jsonb) IS 'Service-role-only provider webhook application boundary. Idempotent by provider/event ID and payload hash.';
COMMENT ON FUNCTION public.reconcile_payment_provider_events(timestamptz) IS 'Payment provider and order-state reconciliation snapshot for service workers and finance staff.';
