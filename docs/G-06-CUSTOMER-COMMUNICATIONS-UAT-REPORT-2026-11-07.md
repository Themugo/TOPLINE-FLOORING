# G-06 — Customer communications UAT remediation report

**Date:** 2026-11-07  
**Foundation:** `TOPLINE-FLOORING-G-05-PAYMENT-PROVIDER-UAT-2026-11-07.zip`  
**Project root:** `TOPLINE-FLOORING-main/`  
**Status:** **OPEN — live provider delivery evidence required**

## Executive result

The existing source already implements the core transactional order-confirmation pipeline. This G-06 pass adds a dedicated CI-enforced source contract and a controlled staging UAT runbook that defines the real delivery proof. No real customer email was sent from this execution environment, and no real Brevo delivery callback was received. G-06 is therefore not represented as operationally certified.

## Source review and confirmed implementation

- Phase 19 migration routes `order.status` events to the durable `communication_outbox` within the same database transaction.
- Order confirmation email is transactional and remains eligible when optional marketing email preference is disabled, subject to the canonical event rule and a valid customer email.
- Dedupe keys and unchanged-status handling prevent duplicate business notifications.
- The `deliver-communications` worker sends through Brevo's transactional API, renders the transactional email template, records attempts and provider message IDs, and uses an `uncertain` state for ambiguous sends to avoid blind duplicate sends.
- The provider webhook requires a constant-time shared-secret check, rejects malformed/oversized payloads, and records delivery events through a service-role-only database RPC.
- Provider events reconcile against the outbox using provider message identity.
- The staff-only `get_order_communication_delivery_360(uuid)` RPC and Admin Orders panel expose per-order delivery status and provider evidence without exposing credentials or raw provider payloads.

## Changes made

1. Added `scripts/verify-g06-customer-communications.mjs` with 23 source-contract assertions.
2. Registered `npm run verify:g06-customer-communications` in `package.json`.
3. Added the G-06 verifier as an independent GitHub Actions step.
4. Added `docs/G-06-CUSTOMER-COMMUNICATIONS-UAT-RUNBOOK.md` with isolated staging setup, readiness check, real order flow, provider webhook configuration, negative/replay tests, evidence requirements and closure rules.
5. Added `docs/audit-evidence/G-06-STATIC-VERIFICATION-2026-11-07.log`.

No migration or application runtime behavior was changed in this pass; existing delivery implementation was audited and protected by additional CI checks.

## Verification performed

| Check | Result |
|---|---:|
| G-06 dedicated source verifier | **23/23 passed** |
| Phase 19 order confirmation reliability | **15/15 passed** |
| Brevo integration contract | **14/14 passed** |
| COMM-04–06 static sweep | **23/23 passed** |
| Delivery worker hardening | Passed |
| Phase 18–20 provider response | Passed |
| Production communications integration | Passed (163 migration inventory) |
| Operation 7 customer journey | Passed (163 migration inventory) |
| COMM-01–03, COMM-07–09, COMM-10–12, COMM-13–17 | Passed |

The complete command summary is retained in `docs/audit-evidence/G-06-STATIC-VERIFICATION-2026-11-07.log`.

## Not executed / remaining live gates

- No authenticated staging Supabase project was available.
- No Brevo API key or sender configuration was accessed.
- No staging order was submitted.
- No transactional email was sent to a real controlled mailbox.
- No genuine Brevo delivery/bounce webhook was received.
- No outbox record was observed changing to delivered in a live database.

## G-06 closure criteria

G-06 closes only after a normal isolated-staging storefront order creates the transactional email outbox row; the deployed worker sends it through Brevo and records the provider message ID; the controlled mailbox actually receives the message; Brevo emits a genuine delivery webhook that reconciles the same outbox row to `delivered`; and the staff order detail panel shows the matching provider ID and delivery state. Provider acceptance alone, an admin test email, a synthetic callback, or static verification is insufficient.

## Safety record

No production database or provider was contacted. No payment, email or SMS was sent. No production secrets were read. No Git commit, push, or deployment was performed.
