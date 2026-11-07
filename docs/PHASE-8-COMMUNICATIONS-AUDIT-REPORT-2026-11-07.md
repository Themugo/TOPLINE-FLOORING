# Phase 8 — Email, SMS & WhatsApp Communications Audit Report

**Date:** 2026-11-07  
**Authoritative foundation:** `TOPLINE-FLOORING-PHASE-07-COMPLETE-2026-11-07.zip`  
**Project root preserved:** `TOPLINE-FLOORING-main/`  
**Status:** Source-level callback/readiness hardening complete; provider and live-delivery certification pending.

## Scope

Phase 8 follows WF-08 in `docs/MASTER-WORKFLOW-REGISTER.json`: Email/SMS/WhatsApp communications. It retains the existing transactional outbox, Brevo email adapter, Africa's Talking SMS adapter, Meta WhatsApp adapter, customer communication history, staff Communication Center, conversations, scheduler, provider webhooks, consent-driven Brevo marketing synchronization and release-gate records. No second outbox or provider integration was introduced.

## Findings and repairs

### P8-01 — SMS delivery reports bypassed the shared delivery-state transition ledger

The Africa's Talking callback called `record_sms_delivery_report`, which directly updated `communication_outbox.delivery_status`. This bypassed the provider-event history and monotonic state-rank guard used by the other provider callbacks. An out-of-order SMS callback could therefore downgrade a newer delivery state.

**Repair:** The replacement `record_sms_delivery_report` delegates to `record_provider_delivery_event_worker` using the Africa's Talking provider identity and SMS channel. It maps the provider's `sent` state to the supported `submitted` state, keeps provider message reference matching, records the callback payload in the event ledger, and preserves provider cost. The RPC now explicitly requires `service_role`, has an empty `search_path`, rejects missing references and negative costs, and is revoked from public/anon/authenticated roles.

### P8-02 — SMS callback request body had no explicit size ceiling

The callback parsed multipart/form and JSON requests without a bounded body size.

**Repair:** The Edge Function authenticates before reading the body, rejects payloads above 65,536 bytes, validates JSON object shape, and parses URL-encoded, JSON and multipart form payloads with explicit malformed-payload responses.

### P8-03 — WhatsApp readiness omitted a required sender configuration key

The delivery adapter requires `WHATSAPP_PHONE_NUMBER_ID`, but the readiness endpoint did not include that key in its presence checks. It could therefore report a provider as configured even when sending was impossible.

**Repair:** The readiness contract now requires `WHATSAPP_PHONE_NUMBER_ID`, matching the sender adapter. Readiness remains a presence-only check and does not claim live provider connectivity or activation.

## Files changed or added

**Added:**
- `supabase/migrations/20261107140000_communications_delivery_callback_hardening.sql`
- `scripts/verify-phase-8-communications-hardening.mjs`
- `docs/PHASE-8-COMMUNICATIONS-AUDIT-REPORT-2026-11-07.md`

**Updated:**
- `supabase/functions/sms-delivery-report/index.ts`
- `supabase/functions/communication-provider-readiness/index.ts`
- `scripts/verify-phase-7-customer-self-service-documents.mjs` (keeps its migration-count and foundation assertions aligned with the current Phase 7 foundation)
- `package.json`
- `supabase/MIGRATION_MANIFEST.md`
- `docs/MASTER-WORKFLOW-REGISTER.json`

## Verification results

- Phase 8 targeted assertions: **23/23 passed**.
- Existing communications contracts COMM-01–03: passed.
- COMM-04–06 provider/template/routing sweep: **23/23 passed**.
- COMM-07–09 customer/admin communications UI contracts: passed.
- COMM-10–12 conversations/scheduler/provider activation sweep: passed.
- COMM-13–17 certification/release sweep: passed.
- Email registration/quotation/marketing-consent verifier: **20/20 passed**.
- Brevo integration verifier: **14/14 passed**.
- Delivery worker hardening verifier: passed.
- Production communications source integration verifier: passed.
- Phase 7 customer self-service regression: **21/21 passed**.
- Full aggregate static suite: **158/158 passed, 0 failed** (`node scripts/verify-all.mjs`).
- Active migration count: **155**, with unique timestamps.
- Node syntax check for the new verifier and JSON validation for `package.json` and the workflow register: passed.

## Not performed / release gates

- No dependency installation was performed. The available runtime reports Node `v22.16.0`, while the project pins Node 22.x; a clean install/build on the designated Node 22.22.2 toolchain remains a release gate.
- No full dependency-aware TypeScript check, ESLint run, Vite production build, Deno typecheck, or Edge Function deployment was performed.
- No staging PostgreSQL migration replay or remote Supabase migration push was performed.
- No live Africa's Talking callback replay verified provider-specific payload variations or real SMS delivery status ordering.
- No live Brevo mailbox delivery, Meta WhatsApp delivery, webhook signature replay, marketing-list opt-in/opt-out, or two-customer UAT was performed.
- Provider readiness only checks configured environment-secret presence; it does not prove credentials work or provider accounts are approved.
- No production data, provider configuration, customer consent, live message, deployment, Git commit or push was changed.

## Staging acceptance checklist

1. Replay migration `20261107140000_communications_delivery_callback_hardening.sql` on a disposable database, then reconcile the ordered migration plan against the dedicated staging project.
2. Confirm the replacement SMS callback RPC is executable only through the service-role Edge Function and denied to anon/authenticated callers.
3. Replay SMS statuses in order and out of order (submitted, failed, delivered, delayed failed) and confirm delivery state never regresses from delivered; confirm each provider event is retained.
4. Test missing/duplicate provider references, unknown statuses, negative cost, JSON, URL-encoded and multipart callbacks, malformed payloads, and bodies above 64 KiB.
5. Confirm WhatsApp readiness remains false when `WHATSAPP_PHONE_NUMBER_ID` is absent and reports configured only when all required secret names are present.
6. Exercise real provider sandbox/test delivery and callback signatures for Brevo, Africa's Talking and Meta WhatsApp; verify provider IDs, outbox rows, delivery attempts, transition history and retry/uncertain outcomes.
7. Verify marketing opt-in/opt-out remains explicit, separate from transactional mail, and does not globally blacklist transactional messages.
8. Complete customer/staff role and two-customer communication-history UAT before marking the communications release gate certified.

**Phase 8 conclusion:** The identified source-level callback and readiness gaps are closed and the aggregate static suite passes. This is not live provider, staging, browser, or production certification. Phase 8 ZIP is the next authoritative source-level foundation for Phase 9; do not deploy automatically.
