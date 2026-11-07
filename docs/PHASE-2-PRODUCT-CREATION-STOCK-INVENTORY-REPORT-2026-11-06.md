# TOPLINE FLOORING — PHASE 2 PRODUCT CREATION, STOCK ADJUSTMENT & INVENTORY AUDIT

**Date:** 2026-11-06  
**Authoritative foundation:** `TOPLINE-FLOORING-PHASE-1-CUSTOMER-AUTH-2026-11-06.zip`  
**Phase:** 2 — Product catalogue, product variants, stock, warehouses, transfers and procurement receipts  
**Disposition:** **SOURCE REPAIRS COMPLETE — STATIC VERIFICATION PASSED; DATABASE REPLAY AND LIVE END-TO-END CERTIFICATION PENDING.**

## 1. Scope traced

The audit followed the current implementation through these connected workflows:

1. Admin product creation, edit, SKU, slug, category/brand, price, image and archive.
2. Product variants: create, edit, stock count, activation and removal.
3. Product-level stock-in, stock-out, exact adjustment and physical count.
4. Warehouse creation, edit, deletion, stock-by-location and exact count.
5. Warehouse-to-warehouse transfer.
6. Supplier purchase orders, line items, lifecycle transitions and goods receipt.
7. Inventory movement ledger and low-stock alerts.
8. Storefront stock eligibility and variant selection.
9. Checkout reservations and paid-order stock consumption.
10. Inventory/procurement reconciliation and role-based database access.

The existing architecture and UI direction were retained. No second product catalogue or inventory model was introduced.

## 2. Defects found and source corrections made

### P2-01 — Variant stock could be edited without an inventory movement
**Severity: High — inventory auditability.**

The Product Variants screen wrote `stock_quantity` directly to `product_variants`. Those writes did not create a corresponding inventory movement.

**Correction:** Variant catalogue edits no longer write the stock field directly. Added `set_product_variant_stock(uuid, integer, text)` to set the exact count under `inventory:update`, lock the parent product before the variant row, and append a variant-linked `inventory_movements` record. The variant editor now uses this RPC and validates whole, nonnegative quantities and JSON attributes.

### P2-02 — Paid variant sales lost the variant identifier in the movement ledger
**Severity: High — stock traceability.**

Checkout/payment decremented the correct `product_variants.stock_quantity`, but the movement insert recorded only `product_id`. The movement history therefore could not identify which option was sold.

**Correction:** Replaced the active `record_order_payment_transaction` definition so variant sales write `variant_id` as well as `product_id`. The product row is locked before the variant row to align with checkout and admin stock adjustment.

### P2-03 — Zero-stock physical counts were impossible
**Severity: High — stock accuracy.**

The Inventory quick-count form rejected zero, and `adjust_product_stock` rejected `p_quantity=0` even for exact adjustments. Staff could not record a legitimate zero count through the count workflow.

**Correction:** Exact adjustment accepts zero; stock-in and stock-out still require a positive quantity. The count form accepts zero. A zero-delta count does not create a meaningless movement.

### P2-04 — Warehouse exact counts and global product stock were described inconsistently
**Severity: High — quantity reconciliation.**

`set_warehouse_stock` changed the global product total by the difference between the old and new warehouse count, but the UI said it did not change storefront product stock.

**Correction:** The UI now accurately explains that the product total changes by the warehouse delta. The RPC checks that the warehouse is active, locks the product before the warehouse row, and writes a movement. The global total remains aligned with the sum of warehouse quantities when warehouse-managed stock is fully allocated.

### P2-05 — Main inventory page silently converted data-query failures into empty inventory
**Severity: High — operational visibility.**

The Inventory page ignored errors from the alerts, movements and products queries and rendered empty arrays. A permissions or connectivity failure could look like zero stock and no alerts.

**Correction:** Query errors now produce an explicit error state and retry action. Existing loaded data is not silently replaced with empty arrays on a failed refresh.

### P2-06 — Warehouse deletion could cascade-delete nonzero stock rows
**Severity: Critical — inventory data loss.**

`warehouse_stock.warehouse_id` uses `ON DELETE CASCADE`. Deleting a warehouse with stock could remove warehouse balances without a stock transfer, write-off or corresponding adjustment to product totals.

**Correction:** Added a SECURITY DEFINER `BEFORE DELETE` guard. A warehouse holding nonzero stock cannot be deleted; staff must transfer or write off the stock first. The warehouse UI explains this. Warehouse update/delete hooks now require returned rows, so an RLS-filtered zero-row operation is not reported as success.

### P2-07 — Low-stock alerts were displayed but not created by the active migration set
**Severity: High — replenishment control.**

The admin UI could list and resolve `inventory_alerts`, but the active migrations contained no stock-change trigger or insert path that created low-stock alerts. Existing low-stock state was not backfilled.

**Correction:** Added one-active-alert-per-product and one-active-alert-per-variant partial unique indexes, stock-change triggers for products and variants, automatic refresh/resolution, and a backfill for existing low-stock products and variants. The Inventory page now displays the exact variant associated with an alert.

### P2-08 — Variant stock and parent-product stock were conflated in admin views
**Severity: High — misleading availability.**

Product list and Inventory overview displayed `products.stock_quantity` even for products whose sellable stock is held in active variants. Variant stock could be available while the parent row appeared out of stock.

**Correction:** Product list and Inventory overview now calculate sellable stock across active variants. Variant-managed products cannot be counted or adjusted through the parent-product stock field; staff are directed to the variant stock workflow.

### P2-09 — Hard-deleting a variant could cascade-delete inventory history
**Severity: Critical — audit history.**

The schema allows variant deletion to cascade to inventory movements and alerts, and order references may be detached. The variant UI exposed a hard-delete action.

**Correction:** The UI now archives variants instead of deleting them, and requires stock to be zero before archiving. A database trigger blocks deletion when the variant has stock, inventory movements, alerts, reservations or order history.

### P2-10 — Purchase-order lines could be created without a product, but goods receipt required one
**Severity: High — incomplete procurement journey.**

The purchase-order UI labelled the product link optional, but `receive_purchase_order_item` rejected unlinked lines. Such a line could be ordered but could never be received, leaving the PO lifecycle stuck.

**Correction:** New stock PO lines require a catalogue product. The database blocks sending/ordering historical POs containing unlinked lines. The UI now requires product selection and explains the stock linkage.

### P2-11 — Fractional PO quantities were silently rounded when received
**Severity: High — quantity integrity.**

Purchase order quantities were numeric, but product and warehouse stock counters and inventory movement quantities are integer. Receipt code cast numeric receipt quantities to integer, potentially rounding a fractional quantity while the PO recorded the fractional amount.

**Correction:** PO line quantities and goods receipts must be whole units. The UI validates whole quantities and rejects decreasing or over-order cumulative receipts. The database enforces the same rule and blocks historical fractional PO quantities from progressing to ordered status.

### P2-12 — PO line creation/removal and receipt/status transitions were vulnerable to races
**Severity: High — procurement concurrency.**

Adding a line did not lock the purchase order before checking its status. Line removal and receipt could acquire PO/item locks in different orders. Receipts also lacked a strict check that the PO was in an ordered/partial state.

**Correction:** PO line creation, removal, receipt and lifecycle transitions now use a consistent PO-before-item lock order. Receipts are allowed only for `ordered` or `partial` POs. Each goods receipt also creates a `procurement_events` entry with the previous/new status and receipt note.

### P2-13 — Opposite-direction warehouse transfers could deadlock
**Severity: Medium/High — concurrency.**

Transfers locked the source warehouse row before the destination row. Simultaneous A-to-B and B-to-A transfers for the same product could acquire rows in opposite orders.

**Correction:** Transfers now lock the active product row before warehouse rows, serializing transfers for the same product and aligning with the product-before-warehouse lock order used by stock adjustments and receipts.

### P2-14 — Variant-managed products could be adjusted through the parent stock counter
**Severity: High — stock correctness.**

The product-level stock RPCs, warehouse stock model and purchase-order receiving path are product-level, while storefront availability for a product with active variants is determined by variant stock.

**Correction:** Product-level stock adjustment, warehouse setting/transfer and PO receiving now reject variant-managed products rather than silently crediting or debiting the wrong stock counter. The variant editor is the supported current path for variant stock changes.

### P2-15 — Product admin list did not show sellable stock across variants
**Severity: Medium — admin visibility.**

The product table showed only the parent product stock counter.

**Correction:** The product list now loads active variant quantities and reports the aggregate sellable stock and availability status across active variants.

## 3. Important data-model limitations retained and guarded

These are not silently represented as completed features:

1. **Fractional stock is not supported by the current schema.** Product stock, variant stock, warehouse stock and inventory movement quantities are integer-based. Although the catalogue supports units such as `sqm`, this version cannot faithfully hold 1.5 sqm or other fractional quantities. The new guards prevent silent rounding. Supporting fractional units requires a coordinated numeric-column migration and review of checkout, reservations, movements, warehouse balances, PO quantities and every stock RPC.
2. **Variant stock is not warehouse-specific.** `warehouse_stock` is product-level and has no `variant_id`. Variant stock is currently global. The application now blocks product-only warehouse operations for variant-managed products rather than misrepresenting the stock location.
3. **Purchase orders are not variant-aware.** `purchase_order_items` has no `variant_id`. The application now blocks PO receipt against a variant-managed product rather than adding stock to the parent counter while the sellable variant remains unchanged. Variant-aware procurement and receiving requires an explicit schema/UI extension.
4. **Existing legacy PO rows need a staging data review.** Unlinked or fractional lines are blocked from progressing. They must be reconciled, cancelled/recreated or otherwise corrected by an authorized operator; this migration does not guess which product a historical unlinked line represents.

## 4. Files changed

- `src/pages/admin/products.tsx`
- `src/pages/admin/product-variants.tsx`
- `src/pages/admin/inventory.tsx`
- `src/pages/admin/warehouses.tsx`
- `src/pages/admin/suppliers.tsx`
- `src/hooks/use-data.ts`
- `supabase/migrations/20261106130000_inventory_stock_adjustment_hardening.sql`
- `supabase/MIGRATION_MANIFEST.md`
- `scripts/verify-phase-2-product-inventory-hardening.mjs`
- `package.json`
- `supabase/tests/browser_rpc_grants.sql` (regenerated for 161 RPCs)
- `docs/MASTER-WORKFLOW-REGISTER.csv`
- `docs/MASTER-WORKFLOW-REGISTER.json`
- This report

## 5. Verification evidence

| Verification | Result |
|---|---:|
| Phase 2 product/inventory regression assertions | **51/51 PASS** |
| Full aggregate static verification | **152/152 PASS, 0 failures** |
| Phase 1 customer auth regression | PASS |
| Customer registration/dashboard contract | 17/17 PASS |
| Admin authentication/authorization | 16/16 PASS |
| Cart stock eligibility | PASS |
| Payment/inventory lifecycle | PASS |
| Phase 11 inventory/procurement contract | PASS |
| Catalogue/product/service upload integrity | PASS |
| Commerce fulfillment | PASS |
| Order operations | PASS |
| Migration integrity | PASS |
| SQL runtime safety static verifier | PASS |
| ZIP integrity after packaging | PASS |

## 6. Runtime certification not completed

A dependency installation attempt (`npm ci --ignore-scripts --no-audit --no-fund --prefer-offline`) exceeded the execution time limit. The project dependencies were not installed. A global TypeScript compiler was present, but `tsc -p tsconfig.app.json --noEmit` could not perform a meaningful project typecheck because React, JSX runtime and other project dependencies/types were unavailable. Consequently:

- Complete `npm ci`: pending.
- TypeScript project typecheck: pending (dependency resolution unavailable).
- Vite production build: pending.
- Vitest/browser smoke tests: pending.
- Local PostgreSQL/Supabase migration replay: pending.
- Staging data migration and RLS matrix: pending.
- Live concurrent stock operations: pending.
- Real order payment/stock consumption and refunds: pending.

No linked Supabase project was modified. No live inventory, customer, order or supplier data was changed. No deployment, Git commit or push was performed.

## 7. Required staging acceptance matrix

Run against a disposable staging Supabase project with test products and test accounts:

1. Create a non-variant product with zero opening stock; confirm storefront does not allow purchase.
2. Add opening stock; confirm product total, inventory movement and storefront eligibility.
3. Stock in, stock out, exact count and exact zero count; verify before/after balances and movements.
4. Attempt negative stock, zero stock-in/out, fractional quantity and inactive warehouse; confirm rejection.
5. Create a variant with zero stock, add stock, adjust to zero and restore stock; verify variant movement and product availability.
6. Verify low-stock alert creation, update, recovery resolution and alert reactivation for products and variants.
7. Verify product and Inventory admin tables show the same sellable stock for variant-managed products.
8. Create two warehouses; set stock at each; verify global product total equals the warehouse sum.
9. Transfer stock in both directions concurrently; verify no duplicate/lost quantity and both movement rows.
10. Attempt to delete a warehouse holding stock; confirm rejection. Transfer/write off stock and retry deletion.
11. Create a PO, add linked whole-unit product lines, order, partially receive and fully receive; verify stock, movement and procurement events.
12. Attempt to add an unlinked PO line, fractional quantity or variant-managed product; confirm rejection.
13. Attempt receipt on draft, sent and cancelled POs; confirm rejection.
14. Attempt to remove a PO line while it is being ordered/received; verify transaction locking and lifecycle state.
15. Complete a paid product order and paid variant order; confirm stock decremented once, reservations converted, and movement ledger links the exact variant.
16. Verify duplicate payment replay does not decrement stock twice.
17. Archive a zero-stock variant with order history; verify it remains in the ledger and order history. Attempt hard deletion and confirm database rejection.
18. Reconcile inventory and confirm product/warehouse discrepancies and orphan records are visible.
19. Verify staff permissions: catalog-only staff cannot adjust inventory; inventory-only staff cannot edit product metadata; anonymous/customer roles cannot execute stock RPCs.
20. Run desktop/mobile browser journeys, refresh/reopen admin pages and verify no stale stock display.

## 8. Phase 2 disposition

**Source audit and corrections:** completed.  
**Phase 2 targeted static regression:** 51/51 passed.  
**Full aggregate static suite:** 152/152 passed.  
**Migration count:** 149 uniquely timestamped migrations.  
**Staging database replay:** pending.  
**Browser, payment and concurrency certification:** pending.  
**Phase 2 status:** SOURCE REPAIRS COMPLETE — NOT YET PRODUCTION-CERTIFIED.

Phase 3 must not begin until the Phase 2 runtime and staging acceptance gates are completed. The Phase 1 repaired project remains the foundation for this Phase 2 package. No production data or deployment was changed.
