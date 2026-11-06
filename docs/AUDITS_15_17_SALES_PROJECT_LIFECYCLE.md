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
