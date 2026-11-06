# TOPLINE Communications COMM-04–06 Implementation Report

Date: 2026-10-02
Baseline: TOPLINE-COMMUNICATIONS-COMM-01-03-HARDENED-2026-10-02

## COMM-04 — Provider certification contract

Implemented a non-secret provider/channel contract in `communication_provider_contracts` for:
- Brevo email
- Africa's Talking SMS
- Meta WhatsApp

The contract records required environment secret names, callback function, callback secret key and operational notes. Provider credentials remain outside the repository.

Existing provider boundaries were rechecked:
- Brevo callback uses constant-time secret validation.
- Africa's Talking delivery callback uses constant-time secret validation.
- Meta WhatsApp uses verification-token and HMAC validation.
- Delivery worker keeps provider credentials server-side.

This is a static/provider-contract certification, not live provider UAT. Real inbox/handset/WhatsApp delivery still requires configured production secrets and external provider callbacks.

## COMM-05 — Transactional message quality and governance

The existing `notification_rules` table remains the canonical template system; no competing template architecture was introduced.

Added:
- template version
- declared template variables
- update timestamp

Upgraded customer-facing lifecycle messages for quotation, order, project, invoice, payment, site visit, delivery, installation and service-request events.

Templates remain transactional and use the existing durable outbox and customer preferences.

## COMM-06 — Complete event routing

Added durable customer notification routing for:
- delivery status
- installation status
- service/warranty request status

Existing wired events remain intact:
- quotation status
- order status
- project status
- invoice status
- payment received
- site visit scheduled

Also hardened quotation-to-customer resolution: an email match must resolve to exactly one customer. Ambiguous matches are not notified automatically.

The event catalogue is updated so the actually wired events are explicitly marked `wired`.

## Verification

Passed:
- COMM-01–03 static verification
- Operation 7 Communications Journey
- Production Communications Integration 360 static verification
- Delivery worker hardening
- Migration integrity
- Database dependency verification
- COMM-04–06 static sweep: 23/23

Current source snapshot:
- 104 migrations
- 156 tables
- 225 functions
- 278 FK references

## Not claimed

This package does not claim:
- live Supabase migration deployment;
- real Brevo inbox delivery;
- real Africa's Talking handset delivery/callback;
- real Meta WhatsApp delivery/callback;
- browser E2E;
- fresh TypeScript/Vite build certification.

Those remain environment/provider UAT gates.
