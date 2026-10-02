-- Payment customer UX + M-Pesa input hardening 360.
-- Additive only; no provider secrets are stored here.

COMMENT ON FUNCTION public.get_customer_payment_methods(text) IS
  'Public payment discovery is limited to enabled customer-visible methods and filtered safe public configuration.';

-- Keep payment attempts queryable for finance operations without exposing them to customers directly.
CREATE INDEX IF NOT EXISTS payment_attempts_status_created_idx
  ON public.payment_attempts(status, created_at DESC);

-- Provider transaction IDs must not be shared across two payment transactions.
CREATE UNIQUE INDEX IF NOT EXISTS payment_transactions_provider_transaction_uidx
  ON public.payment_transactions(provider, provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL AND btrim(provider_transaction_id) <> '';
