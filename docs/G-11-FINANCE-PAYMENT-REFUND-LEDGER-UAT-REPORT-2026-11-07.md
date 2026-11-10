# G-11 — Finance Payment, Refund and Ledger Reconciliation UAT Report

**Status: OPEN — source contracts pass; provider sandbox and live staging evidence not yet supplied.**

## Foundation and scope

Foundation: `TOPLINE-FLOORING-G-10-AUTHENTICATION-2026-11-07.zip`. The existing `TOPLINE-FLOORING-main/` root and finance/payment architecture are retained. No new migration or schema mutation was introduced for this gap.

Coverage audited: payment initiation atomicity and idempotency; provider webhook signature/timestamp/payload boundaries; provider event replay identity; successful payment identity and KES currency; refund request allocation and idempotency; refund completion provider identity and locking; finance outcome audit events; invoice collection lifecycle; order/invoice ledger reconciliation and over-refund detection.

## Existing architecture findings

- `payment_transactions` is the canonical order payment transaction ledger.
- `payment_refunds` records refund requests and provider-confirmed outcomes linked to a payment transaction.
- `payment_provider_events` stores provider event identity, payload hash and processing state.
- `payments` is the invoice collection ledger; invoice `amount_paid` and lifecycle status are derived from payment rows.
- `finance_control_events` records refund outcome and reconciliation events.
- `create_payment_attempt_atomic_360` serializes payment-attempt creation under the order/invoice row lock and prevents duplicate in-flight online charges.
- Provider event processing is service-role-only, validates provider identity, currency, payload and replay identity, and updates order payment state from ledger totals.
- Refund completion locks order before refund, enforces provider refund identity and refuses refund totals greater than successful payment totals.
- Finance reconciliation derives order state from successful payment and refund rows, and invoice state/amount from invoice payment rows.

## Changes delivered

1. Added `scripts/verify-g11-finance-uat.mjs` with 29 source-contract assertions.
2. Added `scripts/run-g11-finance-uat.mjs`, a fail-closed staging-only, read-only ledger evidence runner. It validates already-completed provider sandbox fixtures; it does not create charges/refunds or mutate records.
3. Added `supabase/tests/g11_finance_ledger_live.sql` to verify payment identity/amount/currency, refund linkage/status/provider identity, refund audit event, order aggregate limits and invoice collection reconciliation inside a read-only transaction rolled back at completion.
4. Added package commands `verify:g11-finance-uat` and `uat:g11-finance`.
5. Added CI static verifier step and `docs/G-11-FINANCE-PAYMENT-REFUND-LEDGER-UAT-RUNBOOK.md`.

## Verification performed in this workspace

| Check | Result |
|---|---:|
| G-11 source verifier | PASS — 29/29 |
| Phase 6 finance refund/reconciliation | PASS — 20 assertions |
| Payment webhook/reconciliation contract | PASS |
| Payment/refund provider trust boundary | PASS — 14/14 |
| Payment initiation/reconciliation contract | PASS — 163 migrations, unique timestamps |
| Phase 10 finance billing hardening | PASS — 25/25 |
| G-11 runner/verifier syntax | PASS |
| Staging-only fail-closed gate | PASS — blocked with exit code 2 when staging opt-in absent |

## Important accounting limitation

A repository search of the inspected migrations, functions and application source found no dedicated `general_ledger`, `journal_entries`, `payment_fees`, `provider_fees` or `settlement_fees` schema. Therefore, the current evidence supports payment/refund/invoice ledger reconciliation, but **does not certify double-entry accounting, provider-fee accounting, net settlement or bank payout reconciliation**. Those must remain explicitly NOT VERIFIED until a canonical fee/journal/payout source is identified or implemented and tested. No fee values should be inferred from payment metadata.

## Not executed / limitations

No provider sandbox credentials, completed sandbox payment/refund identifiers, staging database URL or staging project link were available. No real provider payment, refund, reversal/chargeback, webhook delivery or payout was initiated. The live SQL fixture runner was not executed. No live provider settlement statement or bank settlement evidence was available. No real fee or journal ledger is evidenced by the inspected source.

## Safety and non-actions

- No production project, provider or bank account was contacted.
- No charge, refund, reversal, payout or migration was executed.
- The live SQL check is read-only and rolls back.
- No production finance data, provider credentials, secret values or payment card data were modified or stored.
- No commit, push or deployment was performed.

## Closure criteria

G-11 remains OPEN until provider sandbox success/failure and duplicate/replay cases, partial/full payment and refund cases, invoice collection, provider reversal/chargeback, reconciliation and provider settlement/payout are evidenced and signed off by Finance. Fee and net settlement treatment requires a separately evidenced canonical accounting source. The read-only fixture SQL and source verifiers alone do not constitute full UAT.
