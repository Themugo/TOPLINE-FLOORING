-- reconcile_order_payment_totals (the staff "Reconcile payments" button) marked any order with a partial refund as
-- 'partial', even when the order was fully paid. complete_order_refund keeps such an order 'paid', so the two disagreed
-- and the customer portal (which treats 'partial' as unpaid) showed a phantom outstanding balance after a goodwill refund.
-- This aligns the reconcile rules with complete_order_refund: fully refunded -> refunded; fully paid -> paid
-- (even after a partial refund); some payment -> partial; none -> pending.

CREATE OR REPLACE FUNCTION public.reconcile_order_payment_totals(p_order_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE
  v_user uuid;
  v_count integer := 0;
  r record;
  v_paid numeric(12,2);
  v_refunded numeric(12,2);
  v_status text;
BEGIN
  v_user := private.require_staff_permission('finance', 'update');
  FOR r IN
    SELECT id, total_amount, payment_status
    FROM public.orders
    WHERE (p_order_id IS NULL OR id = p_order_id)
    FOR UPDATE
  LOOP
    SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM public.payment_transactions WHERE order_id = r.id AND status = 'successful';
    SELECT COALESCE(SUM(amount), 0) INTO v_refunded FROM public.payment_refunds WHERE order_id = r.id AND status = 'successful';
    v_status := CASE
      WHEN v_paid > 0 AND v_refunded >= v_paid THEN 'refunded'
      WHEN v_paid >= r.total_amount AND r.total_amount > 0 THEN 'paid'
      WHEN v_paid > 0 THEN 'partial'
      ELSE 'pending'
    END;
    IF v_status IS DISTINCT FROM r.payment_status THEN
      UPDATE public.orders SET payment_status = v_status, updated_at = now() WHERE id = r.id;
    END IF;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $function$;
REVOKE ALL ON FUNCTION public.reconcile_order_payment_totals(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reconcile_order_payment_totals(uuid) TO authenticated;
