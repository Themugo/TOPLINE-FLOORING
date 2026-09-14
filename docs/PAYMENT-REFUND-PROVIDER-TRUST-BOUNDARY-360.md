# Payment, Refund & Provider Webhook Trust Boundary 360

Status: **Hardened and applied to the dedicated Supabase project.**

Scope:
- provider webhook execution boundary
- provider/event replay identity and payload hashing
- payment transaction idempotency and provider identity
- order payment amount integrity
- payment/refund ledger invariants
- refund completion authorization and provider identity
- finance reconciliation RPC boundaries
- SECURITY DEFINER search-path hardening
- database-level payment/refund input constraints

Live migration: `111_payment_refund_provider_trust_boundary_360`

Key controls:
- Provider payment application remains service-role-only.
- Successful provider events require a provider transaction ID.
- Provider transaction replay must match order, amount, currency and successful transaction state.
- Provider payload replays are rejected when the payload hash differs.
- Provider payment currency is constrained to KES.
- Provider payment cannot exceed the outstanding order balance.
- Refunds cannot exceed successful payments.
- Successful refund completion requires provider + provider refund ID.
- Payment/refund/provider identifiers are length-bounded at the database boundary.
- Finance mutation/reconciliation RPCs use fixed `search_path = ''`.
- Existing unique indexes continue to enforce provider transaction, provider event, provider refund and idempotency uniqueness.

External gates remaining: real provider sandbox/live webhook certification, real payment/refund UAT, and production secret/configuration verification.
