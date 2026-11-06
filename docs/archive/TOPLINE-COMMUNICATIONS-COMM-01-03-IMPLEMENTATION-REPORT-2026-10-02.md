# TOPLINE FLOORING & ROOFING — Communications COMM-01 to COMM-03

Date: 2026-10-02
Foundation: `TOPLINE-CUSTOMER-EXPERIENCE-PREMIUM-2026-10-02.zip`

## Scope completed

This package implements the first communications hardening set before any Communication Center visual work:

- COMM-01 — canonical communications event catalogue
- COMM-02 — monotonic delivery-state contract and transition audit
- COMM-03 — strict inbound customer identity matching

No existing commerce, customer portal, finance, project, inventory, authentication or security feature was intentionally removed or replaced.

## COMM-01 — Event catalogue

Added `public.communication_event_catalog` as the canonical inventory of customer-facing communication events.

The catalogue explicitly records:

- event type
- entity type
- business category
- description
- transactional classification
- implementation status
- trigger source
- enabled state

Current existing wired events are explicitly marked, including:

- `quotation.status`
- `order.status`
- `project.status`
- `invoice.status`
- `payment.received`
- `site_visit.scheduled`

Additional quotation, order, delivery, project, installation, billing, service and warranty events are catalogued as `catalog_only` until their actual business triggers are implemented in later communications phases. This prevents silent gaps from being mistaken for completed automation.

## COMM-02 — Delivery state integrity

Added `communication_delivery_state_transitions` for an auditable state-change trail.

Added a server-only monotonic state ranking:

`pending < unknown < accepted/submitted/buffered < failed/rejected/expired < delivered`

A provider callback with a weaker/out-of-order state can no longer overwrite a stronger state already recorded for the communication.

The worker acceptance path now records the initial `accepted` transition.

Final delivery failure updates the delivery state to `failed`; retryable failures return the message to `pending`.

Provider-accepted/local-completion uncertainty remains represented as `unknown` rather than falsely claiming delivery.

Raw provider events remain retained separately in `communication_provider_events`.

## COMM-03 — Inbound identity safety

`communication_inbound` now records:

- `match_status`: `matched`, `unmatched`, or `ambiguous`
- `match_reason`
- `matched_at`

Inbound customer resolution now requires exactly one match.

Email matching uses normalized exact email equality.

SMS/WhatsApp matching uses the existing normalized phone contract.

If more than one customer matches, the message is deliberately left without a customer assignment and marked `ambiguous`.

Unmatched and ambiguous inbound messages create staff review notifications instead of being silently attached to an arbitrary customer.

The previous oldest-customer selection behavior is not used by the new function.

Provider message IDs remain idempotent so duplicate inbound callbacks do not create duplicate customer communications.

## Verification completed

Passed:

- COMM-01–03 static verification
- Operation 7 Communications Journey 360
- Production Communications Integration 360
- Migration integrity
- Database dependency verification
- Application Security & Trust Boundary
- Customer Self-Service RPC / Public Trust Boundary 360
- Ecommerce stability
- Delivery worker hardening

Post-migration static dependency snapshot:

- 103 migrations
- 155 tables
- 222 functions
- 278 FK references

## Important environment limitation

This package was built from the latest ZIP foundation, which does not contain the project's `.git` metadata or a complete installed dependency tree.

Therefore this report does **not** claim:

- TypeScript compilation
- ESLint
- Vite production build
- browser E2E
- live Supabase migration deployment
- real Brevo delivery
- real Africa's Talking delivery
- real Meta WhatsApp delivery

Those remain environment/UAT gates.

## Next communications phases

1. COMM-04 — provider certification and real delivery UAT
2. COMM-05 — production-quality message templates
3. COMM-06 — complete business-event routing from the catalogue
4. COMM-07 — customer communications experience
5. COMM-08 — Admin Communication Center 360
6. COMM-09 — Customer 360 communications
7. COMM-10 — inbound conversation handling and review queue
8. COMM-11 — scheduler/worker recovery certification
9. COMM-12 — production provider activation
10. COMM-13 — two-customer real UAT and isolation proof
11. COMM-14 — failure/retry/recovery certification
12. COMM-15 — observability and audit reporting
13. COMM-16 — communications security certification
14. COMM-17 — final communications release gate
