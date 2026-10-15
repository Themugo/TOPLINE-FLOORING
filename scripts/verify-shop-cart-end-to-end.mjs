import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const shop = read('../src/pages/shop.tsx');
const detail = read('../src/pages/shop-detail.tsx');
const cart = read('../src/hooks/use-cart.tsx');
const commerce = read('../src/lib/product-commerce.ts');
const cartPage = read('../src/pages/cart.tsx');
const app = read('../src/App.tsx');

assert.match(shop, /addToCart\(product,\s*1,\s*variant\)/, 'Shop dispatches selected product and variant through shared cart');
assert.match(shop, /setLocation\('\/cart'\)/, 'Shop CTA navigates to canonical cart route');
assert.match(shop, /type="button"[\s\S]{0,220}handleAddToCart/, 'Shop CTA cannot accidentally submit a parent form');
assert.match(shop, /Request Availability/, 'Unavailable shop CTA offers an actionable availability request');
assert.match(shop, /setLocation\(`\/quotation\?product=/, 'Unavailable shop CTA routes to the existing quotation workflow instead of silently doing nothing');
assert.match(shop, /aria-label=\{isProductPurchasable/, 'Shop CTA has state-aware accessible label');
assert.match(detail, /addToCart\(product,\s*qty,\s*selectedVariant\)/, 'Detail CTA adds chosen quantity in one dispatch');
assert.match(detail, /Math\.min\(selectedVariant \? selectedVariant\.stock_quantity : product\.stock_quantity,\s*q \+ 1\)/, 'Detail quantity increment is stock-capped');
assert.match(detail, /Request a quotation/, 'Unavailable detail products offer a clear next action');
assert.match(detail, /addToCart\(rp,\s*1,\s*selectedRpVariant\)/, 'Related product CTA uses the shared cart action');
assert.match(cart, /readSavedCart\(\)/, 'Cart state is hydrated before initial render');
assert.match(cart, /Number\.isInteger\(candidate\.quantity\)/, 'Saved cart entries are validated');
assert.match(commerce, /variant\.stock_quantity\s*>\s*0/, 'Variant purchase eligibility respects actual stock');
assert.match(commerce, /product\.in_stock\s*&&\s*product\.stock_quantity\s*>\s*0/, 'Non-variant purchase eligibility respects inventory state');
assert.match(cartPage, /Your cart is empty/, 'Cart page retains empty-cart recovery state');
assert.match(app, /location\s*===\s*'\/cart'[\s\S]{0,180}<Cart\s*\/>/, 'App route mounts the shared cart page');
console.log('PASS: shop/cart end-to-end source contracts (16 assertions)');
