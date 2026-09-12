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
