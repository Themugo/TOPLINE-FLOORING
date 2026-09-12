# Phase 12 — Customer Portal 360

## Objective
Converge the customer-facing portal into one secure, lifecycle-aware self-service surface covering quotations, orders, projects, invoices, service cases, site visits and installations.

## Delivered
- Dedicated `get_customer_portal_360()` SECURITY DEFINER read boundary.
- Customer identity remains derived from `customer_portal_access` and `auth.uid()`.
- Portal 360 payload includes customer, quotations, orders and line items, projects/progress, invoices/line items, service cases, site visits, installations and a compact summary.
- Portal client uses one canonical RPC rather than broad table reads.
- Admin Customer Portal Operations surface provides operational visibility into portal-linked lifecycle entities.
- Existing service-case creation remains routed through the hardened `create_service_case()` RPC.
- No anonymous execution of the new portal RPC.

## Verification
Run `npm run verify:phase-12-customer-portal-360` after installation.

Dependency-aware typecheck/build should also be run in the local environment when the npm dependency tree is available.
