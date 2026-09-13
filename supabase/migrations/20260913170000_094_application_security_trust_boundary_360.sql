-- Application Security & Trust Boundary 360
-- Additive / least-privilege hardening. No business data mutation.

REVOKE EXECUTE ON FUNCTION public.expire_inventory_reservations() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_expired_inventory_reservations() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalculate_project_costs(uuid) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.emit_customer_journey_event() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.emit_payment_notification() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.emit_site_visit_notification() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_customer_portal_user() FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.reconcile_order_payment_totals(p_order_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE
  v_user uuid;
  v_count integer := 0;
  r record;
  v_paid numeric(12,2);
  v_refunded numeric(12,2);
BEGIN
  v_user := private.require_staff_permission('finance','update');
  FOR r IN
    SELECT id,total_amount,payment_status
    FROM public.orders
    WHERE (p_order_id IS NULL OR id=p_order_id)
    FOR UPDATE
  LOOP
    SELECT COALESCE(SUM(amount),0) INTO v_paid
      FROM public.payment_transactions
      WHERE order_id=r.id AND status='successful';
    SELECT COALESCE(SUM(amount),0) INTO v_refunded
      FROM public.payment_refunds
      WHERE order_id=r.id AND status='successful';
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
$function$;

REVOKE EXECUTE ON FUNCTION public.create_customer_order(text,text,text,jsonb,uuid,uuid,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_secure_customer_order(text,text,text,jsonb,text,uuid,uuid,text,text,text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_customer_portal_data() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_customer_portal_360() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_customer_journey() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_customer_maintenance_plans_360() FROM anon;

REVOKE EXECUTE ON FUNCTION public.claim_communication_outbox_worker(integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_communication_delivery_worker(uuid,text,text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_communication_delivery_worker(uuid,text,text,text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fail_communication_delivery_worker(uuid,text,boolean) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_inbound_communication_worker(text,text,text,text,text,text,text,text,text,jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_provider_delivery_event_worker(text,text,text,text,text,text,jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_sms_delivery_report(text,text,text,text,jsonb,numeric) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.queue_customer_notification_for_event(text,uuid,uuid,text) FROM anon, authenticated;

ALTER FUNCTION public.reconcile_order_payment_totals(uuid) SET search_path = public, private;
