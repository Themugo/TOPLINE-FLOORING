-- Customers received five emails per delivery, two of them for internal steps ("Your Topline delivery is pending",
-- "... is processing"), and the others quoted raw database values ("... is now in_transit"). Found by running the real
-- communications worker against a migrated PostgreSQL and reading the messages it would send.
--
-- Now: only meaningful moments notify the customer, in plain language.
--   dispatched -> "out for delivery", in_transit -> "on its way to you", delivered -> "delivered", failed -> "delayed".
-- pending / processing / cancelled are internal and send nothing. The dedupe key still includes the status, so each
-- moment is sent at most once per delivery.

CREATE OR REPLACE FUNCTION public.emit_delivery_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $function$
DECLARE cid uuid; v_label text;
BEGIN
  v_label := CASE NEW.status
    WHEN 'dispatched' THEN 'out for delivery'
    WHEN 'in_transit' THEN 'on its way to you'
    WHEN 'delivered'  THEN 'delivered'
    WHEN 'failed'     THEN 'delayed'
    ELSE NULL END;
  IF v_label IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT customer_id INTO cid FROM public.orders WHERE id = NEW.order_id;
    PERFORM public.queue_customer_notification_for_event('delivery.status', NEW.id, cid, v_label);
  END IF;
  RETURN NEW;
END; $function$;

-- Reword the rule only while it still carries the original wording, so an admin's own edits are never overwritten.
UPDATE public.notification_rules
SET subject_template = 'Your Topline delivery update: {{status}}',
    message_template = 'Hello {{customer_name}}, update on your Topline delivery: it is {{status}}. We will provide the latest delivery information through your customer account.',
    template_version = template_version + 1
WHERE event_type = 'delivery.status'
  AND subject_template = 'Your Topline delivery is {{status}}'
  AND message_template = 'Hello {{customer_name}}, your Topline delivery is now {{status}}. We will provide the latest delivery information through your customer account.';
