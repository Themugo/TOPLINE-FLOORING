import fs from 'node:fs';
import assert from 'node:assert/strict';

const shop = fs.readFileSync(new URL('../src/pages/shop.tsx', import.meta.url), 'utf8');
const checks = [
  ['Loads complete active catalogue for correct category counts', /useProducts\(\)/.test(shop) && !/useProducts\(\s*selectedCategory/.test(shop)],
  ['Combines category filtering locally', /matchesCategory\s*=\s*!selectedCategory\s*\|\|\s*product\.category_id\s*===\s*selectedCategory/.test(shop)],
  ['Searches product metadata and variant fields', /product\.variants[\s\S]*variant\.sku/.test(shop) && /product\.brand\?\.name/.test(shop)],
  ['Retains in-stock filtering', /matchesStock\s*=\s*!inStockOnly\s*\|\|\s*product\.in_stock/.test(shop)],
  ['Retains all sort modes', ['price-asc', 'price-desc', 'featured', 'name'].every((x) => shop.includes(x))],
  ['Retains retry state', /refetch\(\)/.test(shop) && /Try again/.test(shop)],
  ['Retains product detail navigation', /href=\{`\/product\/\$\{product\.slug\}`\}/.test(shop)],
  ['Retains variant-aware purchasability guard', /isProductPurchasable\(product, selectedVariant\)/.test(shop)],
  ['Adds visible cart continuation', /View cart \(\{totalItems\}\)/.test(shop) && /href="\/cart"/.test(shop)],
  ['Removes unsupported certification headline', !shop.includes('Batch Quality & TDS Certified') && !shop.includes('Certified Chemical & Material Supplies')],
  ['Search control has accessible name', /aria-label="Search materials by name, description, SKU, brand or variant"/.test(shop)],
  ['Sort control has accessible name', /aria-label="Sort products"/.test(shop)],
];
let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed++;
}
console.log(`Shop static checks: ${checks.length - failed}/${checks.length} passed`);
if (failed) process.exitCode = 1;
