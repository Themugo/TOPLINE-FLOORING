# Phase 8 — Email, SMS and WhatsApp Delivery Report

**Date:** 2026-11-06  
**Foundation:** Phase 7 repaired `TOPLINE-FLOORING-main` tree  
**Status:** Source repair complete; provider, staging, browser and production certification remain outstanding.

## Audit scope

Traced customer notification preferences, event routing, templates, deduplication, durable outbox state, service-role worker claims, provider adapters, attempt logging, uncertain outcomes, retries, stale locks, channel gating, email/SMS/WhatsApp callbacks, inbound matching, customer communication history, admin operations, scheduler dispatch and release-gate reporting.

## Finding and repair

### P8-01 — Provider callback correlation was broader than the provider boundary

The final `record_provider_delivery_event_worker()` implementation looked up an outbox row using provider message/reference values but did not constrain the match by callback channel or provider. Although provider IDs are normally unique, the callback boundary should not rely on cross-provider uniqueness, especially where email, SMS and WhatsApp use separate providers and identifiers.

The Phase 8 migration now requires:

- exact channel matching;
- provider matching, with only the narrow callback-before-worker-completion race allowing a not-yet-written provider value;
- the existing monotonic delivery-state application and transition audit;
- unchanged email suppression and provider-event retention behaviour.

### P8-02 — SMS delivery reports did not use the callback destination

`record_sms_delivery_report()` accepted a phone number but matched only the provider reference. It now requires the normalized callback phone to agree with the outbox recipient when supplied, then applies the monotonic delivery state and retains provider payload, cost and failure details.

## Preserved controls

- Email uses Brevo transactional delivery and authenticated Brevo callbacks.
- SMS uses Africa’s Talking delivery and secret-authenticated delivery reports.
- WhatsApp uses Meta Cloud API delivery and HMAC-authenticated webhooks.
- Provider credentials remain Edge Function secrets only.
- Service-role-only worker RPCs, attempt audit, uncertain-send parking, retries, stale-lock recovery and channel gating remain intact.
- Customer preferences, dedupe keys, communication workflow events, portal history, admin permissions and inbound ambiguity handling remain unchanged.

## Validation results

- Phase 8 communications delivery verifier: **PASS**
- COMM-01–03 contract/state/matching verifier: **PASS**
- COMM-04–06 provider/templates/routing verifier: **23/23 PASS**
- COMM-07–09 customer/admin verifier: **PASS**
- COMM-10–12 conversations/scheduler/provider activation verifier: **PASS**
- COMM-13–17 certification/release verifier: **PASS**
- Provider response 360 verifier: **PASS**
- Production communications integration verifier: **PASS — 155 migrations**
- Automation/comms, communications journey and production automation structural checks: **PASS**
- Phase 4 SMS/customer-notification verifier: **PASS**
- Brevo integration verifier: **14/14 PASS**
- Migration integrity and SQL runtime safety: **PASS**
- Phase 3 cart/quotation/checkout regression: **16/16 PASS**
- Workflow register JSON parse: **PASS**

## Required staging / production gates

- Install locked dependencies and run TypeScript, build and full regression checks.
- Replay all 155 migrations on a disposable staging database.
- Configure and verify Brevo sender/domain/webhook, Africa’s Talking credentials/DLR, Meta WhatsApp Business number, app-secret signature, verification token and approved template policy.
- Run two-customer staging UAT for preference suppression, same-reference cross-channel isolation, provider acceptance, delivered/failed callbacks, duplicate webhook replay, stale worker recovery, retry exhaustion, uncertain provider response and inbound matching/ambiguity.
- Verify scheduler/Vault/pg_cron/pg_net dispatch and Edge Function logs.
- Complete desktop/mobile admin and customer portal checks, including communication history and preference changes.
- Production release gate must remain closed until provider readiness, staging security certification, two-customer UAT and the database release gate all pass.
- No deployment, commit, push, production data change or live provider call was performed.
