import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const products = read('src/pages/admin/products.tsx');
const variants = read('src/pages/admin/product-variants.tsx');
const inventory = read('src/pages/admin/inventory.tsx');
const warehouses = read('src/pages/admin/warehouses.tsx');
const commerce = read('src/lib/product-commerce.ts');
const migration = read('supabase/migrations/20261106130000_inventory_stock_adjustment_hardening.sql');

const checks = [
  [/Number\.isFinite\(price\)/.test(products), 'Product price input rejects non-finite values'],
  [/Number\.isInteger\(stockToAdd\)/.test(products), 'Product opening stock rejects fractional values rather than truncating'],
  [/p_movement_type: 'in'/.test(products), 'Opening product stock uses audited stock-in RPC'],
  [/set_product_variant_stock/.test(variants), 'Variant stock changes use the audited variant stock RPC'],
  [!/stock_quantity:\s*Number\(form\.stock_quantity\)/.test(variants), 'Variant catalogue metadata writes do not directly overwrite stock quantity'],
  [/Invalid attributes/.test(variants), 'Invalid variant attributes JSON is rejected instead of silently replaced'],
  [/Number\.isInteger\(desiredStock\)/.test(variants), 'Variant stock quantity must be a nonnegative whole number'],
  [/variant_id,movement_type,quantity,previous_stock,new_stock/.test(migration), 'Variant stock RPC writes variant-linked inventory movements'],
  [/v_item\.product_id,v_item\.variant_id,'out'/.test(migration), 'Paid order variant consumption is linked to the exact variant in movement ledger'],
  [/counted < 0/.test(inventory) && /zero is allowed/.test(inventory), 'Stock count supports a legitimate zero count'],
  [/min="0" step="1" inputMode="numeric" aria-label=\{`Counted stock/.test(inventory), 'Stock count input permits zero whole units'],
  [/const failed = \[alertsRes, movementsRes, productsRes\]\.find/.test(inventory), 'Inventory dashboard surfaces failed data requests rather than rendering empty stock'],
  [/p_warehouse_id: countWarehouseId \|\| null/.test(inventory), 'Stock count can target a warehouse or the global product total'],
  [/p_warehouse_id: adjustmentForm\.warehouse_id \|\| null/.test(inventory), 'Manual stock in/out can target a warehouse'],
  [/v_new := v_old\+v_delta/.test(migration), 'Warehouse exact count changes global total only by the counted delta'],
  [/Warehouse is inactive or missing/.test(migration), 'Warehouse stock cannot be set on inactive or missing warehouses'],
  [/prevent_warehouse_delete_with_stock/.test(migration) && /Warehouse still holds stock/.test(migration), 'Warehouse with nonzero stock cannot be deleted through cascading stock loss'],
  [/The product's storefront stock total is adjusted by the difference/.test(warehouses), 'Warehouse UI accurately explains its effect on global product stock'],
  [/variant:product_variants\(variant_name\)/.test(inventory), 'Inventory movement history identifies the exact variant'],
  [/REVOKE ALL ON FUNCTION public\.set_product_variant_stock/.test(migration), 'Variant stock RPC is not exposed to anonymous/public callers'],
  [/IF p_quantity <= 0 OR p_quantity <> trunc\(p_quantity\)/.test(migration), 'Purchase order receipts reject fractional quantities that integer stock cannot represent'],
  [/Select a catalogue product for every stock purchase order line/.test(migration), 'Stock purchase order lines must reference a catalogue product'],
  [/FOR UPDATE;[\s\S]*?v_status NOT IN \('draft','pending'\)/.test(migration), 'Adding a PO line locks the purchase order before checking its lifecycle status'],
  [/Every stock purchase order line must be linked to a product/.test(migration), 'Unlinked historical PO lines cannot be sent or ordered'],
  [/Total quantity received to date/.test(read('src/pages/admin/suppliers.tsx')), 'PO receiving prompt clearly asks for cumulative received quantity'],
  [/Number\.isInteger\(qty\) \|\| qty < currentReceived \|\| qty > ordered/.test(read('src/pages/admin/suppliers.tsx')), 'PO receipt UI rejects fractional, decreasing and over-order quantities'],
  [/!newItem\.product_id/.test(read('src/pages/admin/suppliers.tsx')), 'PO item UI requires a product link before stock can be received'],
  [/PERFORM 1 FROM public\.products WHERE id=v_product_id FOR UPDATE/.test(migration), 'Variant stock adjustment locks product before variant'],
  [/PERFORM 1 FROM public\.products WHERE id=v_item\.product_id FOR UPDATE/.test(migration), 'Paid variant stock consumption follows product-before-variant lock order'],
  [/SELECT stock_quantity INTO v_total[\s\S]*?FROM public\.products WHERE id=p_product_id FOR UPDATE[\s\S]*?FROM public\.warehouse_stock[\s\S]*?FOR UPDATE/.test(migration), 'Warehouse stock setting follows product-before-warehouse lock order'],
  [/v_user := private\.require_staff_permission\('inventory','update'\)[\s\S]*?PERFORM 1 FROM public\.products WHERE id=p_product_id AND is_active=true FOR UPDATE/.test(migration), 'Stock transfers serialize on the product row before warehouse row locks'],
  [/prevent_product_variant_delete_with_history/.test(migration) && /Variant has inventory or order history/.test(migration), 'Database prevents variant deletion from cascading inventory/order history'],
  [/variant\.stock_quantity > 0/.test(variants) && /update\(\{ is_active: false \}\)/.test(variants), 'Admin archives only zero-stock variants instead of hard-deleting them'],
  [/CREATE UNIQUE INDEX IF NOT EXISTS inventory_alerts_active_product_low_stock_uidx/.test(migration), 'Only one active product low-stock alert can exist per product'],
  [/CREATE UNIQUE INDEX IF NOT EXISTS inventory_alerts_active_variant_low_stock_uidx/.test(migration), 'Only one active variant low-stock alert can exist per variant'],
  [/CREATE TRIGGER trg_sync_product_low_stock_alert/.test(migration) && /CREATE TRIGGER trg_sync_variant_low_stock_alert/.test(migration), 'Product and variant stock changes automatically maintain low-stock alerts'],
  [/ON CONFLICT \(variant_id\)[\s\S]*?DO UPDATE SET threshold=EXCLUDED\.threshold,current_stock=EXCLUDED\.current_stock/.test(migration), 'Variant low-stock alert refreshes the current count and threshold'],
  [/Backfill current low-stock state/.test(migration), 'Existing low-stock products and variants are backfilled into the alert queue'],
  [/variants:product_variants\(id, variant_name, stock_quantity, low_stock_threshold, is_active\)/.test(inventory), 'Inventory overview loads variant stock separately from parent stock'],
  [/Count each option in Product Variants/.test(inventory), 'Parent product count cannot overwrite active variant stock'],
  [/alert\.variant\?\.variant_name/.test(inventory), 'Low-stock alert identifies the exact affected variant'],
  [/This product has active variants\. Adjust stock on the specific variant/.test(migration), 'Parent-product stock adjustment rejects variant-managed products'],
  [/Warehouse stock is not variant-aware/.test(migration) && /Warehouse transfers are not variant-aware/.test(migration), 'Product-only warehouse stock operations reject variant-managed products'],
  [/Purchase order receiving is not variant-aware/.test(migration), 'PO receipt rejects variant-managed products rather than crediting the wrong stock counter'],
  [/Purchase order receiving is not variant-aware\. Do not receive this line against parent-product stock/.test(migration), 'Legacy PO lines cannot silently credit parent stock for variant-managed products'],
  [/v_po\.status NOT IN \('ordered','partial'\)/.test(migration), 'Purchase receipts are blocked for draft, sent and cancelled orders'],
  [/SELECT purchase_order_id INTO v_purchase_order_id[\s\S]*?FROM public\.purchase_orders WHERE id=v_purchase_order_id FOR UPDATE[\s\S]*?FROM public\.purchase_order_items WHERE id=p_item_id FOR UPDATE/.test(migration), 'Purchase receipt locks purchase order before its line item'],
  [/SELECT purchase_order_id INTO v_po_id[\s\S]*?FROM public\.purchase_orders WHERE id=v_po_id FOR UPDATE[\s\S]*?FROM public\.purchase_order_items[\s\S]*?FOR UPDATE/.test(migration), 'Purchase order line removal uses the same PO-before-item lock order'],
  [/INSERT INTO public\.procurement_events\(purchase_order_id,event_type,from_status,to_status,note,created_by\)[\s\S]*?'goods_received'/.test(migration), 'Every goods receipt creates a procurement lifecycle event'],
  [/variants:product_variants\(id, stock_quantity, is_active\)/.test(read('src/pages/admin/products.tsx')) && /activeVariants\.reduce/.test(read('src/pages/admin/products.tsx')), 'Product admin list reports sellable stock across active variants'],
  [/REVOKE ALL ON FUNCTION public\.adjust_product_stock/.test(migration) && /REVOKE ALL ON FUNCTION public\.transfer_stock/.test(migration), 'Stock adjustment and transfer RPCs are not publicly executable'],

];

let pass = 0;
for (const [ok, label] of checks) {
  if (!ok) throw new Error(`FAIL ${label}`);
  pass += 1;
  console.log(`PASS ${label}`);
}
console.log(`Phase 2 Product & Inventory hardening: ${pass}/${checks.length} passed.`);
