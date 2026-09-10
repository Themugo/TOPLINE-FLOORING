# Phases 24–26 — Customer Journey & Communications

## Phase 24 — Lifecycle event engine
Topline now records customer/staff-facing lifecycle events when quotations, orders, projects and invoices are created or change status. Events are generated server-side so UI refreshes cannot fabricate business history.

## Phase 25 — Customer journey
The customer portal now exposes a secure activity timeline alongside quotation and order history. Timeline events are resolved through the authenticated customer's portal identity.

## Phase 26 — Communication center
Outbound email, WhatsApp and SMS messages are queued into a controlled outbox and logged into customer communications. `queued` is distinct from `sent`; provider delivery can be attached later without pretending delivery occurred.
