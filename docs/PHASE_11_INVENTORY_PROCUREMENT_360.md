# Phase 11 — Inventory & Procurement Operations 360

## Objective

Complete the existing catalogue, inventory, warehouse and procurement engine as a production-grade operational control loop without creating duplicate ledgers.

## Delivered

- Supplier create/update mutations moved behind staff-authorized SECURITY DEFINER RPC contracts.
- Purchase-order lifecycle transitions are server-authoritative.
- Purchase orders cannot advance into commitment states without line items.
- Ordered purchase orders require a receiving warehouse.
- Received purchase orders must have zero remaining quantity.
- Purchase-order line add/remove operations validate editability and recalculate totals server-side.
- Received line items cannot be removed.
- Immutable-style procurement event history records lifecycle and line-item activity.
- Inventory reconciliation reports product-vs-warehouse discrepancies and warehouse records referencing missing/inactive products.
- Inventory & Procurement Operations 360 snapshot aggregates stock pressure, warehouses, suppliers, PO exposure, receipts and movement activity.
- Dedicated admin workspace exposes the operational snapshot and reconciliation action.

## Source of truth

The existing canonical `products`, `warehouse_stock`, `purchase_orders`, `purchase_order_items`, `suppliers`, `inventory_movements` and related tables remain authoritative.

This phase adds transaction controls, audit projections and operational views; it does not create a second inventory or procurement ledger.

## Security

All sensitive mutations require the existing staff permission boundary. Procurement events are read-only to permitted authenticated staff and are written by SECURITY DEFINER operations.

## Operational lifecycle

Stock pressure → procurement decision → purchase order → supplier commitment → warehouse receipt → reconciliation → downstream project/commerce consumption.

## Verification

Run:

`npm run verify:phase-11-inventory-procurement-360`

Then run:

`npm run verify:migration-integrity`

`npm run typecheck`

`npm run build`

Dependency-aware typecheck/build should be treated as the final release gate.

## Phase 11 hardening addendum — 2026-11-07

The Phase 10 foundation audit found and repaired the following source-level gaps without introducing a second inventory or procurement ledger:

- The 360 snapshot and reconciliation RPCs now authorize against `inventory:select`, matching `/admin/inventory-procurement-operations` and the permission catalogue. The previous `reports:read` / `inventory:read` checks were inconsistent with that route contract.
- Procurement event read RLS now uses the registered `procurement:select` permission action.
- Explicit `PUBLIC` and `anon` execution revocations are applied to the seven privileged supplier, purchase-order, reconciliation and snapshot RPCs; authenticated grants remain explicit.
- Orphan reconciliation now includes stock rows held in inactive warehouses as well as active warehouses when the referenced product is missing or inactive.
- The operations snapshot page distinguishes unavailable data from a valid zero result and supports retry. Reconciliation refreshes the snapshot after completion.
- Purchase-order status UI now includes the database's `pending` and `ordered` states, offers only valid next transitions, and disables terminal statuses.

### Hardening verification

`node scripts/verify-phase-11-inventory-procurement-hardening.mjs` — **17/17 passed**.

The existing Phase 11 contract verifier and Phase 2 inventory regression verifier also pass. The full aggregate static suite passes **161/161** after refreshing the Phase 7/8 cumulative foundation references and current migration-count assertions.

### Remaining certification gates

The source archive does not contain root `node_modules`. The global TypeScript compiler cannot resolve React, Wouter, JSX runtime or other project dependencies; therefore project typecheck is **not certified**. The Vite build is **not certified** because its prebuild script cannot resolve `@supabase/supabase-js`. PostgreSQL, `psql` and Supabase CLI are unavailable, so the new migration has not been replayed against a disposable or staging database. Warehouse/PO RLS role matrix, concurrent receipts/transfers, live stock ledger parity, browser UX and real supplier/receiving UAT remain pending.

No production database, live stock, supplier, purchase order, payment or customer record was modified. No deployment, Git commit or push was performed.
