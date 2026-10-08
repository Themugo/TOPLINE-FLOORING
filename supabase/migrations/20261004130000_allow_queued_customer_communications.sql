-- queue_customer_message() logs every staff-initiated message to customer_communications with
-- status 'queued', but the table's CHECK constraint only allowed draft/logged/sent/failed. Every call
-- therefore failed with "violates check constraint customer_communications_status_check", so no staff
-- member could send a message to a customer from the admin communications screen.
--
-- Widening the constraint is additive: existing rows stay valid. Delivery state remains authoritative
-- in communication_outbox / communication_delivery_attempts; this table is the customer-facing history.
ALTER TABLE public.customer_communications
  DROP CONSTRAINT IF EXISTS customer_communications_status_check;

ALTER TABLE public.customer_communications
  ADD CONSTRAINT customer_communications_status_check
  CHECK (status = ANY (ARRAY['draft'::text, 'queued'::text, 'logged'::text, 'sent'::text, 'failed'::text]));

-- complete_communication_delivery_worker existed with two signatures: (uuid, text, text) and the
-- superset (uuid, text, text, text) where the last argument has a default. A caller omitting
-- p_provider_message_id matches both and PostgreSQL / PostgREST refuse to choose ("function is not
-- unique", PGRST203). The 4-argument version covers every caller, so the stale overload is removed.
DROP FUNCTION IF EXISTS public.complete_communication_delivery_worker(uuid, text, text);
