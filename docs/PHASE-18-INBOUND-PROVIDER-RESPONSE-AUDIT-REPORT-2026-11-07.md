# Phase 18 — Inbound Provider Response Integrity Audit

**Date:** 2026-11-07  
**Foundation:** `TOPLINE-FLOORING-PHASE-17-COMPLETE-2026-11-07.zip`  
**Scope:** Phase 18 within the existing Phases 18–20 Communications Provider + Response 360 initiative. This phase hardens inbound provider response handling; it does not replace the existing outbound worker or implement later Phase 19/20 work.

## Executive result

Phase 18 source hardening is complete. Inbound provider callbacks now have bounded request-body handling, and the database worker requires a stable provider message ID before accepting an inbound message. The existing provider/channel/message ID uniqueness boundary is used to make provider retries idempotent. A retry returns the existing inbound row without appending a second customer timeline entry or staff notification.

## Findings and repairs

### P18-01 — Inbound callback bodies were not consistently bounded

The SMS inbound and Brevo email inbound functions parsed request bodies without an explicit byte ceiling. The Brevo provider webhook and Meta WhatsApp webhook checked size only after `req.text()` had already consumed the body, which did not protect memory while reading chunked requests.

**Repair:** Added shared `readBoundedBody()` to `supabase/functions/_shared/security.ts`. It rejects oversized declared content lengths early and also counts streamed bytes, cancelling the reader as soon as the ceiling is exceeded. SMS inbound is limited to 64 KiB, email inbound to 256 KiB, and Brevo/Meta provider webhooks to 1 MiB. Callback authentication remains before body parsing.

### P18-02 — Inbound provider message identity was optional

The inbound worker accepted a null provider message ID. PostgreSQL unique constraints allow multiple NULL values, so a provider retry without an ID could create repeated inbound records, customer timeline entries and staff notifications.

**Repair:** Added migration `20261107200000_phase_18_inbound_provider_identity_hardening.sql`. The service-role-only worker now requires a non-empty provider message ID (maximum 255 characters), validates provider/channel/sender/message/payload bounds, and uses the existing `(provider, channel, provider_message_id)` unique key as the idempotency boundary. Duplicate callbacks resolve to the existing row and return before timeline/notification side effects.

### P18-03 — Phase-specific regression coverage was missing

The existing combined Phase 18–20 verifier checked broad communications wiring but did not independently assert inbound body ceilings and mandatory provider identity.

**Repair:** Added `scripts/verify-phase-18-inbound-provider-response.mjs`, registered it in `package.json` and `.github/workflows/ci.yml`, and updated historical Phase 7/8 continuity checks to use the current Phase 18 foundation reference.

## Changed files

- `supabase/migrations/20261107200000_phase_18_inbound_provider_identity_hardening.sql`
- `supabase/functions/_shared/security.ts`
- `supabase/functions/sms-inbound/index.ts`
- `supabase/functions/email-inbound/index.ts`
- `supabase/functions/communication-provider-webhook/index.ts`
- `supabase/functions/whatsapp-webhook/index.ts`
- `scripts/verify-phase-18-inbound-provider-response.mjs`
- `scripts/verify-phase-7-customer-self-service-documents.mjs`
- `scripts/verify-phase-8-communications-hardening.mjs`
- `package.json`
- `.github/workflows/ci.yml`
- `supabase/MIGRATION_MANIFEST.md`
- `docs/PHASES_18_20_COMMUNICATIONS_PROVIDER_RESPONSE_360.md`
- `docs/MASTER-WORKFLOW-REGISTER.json`

## Validation

- Phase 18 focused verifier: **16/16 passed**.
- Existing Phase 18–20 communications verifier: passed.
- Phase 8 communications regression: **23/23 passed**.
- Phase 7 customer self-service regression: passed after foundation continuity update.
- Migration integrity: passed; **162** uniquely timestamped active migrations.
- SQL runtime-safety static verification: passed.
- Full repository static suite: **165/165 passed, 0 failed**.
- Package/workflow register JSON parsing: passed.
- ZIP integrity: passed after packaging.

## External validation still required

- Replay the new migration on a disposable/local PostgreSQL/Supabase database and verify function compilation, role grants and RLS behavior.
- Replay duplicate callbacks for all three inbound providers and assert one inbound row, one customer timeline row and one staff notification.
- Test oversized fixed-length and chunked callback bodies against the deployed Edge Runtime.
- Validate real Africa's Talking, Brevo and Meta callback payload variants and provider message ID fields with sandbox/provider accounts.
- Run dependency-backed Deno checks, frontend lint/typecheck/build and browser UAT in provisioned CI/staging.

The local environment has no root `node_modules`, Deno CLI or Supabase CLI; those checks were not represented as passed. No production database was modified, no provider credentials were used, and no deployment, Git commit or push was performed.

## Foundation handoff

`TOPLINE-FLOORING-PHASE-18-COMPLETE-2026-11-07.zip` is the authoritative foundation for Phase 19. The combined Phase 18–20 communications architecture and Phase 19/20 source work are retained unchanged except for the shared bounded-body helper and inbound RPC contract required by this hardening.
