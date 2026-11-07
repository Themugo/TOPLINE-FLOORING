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

## Phase 12 hardening applied
- The final customer portal RPC now returns an explicit allow-list of customer identity fields (`id`, `name`, `email`, `phone`, `company`) instead of serializing every column from `customers`. This prevents later schema additions and internal notes/address fields from silently expanding the customer-facing payload.
- The Customer Portal Operations admin metrics now fail closed: if any of the six count queries fails, all metrics display as unavailable (`—`) with an error explanation instead of converting failed/null counts into misleading zeroes.
- The hardening migration retains the existing empty `search_path`, authenticated-only execute grant, anonymous/PUBLIC revocation, and customer-visible draft quotation/invoice exclusions.

## Verification
Run `npm run verify:phase-12-customer-portal-360` after installation.

Dependency-aware typecheck/build should also be run in the local environment when the npm dependency tree is available.
