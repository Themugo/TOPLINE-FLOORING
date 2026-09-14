-- DB-6 + DB-7 + DB-8: payment, communication and storage control-plane hardening.
-- Keep application-facing RPCs as the mutation boundary; authenticated clients should not
-- directly mutate provider events, outbox state, inbound messages or payment ledgers.

REVOKE ALL PRIVILEGES ON TABLE public.payment_provider_events FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.communication_delivery_attempts FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.communication_provider_events FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.communication_inbound FROM anon, authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.communication_outbox FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.communication_history FROM authenticated;

-- Payment ledger remains read-only to authenticated clients; writes stay behind RPC/service boundaries.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.payment_transactions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.payment_refunds FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.payments FROM authenticated;
GRANT SELECT ON TABLE public.payment_transactions, public.payment_refunds, public.payments TO authenticated;

-- Storage buckets: explicit production ceilings for customer-facing uploads.
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif']
WHERE id = 'images';

UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf','image/jpeg','image/png','image/webp','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
WHERE id = 'private-documents';

CREATE INDEX IF NOT EXISTS payment_provider_events_transaction_status_idx
  ON public.payment_provider_events (payment_transaction_id, status, received_at DESC);

CREATE INDEX IF NOT EXISTS payment_refunds_transaction_status_idx
  ON public.payment_refunds (payment_transaction_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS communication_provider_events_message_idx
  ON public.communication_provider_events (provider, channel, provider_message_id);

CREATE INDEX IF NOT EXISTS communication_outbox_dedupe_key_idx
  ON public.communication_outbox (dedupe_key)
  WHERE dedupe_key IS NOT NULL;
