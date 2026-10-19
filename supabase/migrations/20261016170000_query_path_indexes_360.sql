-- TOPLINE 2026-10-16 audit, part 4: indexes for hot query paths.
--
-- Measured on a scratch database loaded with 200,000 outbox rows and 60,000 marketing-queue rows:
--  * the hourly staff-alert cap that runs on every quotation scanned the status index (23 ms and growing with the table);
--  * the marketing-queue lookups by email (consent ordering, suppression) were full table scans;
--  * brevo_marketing_sync_queue.customer_id / auth_user_id and communication_incident_events.conversation_id had no
--    supporting index, so deleting a customer or auth user (for example a data-subject request) scanned those tables.
-- Every statement is idempotent and only adds indexes.

CREATE INDEX IF NOT EXISTS communication_outbox_created_idx
  ON public.communication_outbox (created_at DESC);

CREATE INDEX IF NOT EXISTS brevo_marketing_sync_queue_email_idx
  ON public.brevo_marketing_sync_queue (email, created_at DESC);

CREATE INDEX IF NOT EXISTS brevo_marketing_sync_queue_customer_idx
  ON public.brevo_marketing_sync_queue (customer_id) WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS brevo_marketing_sync_queue_auth_user_idx
  ON public.brevo_marketing_sync_queue (auth_user_id) WHERE auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS communication_incident_events_conversation_idx
  ON public.communication_incident_events (conversation_id) WHERE conversation_id IS NOT NULL;
