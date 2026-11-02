import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const commerce = read('../src/lib/product-commerce.ts');
const products = read('../src/pages/admin/products.tsx');
const inventory = read('../src/pages/admin/inventory.tsx');
const shop = read('../src/pages/shop.tsx');

assert.match(commerce, /return product\.in_stock\s*&&\s*product\.stock_quantity\s*>\s*0/, 'Non-variant products require an in-stock flag and positive quantity.');
assert.match(commerce, /variant\.is_active\s*&&\s*variant\.stock_quantity\s*>\s*0/, 'Variant products require an active, stocked variant.');
assert.match(products, /product\.stock_quantity\s*>\s*0/, 'Admin catalogue status reflects actual sellable stock, not only the legacy in_stock flag.');
assert.match(products, /\/admin\/inventory/, 'Product editor directs staff to the inventory workflow to record stock.');
assert.match(inventory, /adjust_product_stock/, 'Inventory page uses the existing audited stock-adjustment RPC.');
assert.match(shop, /Request Availability/, 'Out-of-stock products retain the availability/quotation path.');
console.log('PASS: cart stock eligibility and admin inventory guidance (6 assertions)');
