-- Order lifecycle recovery hardening. Additive migration: no existing payment/order rows are rewritten.
-- Verified late success may recover a failed attempt; stale failure cannot downgrade a success.

CREATE OR REPLACE FUNCTION public.apply_customer_payment_provider_event(
  p_provider text,p_provider_event_id text,p_event_type text,p_status text,p_amount numeric,p_currency text,
  p_order_id uuid DEFAULT NULL,p_invoice_id uuid DEFAULT NULL,p_provider_transaction_id text DEFAULT NULL,p_provider_reference text DEFAULT NULL,p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
DECLARE v_event public.payment_provider_events%ROWTYPE; v_tx public.payment_transactions%ROWTYPE; v_order public.orders%ROWTYPE; v_invoice public.invoices%ROWTYPE; v_attempt public.payment_attempts%ROWTYPE; v_paid numeric; v_new text; v_type text:=lower(trim(coalesce(p_event_type,''))); v_provider text:=lower(trim(coalesce(p_provider,''))); v_event_id text:=trim(coalesce(p_provider_event_id,'')); v_hash text; v_item record; v_reserved numeric:=0; v_stock numeric:=0; v_inventory_ready boolean:=true; v_inventory_reason text; v_inventory_consumed boolean:=false; v_fulfillment_review_required boolean:=false;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Payment provider event boundary is service-role only'; END IF;
 IF v_provider='' OR v_event_id='' THEN RAISE EXCEPTION 'Provider and event id are required'; END IF;
 IF upper(coalesce(p_currency,'KES'))<>'KES' THEN RAISE EXCEPTION 'Unsupported payment currency'; END IF;
 v_hash:=encode(pg_catalog.sha256(pg_catalog.convert_to(coalesce(p_payload,'{}'::jsonb)::text,'UTF8')),'hex');
 SELECT * INTO v_event FROM public.payment_provider_events WHERE provider=v_provider AND provider_event_id=v_event_id FOR UPDATE;
 IF FOUND THEN IF v_event.payload_hash<>v_hash THEN RAISE EXCEPTION 'Provider event replay payload mismatch'; END IF; IF v_event.status IN ('processed','ignored') THEN RETURN jsonb_build_object('success',true,'event_id',v_event.id,'status',v_event.status,'idempotent_replay',true); END IF; END IF;
 INSERT INTO public.payment_provider_events(provider,provider_event_id,event_type,status,order_id,invoice_id,amount,currency,payload_hash,payload) VALUES(v_provider,v_event_id,v_type,'received',p_order_id,p_invoice_id,p_amount,'KES',v_hash,coalesce(p_payload,'{}'::jsonb)) ON CONFLICT(provider,provider_event_id) DO UPDATE SET status='received',updated_at=now() RETURNING * INTO v_event;
 SELECT * INTO v_tx FROM public.payment_transactions
  WHERE provider=v_provider AND p_provider_transaction_id IS NOT NULL
    AND provider_transaction_id=trim(p_provider_transaction_id)
  FOR UPDATE;
 IF NOT FOUND AND p_provider_transaction_id IS NULL AND p_order_id IS NOT NULL THEN
   SELECT * INTO v_tx FROM public.payment_transactions
    WHERE order_id=p_order_id AND provider=v_provider AND status IN ('pending','failed')
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 END IF;
 IF NOT FOUND AND p_provider_transaction_id IS NULL AND p_invoice_id IS NOT NULL THEN
   SELECT * INTO v_tx FROM public.payment_transactions
    WHERE invoice_id=p_invoice_id AND provider=v_provider AND status IN ('pending','failed')
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 END IF;
 IF v_tx.id IS NULL THEN UPDATE public.payment_provider_events SET status='failed',error_message='Payment transaction not found',updated_at=now() WHERE id=v_event.id; RETURN jsonb_build_object('success',false,'error','Payment transaction not found','event_id',v_event.id); END IF;
 IF (p_order_id IS NOT NULL AND v_tx.order_id IS DISTINCT FROM p_order_id) OR (p_invoice_id IS NOT NULL AND v_tx.invoice_id IS DISTINCT FROM p_invoice_id) THEN RAISE EXCEPTION 'Provider transaction target does not match payment attempt'; END IF;
 IF p_amount IS NOT NULL AND p_amount<>v_tx.amount THEN UPDATE public.payment_provider_events SET status='failed',error_message='Provider amount does not match payment transaction',updated_at=now() WHERE id=v_event.id; RAISE EXCEPTION 'Provider amount does not match payment transaction'; END IF;
 IF v_type IN ('payment.failed','payment.cancelled','charge.failed','failed','failure') OR lower(coalesce(p_status,'')) IN ('failed','cancelled','failure') THEN
   -- Provider notifications can arrive out of order. A failure/cancel event must never
   -- downgrade money already confirmed as successful (or later reversed/refunded).
   IF v_tx.status IN ('successful','reversed','refunded','partially_refunded') THEN
     UPDATE public.payment_provider_events SET payment_transaction_id=v_tx.id,status='processed',processed_at=now(),updated_at=now() WHERE id=v_event.id;
     RETURN jsonb_build_object('success',true,'status',v_tx.status,'payment_transaction_id',v_tx.id,'ignored_stale_failure',true);
   END IF;
   UPDATE public.payment_transactions SET status='failed',failure_reason=coalesce(nullif(p_payload->>'ResultDesc',''),nullif(p_payload->>'message',''),'Provider payment failed'),completed_at=now(),updated_at=now() WHERE id=v_tx.id;
   UPDATE public.payment_attempts SET status='failed',failure_reason=coalesce(nullif(p_payload->>'ResultDesc',''),nullif(p_payload->>'message',''),'Provider payment failed'),updated_at=now() WHERE payment_transaction_id=v_tx.id;
   UPDATE public.payment_provider_events SET payment_transaction_id=v_tx.id,status='processed',processed_at=now(),updated_at=now() WHERE id=v_event.id;
   RETURN jsonb_build_object('success',true,'status','failed','payment_transaction_id',v_tx.id);
 END IF;
 IF v_type NOT IN ('payment.success','payment.succeeded','payment.completed','charge.succeeded','paid','success','successful') AND lower(coalesce(p_status,'')) NOT IN ('successful','success','paid','completed') THEN UPDATE public.payment_provider_events SET status='ignored',processed_at=now(),updated_at=now() WHERE id=v_event.id; RETURN jsonb_build_object('success',true,'status','ignored'); END IF;
 IF p_provider_transaction_id IS NULL OR trim(p_provider_transaction_id)='' THEN RAISE EXCEPTION 'Successful provider payment requires transaction id'; END IF;
 IF v_tx.status='successful' THEN
   UPDATE public.payment_attempts SET status='successful',updated_at=now() WHERE payment_transaction_id=v_tx.id;
   UPDATE public.payment_provider_events SET payment_transaction_id=v_tx.id,status='processed',processed_at=now(),updated_at=now() WHERE id=v_event.id;
   RETURN jsonb_build_object('success',true,'status','successful','payment_transaction_id',v_tx.id,'idempotent_payment_replay',true);
 END IF;
 IF p_order_id IS NOT NULL THEN
   SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF; IF v_order.status='cancelled' THEN RAISE EXCEPTION 'Cancelled order cannot receive payment'; END IF;
   SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.payment_transactions WHERE order_id=v_order.id AND status='successful' AND id<>v_tx.id;
   IF v_paid+v_tx.amount>v_order.total_amount THEN RAISE EXCEPTION 'Payment exceeds outstanding order balance'; END IF;
   UPDATE public.payment_transactions SET status='successful',provider_transaction_id=p_provider_transaction_id,provider_reference=p_provider_reference,paid_at=now(),completed_at=now(),updated_at=now() WHERE id=v_tx.id;
   SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.payment_transactions WHERE order_id=v_order.id AND status='successful';
   v_new:=CASE WHEN v_paid>=v_order.total_amount THEN 'paid' WHEN v_paid>0 THEN 'partial' ELSE 'pending' END;
   UPDATE public.orders SET payment_status=v_new,status=CASE WHEN v_new='paid' AND status='pending' THEN 'confirmed' ELSE status END,updated_at=now() WHERE id=v_order.id;
   -- Customer checkout uses this RPC (not the older staff payment RPC). Consume the exact
   -- reserved product/variant stock when the order first becomes fully paid. If a late
   -- callback arrives after reservations expire or stock is no longer available, still
   -- record the verified money and create a visible fulfillment exception instead of
   -- rolling back the successful payment event.
   IF v_new='paid' AND v_order.payment_status IS DISTINCT FROM 'paid' THEN
     FOR v_item IN
       SELECT oi.product_id,oi.variant_id,SUM(oi.quantity)::numeric AS required_qty
       FROM public.order_items oi WHERE oi.order_id=v_order.id
       GROUP BY oi.product_id,oi.variant_id
     LOOP
       SELECT COALESCE(SUM(r.quantity),0) INTO v_reserved
       FROM public.inventory_reservations r
       WHERE r.order_id=v_order.id AND r.product_id=v_item.product_id
         AND r.variant_id IS NOT DISTINCT FROM v_item.variant_id
         AND r.status='reserved' AND (r.expires_at IS NULL OR r.expires_at>now());
       IF v_reserved < v_item.required_qty THEN
         v_inventory_ready:=false;
         v_inventory_reason:='Payment confirmed after the inventory reservation expired or was released';
         EXIT;
       END IF;
       IF v_item.variant_id IS NOT NULL THEN
         SELECT stock_quantity INTO v_stock FROM public.product_variants WHERE id=v_item.variant_id FOR UPDATE;
       ELSE
         SELECT stock_quantity INTO v_stock FROM public.products WHERE id=v_item.product_id FOR UPDATE;
       END IF;
       IF COALESCE(v_stock,0) < v_item.required_qty THEN
         v_inventory_ready:=false;
         v_inventory_reason:='Payment confirmed but available stock is insufficient; manual inventory review is required';
         EXIT;
       END IF;
     END LOOP;
     IF v_inventory_ready THEN
       FOR v_item IN
         SELECT oi.product_id,oi.variant_id,SUM(oi.quantity)::integer AS qty
         FROM public.order_items oi WHERE oi.order_id=v_order.id
         GROUP BY oi.product_id,oi.variant_id
       LOOP
         IF v_item.variant_id IS NOT NULL THEN
           UPDATE public.product_variants SET stock_quantity=stock_quantity-v_item.qty,updated_at=now()
           WHERE id=v_item.variant_id AND stock_quantity>=v_item.qty;
           IF NOT FOUND THEN RAISE EXCEPTION 'Variant stock changed during payment reconciliation'; END IF;
           UPDATE public.products p SET in_stock=EXISTS(
             SELECT 1 FROM public.product_variants pv WHERE pv.product_id=p.id AND pv.is_active=true AND pv.stock_quantity>0
           ),updated_at=now() WHERE p.id=v_item.product_id;
         ELSE
           UPDATE public.products SET stock_quantity=stock_quantity-v_item.qty,
             in_stock=(stock_quantity-v_item.qty>0),updated_at=now()
           WHERE id=v_item.product_id AND stock_quantity>=v_item.qty;
           IF NOT FOUND THEN RAISE EXCEPTION 'Product stock changed during payment reconciliation'; END IF;
         END IF;
         INSERT INTO public.inventory_movements(product_id,movement_type,quantity,reference_type,reference_id,notes,created_by)
         VALUES(v_item.product_id,'out',v_item.qty,'order',v_order.id::text,
           CASE WHEN v_item.variant_id IS NOT NULL THEN 'Stock consumed by customer provider-confirmed paid order variant' ELSE 'Stock consumed by customer provider-confirmed paid order' END,NULL);
       END LOOP;
       UPDATE public.inventory_reservations SET status='converted',updated_at=now()
       WHERE order_id=v_order.id AND status='reserved' AND (expires_at IS NULL OR expires_at>now());
       v_inventory_consumed:=true;
     ELSE
       v_fulfillment_review_required:=true;
       INSERT INTO public.fulfillment_events(order_id,event_type,to_status,note,metadata,created_by)
       VALUES(v_order.id,'not_ready','not_ready',v_inventory_reason,
         jsonb_build_object('reason','payment_confirmed_inventory_exception','payment_transaction_id',v_tx.id,'inventory_review_required',true),NULL);
     END IF;
   END IF;
 ELSE
   SELECT * INTO v_invoice FROM public.invoices WHERE id=p_invoice_id FOR UPDATE; IF NOT FOUND OR v_invoice.status='cancelled' THEN RAISE EXCEPTION 'Invoice unavailable'; END IF;
   IF v_invoice.amount_paid+v_tx.amount>v_invoice.total_amount THEN RAISE EXCEPTION 'Payment exceeds outstanding invoice balance'; END IF;
   UPDATE public.payment_transactions SET status='successful',provider_transaction_id=p_provider_transaction_id,provider_reference=p_provider_reference,paid_at=now(),completed_at=now() WHERE id=v_tx.id;
   INSERT INTO public.payments(invoice_id,amount,method,reference,recorded_by,notes) VALUES(v_invoice.id,v_tx.amount,v_tx.method,p_provider_reference,NULL,'Provider payment reconciled');
   v_new:=CASE WHEN v_invoice.amount_paid+v_tx.amount>=v_invoice.total_amount THEN 'paid' ELSE 'partial' END;
   UPDATE public.invoices SET amount_paid=amount_paid+v_tx.amount,status=v_new,updated_at=now() WHERE id=v_invoice.id;
 END IF;
 UPDATE public.payment_attempts SET status='successful',provider_request_id=coalesce(provider_request_id,p_provider_transaction_id),provider_checkout_id=coalesce(provider_checkout_id,p_provider_transaction_id),updated_at=now() WHERE payment_transaction_id=v_tx.id;
 UPDATE public.payment_provider_events SET payment_transaction_id=v_tx.id,status='processed',processed_at=now(),updated_at=now() WHERE id=v_event.id;
 RETURN jsonb_build_object('success',true,'status','successful','payment_transaction_id',v_tx.id,'payment_status',v_new,'inventory_consumed',v_inventory_consumed,'fulfillment_review_required',v_fulfillment_review_required);
EXCEPTION WHEN others THEN IF v_event.id IS NOT NULL THEN UPDATE public.payment_provider_events SET status='failed',error_message=left(SQLERRM,1000),updated_at=now() WHERE id=v_event.id; END IF; RAISE;
END;$function$;
REVOKE ALL ON FUNCTION public.apply_customer_payment_provider_event(text,text,text,text,numeric,text,uuid,uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_customer_payment_provider_event(text,text,text,text,numeric,text,uuid,uuid,text,text,jsonb) TO service_role;

COMMENT ON FUNCTION public.apply_customer_payment_provider_event(text,text,text,text,numeric,text,uuid,uuid,text,text,jsonb)
IS 'Service-role payment event reconciliation. Supports verified late success recovery and prevents stale failure events from downgrading settled payments.';
