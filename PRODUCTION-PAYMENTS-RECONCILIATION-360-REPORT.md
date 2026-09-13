# Topline — Production Payments + Reconciliation + Provider Webhooks 360

## Scope
Harden the payment boundary for provider callbacks without exposing payment-state mutation to browsers or anonymous clients.

## Implemented
- Migration 099 adds a durable `payment_provider_events` ledger with unique provider/event identity and SHA-256 payload binding.
- Provider webhook application is service-role-only and idempotent.
- Same event ID with a different payload hash is rejected.
- Successful provider payments are reconciled into `payment_transactions`, order payment state, and reserved-stock consumption when the order becomes fully paid.
- Failed provider events remain auditable and retryable when the same signed payload is delivered again.
- Finance/service-worker reconciliation reports failed/unprocessed provider events and order payment mismatches.
- `payment-webhook` verifies HMAC-SHA256 signatures, supports timestamp-bound signatures, enforces a five-minute clock-skew window, limits request bodies to 512 KiB, and normalizes common provider field names.
- Secrets remain Edge Function environment variables; no service-role secret is exposed to browser code.

## Provider configuration
Use either `PAYMENT_<PROVIDER>_WEBHOOK_SECRET` or the fallback `PAYMENT_WEBHOOK_SECRET`. The provider-specific secret is preferred. Configure the real provider adapter/payload mapping before enabling production traffic.

## Verification
The static verifier checks migration 099, the service-role boundary, replay/hash protection, row locking, stock finalization, reconciliation, signature validation, timestamp protection, body-size limits, and server-side service-role usage.
