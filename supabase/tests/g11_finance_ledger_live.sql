-- G-11 read-only staging ledger evidence check. All IDs and expected values are
-- supplied by the operator from a completed provider sandbox UAT.
BEGIN;
SET LOCAL statement_timeout = '30s';
DO $g11$
DECLARE
  v_order public.orders%ROWTYPE;
  v_tx public.payment_transactions%ROWTYPE;
  v_refund public.payment_refunds%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_paid numeric(12,2);
  v_refunded numeric(12,2);
  v_invoice_paid numeric(12,2);
  v_event_count integer;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id='__G11_ORDER_ID__';
  IF NOT FOUND THEN RAISE EXCEPTION 'G11 order fixture not found'; END IF;
  SELECT * INTO v_tx FROM public.payment_transactions WHERE id='__G11_PAYMENT_TRANSACTION_ID__';
  IF NOT FOUND THEN RAISE EXCEPTION 'G11 payment transaction fixture not found'; END IF;
  IF v_tx.order_id IS DISTINCT FROM v_order.id THEN RAISE EXCEPTION 'Payment transaction is not linked to expected order'; END IF;
  IF v_tx.status <> 'successful' THEN RAISE EXCEPTION 'Provider payment is not successful'; END IF;
  IF upper(coalesce(v_tx.currency,'KES')) <> 'KES' THEN RAISE EXCEPTION 'Unexpected payment currency'; END IF;
  IF v_tx.amount <> '__G11_EXPECTED_PAYMENT_AMOUNT__'::numeric THEN RAISE EXCEPTION 'Payment amount differs from sandbox evidence'; END IF;
  IF coalesce(v_tx.provider,'') = '' OR coalesce(v_tx.provider_transaction_id,'') = '' THEN RAISE EXCEPTION 'Provider payment identity missing'; END IF;
  IF v_tx.provider_transaction_id <> '__G11_PROVIDER_TRANSACTION_ID__' THEN RAISE EXCEPTION 'Provider transaction identity mismatch'; END IF;
  SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.payment_transactions WHERE order_id=v_order.id AND status='successful';
  SELECT COALESCE(SUM(amount),0) INTO v_refunded FROM public.payment_refunds WHERE order_id=v_order.id AND status='successful';
  IF v_paid > v_order.total_amount THEN RAISE EXCEPTION 'Successful payment ledger exceeds order total'; END IF;
  IF v_refunded > v_paid THEN RAISE EXCEPTION 'Successful refund ledger exceeds successful payments'; END IF;
  IF v_order.payment_status NOT IN ('paid','partial','refunded') THEN RAISE EXCEPTION 'Order payment status is not reconciled'; END IF;

  SELECT * INTO v_refund FROM public.payment_refunds WHERE id='__G11_REFUND_ID__';
  IF NOT FOUND THEN RAISE EXCEPTION 'G11 refund fixture not found'; END IF;
  IF v_refund.payment_transaction_id <> v_tx.id OR v_refund.order_id <> v_order.id THEN RAISE EXCEPTION 'Refund is not tied to the tested payment/order'; END IF;
  IF v_refund.status <> '__G11_EXPECTED_REFUND_STATUS__' THEN RAISE EXCEPTION 'Refund status differs from provider sandbox evidence'; END IF;
  IF v_refund.amount <> '__G11_EXPECTED_REFUND_AMOUNT__'::numeric THEN RAISE EXCEPTION 'Refund amount differs from sandbox evidence'; END IF;
  IF v_refund.status='successful' AND (coalesce(v_refund.provider,'')='' OR coalesce(v_refund.provider_refund_id,'')='') THEN RAISE EXCEPTION 'Successful refund lacks provider identity'; END IF;
  IF v_refund.status='successful' AND v_refund.provider_refund_id <> '__G11_PROVIDER_REFUND_ID__' THEN RAISE EXCEPTION 'Provider refund identity mismatch'; END IF;
  SELECT count(*) INTO v_event_count FROM public.finance_control_events
    WHERE entity_type='refund' AND entity_id=v_refund.id
      AND event_type=CASE WHEN v_refund.status='successful' THEN 'refund_succeeded' ELSE 'refund_failed' END;
  IF v_refund.status IN ('successful','failed') AND v_event_count < 1 THEN RAISE EXCEPTION 'Refund outcome audit event missing'; END IF;

  SELECT * INTO v_invoice FROM public.invoices WHERE id='__G11_INVOICE_ID__';
  IF NOT FOUND THEN RAISE EXCEPTION 'G11 invoice fixture not found'; END IF;
  SELECT COALESCE(SUM(amount),0) INTO v_invoice_paid FROM public.payments WHERE invoice_id=v_invoice.id;
  IF v_invoice_paid <> '__G11_EXPECTED_INVOICE_PAID__'::numeric THEN RAISE EXCEPTION 'Invoice payment ledger differs from expected sandbox evidence'; END IF;
  IF v_invoice.amount_paid <> v_invoice_paid THEN RAISE EXCEPTION 'Invoice amount_paid does not reconcile to payment rows'; END IF;
  IF v_invoice.total_amount > 0 AND v_invoice_paid >= v_invoice.total_amount AND v_invoice.status <> 'paid' THEN RAISE EXCEPTION 'Fully collected invoice is not marked paid'; END IF;
  RAISE NOTICE 'G11 PASS order %, payment %, refund %, invoice %; payment total %, refund total %, invoice paid %',v_order.id,v_tx.id,v_refund.id,v_invoice.id,v_paid,v_refunded,v_invoice_paid;
END;
$g11$;
ROLLBACK;
