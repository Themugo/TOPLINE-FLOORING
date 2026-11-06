# TOPLINE Communications — COMM-10 through COMM-12
## Implementation report — 2026-10-02

Baseline: `TOPLINE-COMMUNICATIONS-COMM-07-09-HARDENED-2026-10-02.zip`

## COMM-10 — Inbound conversation handling

Implemented:
- canonical `communication_conversations` control-plane table
- customer/channel/provider conversation correlation
- provider conversation ID correlation when supplied
- bounded 72-hour customer/channel grouping when a provider has no conversation ID
- inbound thread linkage through `communication_inbound.conversation_thread_id`
- outbound reply linkage through `communication_outbox.conversation_thread_id`
- server-bound staff reply RPC: `queue_communication_conversation_reply`
- staff conversation read model: `get_communication_conversations_360`
- staff conversation status/read controls: `update_communication_conversation_360`
- Communication Center conversation/reply controls
- strict unmatched/ambiguous inbound review path retained
- duplicate webhook idempotency corrected so duplicate provider callbacks do not increment unread counters or emit duplicate customer/staff messages

## COMM-11 — Scheduler/worker certification

Implemented:
- corrected the automation-job database allow-list so `deliver_communications` can actually acquire its scheduler lock
- retained service-role-only scheduler/worker boundaries
- retained durable run ledger and lock expiry handling
- added `get_communications_worker_certification_360` for staff operational certification
- certification checks stale locks, failed/timed-out communication jobs, stale queued messages and unknown delivery states
- existing delivery worker remains protected by `TOPLINE_WORKER_SECRET`, durable claim, retry, idempotency and uncertain-outcome handling

## COMM-12 — Provider production activation readiness

Implemented:
- `communication_provider_activation` state registry for Brevo, Africa's Talking and Meta WhatsApp
- provider readiness control-plane RPC: `get_communication_provider_activation_360`
- new protected Edge readiness endpoint: `communication-provider-readiness`
- readiness endpoint checks presence of required environment secrets only; it never returns secret values
- provider credentials remain Edge environment-only
- existing Brevo/SMS/WhatsApp webhook authentication remains enforced
- activation registry defaults to `disabled` until real provider UAT and operator activation

## Verification

Passed:
- COMM-10–12 static sweep
- COMM-07–09 regression sweep
- COMM-04–06 regression sweep
- migration integrity
- database dependency verification
- application security/trust-boundary verification
- customer self-service RPC trust-boundary verification
- ecommerce stability verification
- `git diff --check`

Latest static dependency snapshot:
- 106 migrations
- 158 tables
- 233 functions
- 282 FK references

## Important release status

This package does **not** claim live production provider activation.

The remaining external gates are:
1. deploy migrations/functions to the real Supabase project
2. confirm `deliver_communications` scheduler execution in the deployed environment
3. run provider readiness against the real Edge environment
4. configure/verify Brevo, Africa's Talking and Meta WhatsApp credentials
5. run real provider delivery and webhook UAT
6. run two-customer inbound/outbound isolation UAT
7. run frontend dependency-backed typecheck/build/browser tests in the real project environment

No commerce, customer portal, finance, projects, inventory or existing security foundation was intentionally removed or redesigned.
