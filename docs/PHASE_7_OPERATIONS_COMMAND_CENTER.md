# Phase 7 — Operations Command Center

## Objective
Create one operational control surface for Topline's physical delivery business without introducing a second data model.

## Delivered
- Unified stock, warehouse, supplier, purchase-order and project workload metrics.
- Low-stock and unresolved-alert visibility.
- Purchase-order pipeline grouped from the canonical `purchase_orders` table.
- Project-delivery pipeline grouped from the canonical `projects` table.
- 14-day operational horizon for site visits and installations.
- Pending supplier receipt count.
- Direct links from every metric to the existing operational module.
- Manual refresh control and fail-closed error messaging.
- No mock/demo operational data.

## Data boundaries
The command center reads the existing canonical tables only:
`products`, `warehouses`, `suppliers`, `purchase_orders`, `projects`, `inventory_alerts`, `site_visits`, and `installations`.

It does not create duplicate inventory, procurement, scheduling or project records.

## Verification
Run:

```bash
node scripts/verify-phase-7-operations.mjs
```

Full production acceptance still requires a real Supabase environment with representative operational records. Static verification does not prove remote database execution.
