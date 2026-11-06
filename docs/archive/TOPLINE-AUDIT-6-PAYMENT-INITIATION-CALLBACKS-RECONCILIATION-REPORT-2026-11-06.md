# Phase 6 — Payment Initiation, Callbacks & Reconciliation Report

**Date:** 2026-11-06  
**Foundation:** Phase 5 repaired `TOPLINE-FLOORING-main` tree  
**Status:** Source repair complete; provider, staging and production certification remain outstanding.

## Repairs

### P6-01 — Callback reconciliation had regressed recovery protections

The latest callback definition no longer ignored stale failure/cancel events after a payment had become successful, and it no longer recovered verified late-success payments into stock consumption or a visible fulfilment exception.

### P6-02 — Unknown provider transaction could fall back to another pending attempt

When a callback supplied an unknown provider transaction ID, the RPC could select the latest pending transaction for the target. That could associate a provider event with the wrong attempt.

### Repair

Added `supabase/migrations/20261106170000_audit6_payment_callbacks_reconciliation.sql`. The service-role reconciliation boundary now:

- requires exactly one order/invoice target and binds it to the selected transaction;
- uses target fallback only when the provider transaction ID is absent;
- ignores stale failure events for successful, reversed or refunded transactions;
- treats successful callbacks for an already-successful transaction as idempotent;
- restores late-success inventory consumption and records a fulfilment review event when reservations or stock are no longer available;
- preserves amount, currency, payload-hash, event-id and provider-boundary checks.

## Reviewed paths

Payment initiation, gateway/release gating, customer ownership checks, outstanding-balance calculation, retry tokens, unknown-dispatch handling, M-Pesa callback secrets, card webhook signatures, payment-attempt recovery, provider event idempotency, scheduled reconciliation, order payment transitions, invoice payment transitions, and payment-to-inventory conversion.

## Outstanding gates

No provider sandbox/live transaction, M-Pesa callback, card signature replay, network timeout recovery, staging PostgreSQL replay, concurrent initiation race, dependency install, TypeScript/Vite/Vitest run, browser/mobile journey, or production certification was performed. No deployment, commit, push, database change, or production data action was performed.
