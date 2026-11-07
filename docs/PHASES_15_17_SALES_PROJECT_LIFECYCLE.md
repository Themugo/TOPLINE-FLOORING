# Phases 15–17 — Sales to Project Lifecycle

## Phase 15 — CRM lifecycle integrity
Lead conversion now uses a transactional database RPC. Existing customers are reused by email where possible, preventing duplicate customer records and ensuring the lead's conversion state is written with the customer relationship.

## Phase 16 — Quotation → Order → Project
Accepted/ready quotations can be converted through one server-side transaction. The operation creates/reuses the customer, creates the order and order lines, creates the operational project, links quotation/lead/customer/order records, and marks the quotation converted. Partial browser-side conversions are removed from the primary flow.

## Phase 17 — Site survey execution
Site visits now have authenticated transactional scheduling/status operations and a dedicated admin screen. This creates the bridge from commercial qualification to field measurement and project execution.

## Validation
Source-level verification covers the migration, lifecycle service, quotation conversion, lead conversion, route and site-visit UI. Live PostgreSQL validation remains intentionally pending until the local Supabase stack is available.


## 360 Hardening
The lifecycle is now hardened as one end-to-end transaction boundary. Customer matching is serialized by normalized email, quotation conversion requires an accepted quotation plus explicit quotation/order/project permissions, and conversion remains idempotent. Site-visit scheduling derives and validates quotation/customer/project relationships, requires active assigned staff, rejects past dates, and records lifecycle events. Site-visit status changes are transactional and completed/cancelled visits cannot be reopened. Quotation status changes use the existing transactional `transition_quotation_status` RPC rather than direct browser-side DML.

A dedicated `sales_project_lifecycle_events` audit table records lead conversion, quotation conversion, site-visit scheduling, and site-visit status changes. The audit surface is staff-readable only.

## Phase 15 — CRM conversion certification

The dedicated `verify:phase-15-crm-lifecycle` gate independently certifies the CRM lead-to-customer transaction boundary: lead row locking, normalized-email customer matching, advisory-lock serialization, required-email fail-closed behavior, idempotent repeat conversion, canonical lead/customer state persistence, lifecycle audit recording, pinned SECURITY DEFINER search path, and explicit authenticated-only RPC execution. CI runs this focused gate before the combined Phase 15–17 regression verifier. Phases 16 and 17 remain covered by the existing combined verifier and were not redesigned in this phase.


## Phase 16 — quotation → order → project integrity certification

The dedicated `verify:phase-16-quotation-order-project` gate certifies the existing server-side conversion flow. The Phase 16 migration now fails closed when a quotation has no usable customer email, requires quotation-update, order-insert and project-insert permissions together, serializes normalized-email customer matching, and validates that an already-converted quotation still has consistent order/project/customer links before returning an idempotent success. Order lines are copied in stable display order, the project remains linked to the quotation/order/customer, linked leads are advanced, and the lifecycle audit event is recorded. The canonical RPC remains authenticated-only.

The existing Phase 15 and Phase 17 flows are preserved. Live PostgreSQL transaction/concurrency and RLS tests remain staging gates.

## Phase 17 — site survey execution integrity

The Phase 17 hardening migration strengthens the existing canonical `site_visits` workflow without adding a parallel visit table. Scheduling now requires `projects:insert`, rejects past date/time combinations and oversized inputs, validates quotation/customer/linked-project consistency, and accepts assignment only to active staff. Status changes require `projects:update`; completed and cancelled visits cannot be reopened. A status-only request can no longer label a visit `rescheduled` without changing its appointment time. The admin screen now assigns active staff, selects only required visit fields, and presents load failures with a retry path rather than silently rendering an empty calendar. Dedicated `verify:phase-17-site-visit-execution` runs in CI alongside the combined lifecycle regression gate.

Live PostgreSQL migration replay, RLS/permission matrix, concurrent scheduling and browser/device UAT remain staging gates.
