# Operation 3 — Supply Chain 360

## Scope
Inventory → procurement → warehouse → receipt → project allocation → consumption → return → reconciliation.

## Controls
- Warehouse master-data mutations use protected RPCs.
- Warehouse stock, stock transfers and inventory movements cannot be directly mutated by authenticated clients.
- Purchase receipts require an active receiving warehouse and linked product, update product + warehouse stock atomically, and emit procurement/supply-chain events.
- Installation material issue consumes stock; return restores stock; terminal allocation states cannot be reopened.
- Reconciliation compares product stock to warehouse totals and checks purchase-order receipt and allocation consistency.
- Supply-chain reporting is server-authoritative.

## Verification
Run `npm run verify:operation-3-supply-chain` and the existing release/security gates. Remote Supabase remains untouched until the documented linked dry-run/deployment procedure is executed.
