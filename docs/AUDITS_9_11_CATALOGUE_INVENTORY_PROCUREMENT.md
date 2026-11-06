# TOPLINE FLOORING — Phases 9–11

## Catalogue, Inventory & Procurement Completion

This initiative closes the operational loop from catalogue definition through purchasing, receiving, warehouse allocation and stock movement.

### Phase 9 — Catalogue integrity
- Keeps products as the canonical sellable catalogue records.
- Product variants, brands, specifications and documents remain linked to the canonical product model.
- Inventory is not represented by independent browser-only state.

### Phase 10 — Inventory transaction engine
Sensitive stock mutations now use transactional PostgreSQL RPCs:
- `adjust_product_stock`
- `set_warehouse_stock`
- `transfer_stock`

These functions lock affected rows, validate non-negative stock, attribute the actor, and write inventory movements atomically.

### Phase 11 — Procurement & receiving
Purchase orders now have a receiving warehouse and use:
- `create_purchase_order`
- `add_purchase_order_item`
- `receive_purchase_order_item`

Receiving increments product stock and warehouse stock in the same transaction, records an inventory movement, and advances PO status to `partial` or `received` based on all line items.

## Important deployment note
The SQL is designed against the canonical schema but has not been pushed to the live Supabase project. Validate locally first with the Supabase CLI, then reconcile against the linked Topline project before production deployment.
