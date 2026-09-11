-- Phase 55: reservation expiry and operational reconciliation

CREATE OR REPLACE FUNCTION public.expire_inventory_reservations()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private
AS $$
DECLARE v_count integer;
BEGIN
  -- Intentionally no stock decrement: stock is only consumed after successful payment.
  UPDATE public.inventory_reservations
     SET status='expired', released_at=now(), updated_at=now()
   WHERE status='reserved' AND expires_at IS NOT NULL AND expires_at <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.expire_inventory_reservations() FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.reconcile_order_payment_totals(p_order_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private
AS $$
DECLARE v_user uuid; v_count integer := 0; r record; v_paid numeric(12,2); v_refunded numeric(12,2);
BEGIN
  v_user := private.require_staff_permission('finance','read');
  FOR r IN SELECT id,total_amount,payment_status FROM public.orders WHERE (p_order_id IS NULL OR id=p_order_id) LOOP
    SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.payment_transactions WHERE order_id=r.id AND status='successful';
    SELECT COALESCE(SUM(amount),0) INTO v_refunded FROM public.payment_refunds WHERE order_id=r.id AND status='successful';
    IF v_refunded > 0 AND v_refunded >= v_paid THEN
      UPDATE public.orders SET payment_status='refunded',updated_at=now() WHERE id=r.id;
    ELSIF v_refunded > 0 THEN
      UPDATE public.orders SET payment_status='partial',updated_at=now() WHERE id=r.id;
    ELSIF v_paid >= r.total_amount THEN
      UPDATE public.orders SET payment_status='paid',updated_at=now() WHERE id=r.id;
    ELSIF v_paid > 0 THEN
      UPDATE public.orders SET payment_status='partial',updated_at=now() WHERE id=r.id;
    ELSE
      UPDATE public.orders SET payment_status='pending',updated_at=now() WHERE id=r.id;
    END IF;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reconcile_order_payment_totals(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.reconcile_order_payment_totals(uuid) TO authenticated;
