-- A customer whose refund was paid out heard nothing: delivery, installation, payment and order events notified them but
-- refunds did not. This adds a customer notification when a refund moves to 'successful' (money has been sent), using the
-- existing rule/queue machinery. Replays are safe: queue_customer_notification_for_event de-duplicates on an event key
-- (refund.status:<refund id>:processed), respects the customer's channel preferences and only queues SMS/WhatsApp when
-- those channels are enabled. Failed or pending refunds are internal and deliberately not announced.

INSERT INTO public.notification_rules(event_type, email_enabled, sms_enabled, whatsapp_enabled, subject_template, message_template, template_version, template_variables, enabled)
VALUES ('refund.status', true, true, false,
  'Your Topline refund has been {{status}}',
  'Hello {{customer_name}}, your Topline refund has been {{status}}. It can take a few working days to show in your account. Please contact us if you have any questions.',
  1, '["status","customer_name"]'::jsonb, true)
ON CONFLICT (event_type) DO NOTHING;

CREATE OR REPLACE FUNCTION public.emit_refund_paid_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $function$
DECLARE v_customer uuid;
BEGIN
  IF NEW.status = 'successful' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) AND NEW.order_id IS NOT NULL THEN
    SELECT customer_id INTO v_customer FROM public.orders WHERE id = NEW.order_id;
    PERFORM public.queue_customer_notification_for_event('refund.status', NEW.id, v_customer, 'processed');
  END IF;
  RETURN NEW;
END; $function$;
REVOKE ALL ON FUNCTION public.emit_refund_paid_notification() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS refund_paid_customer_notification ON public.payment_refunds;
CREATE TRIGGER refund_paid_customer_notification
  AFTER INSERT OR UPDATE OF status ON public.payment_refunds
  FOR EACH ROW EXECUTE FUNCTION public.emit_refund_paid_notification();
