import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const shop = readFileSync(new URL('../src/pages/shop.tsx', import.meta.url), 'utf8');
const header = readFileSync(new URL('../src/components/layout/Header.tsx', import.meta.url), 'utf8');
const footer = readFileSync(new URL('../src/components/layout/Footer.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const cart = readFileSync(new URL('../src/hooks/use-cart.tsx', import.meta.url), 'utf8');
const detail = readFileSync(new URL('../src/pages/shop-detail.tsx', import.meta.url), 'utf8');

assert.match(shop, /import\s*\{\s*Link,\s*useLocation\s*\}\s*from\s*'wouter'/, 'Shop can navigate with the existing router');
assert.match(shop, /addToCart\(product,\s*1,\s*variant\)/, 'Shop add-to-cart dispatches one selected product and variant through shared cart API');
assert.match(cart, /useReducer\(cartReducer,\s*undefined,\s*\(\)\s*=>\s*\(\{\s*items:\s*readSavedCart\(\)\s*\}\)\)/, 'Cart is hydrated before interactive render to avoid stale-cart overwrite');
assert.match(cart, /Number\.isInteger\(candidate\.quantity\)/, 'Persisted cart entries are validated before use');
assert.match(detail, /addToCart\(product,\s*qty,\s*selectedVariant\)/, 'Product detail adds selected quantity in one shared cart action');
assert.match(detail, /Math\.min\(selectedVariant \? selectedVariant\.stock_quantity : product\.stock_quantity,\s*q \+ 1\)/, 'Product detail quantity cannot exceed available stock');
assert.match(shop, /Out of Stock/, 'Unavailable shop materials explain why the add action is disabled');
assert.match(shop, /setLocation\('\/cart'\)/, 'Add to cart opens the cart route');
assert.match(shop, /type="button"[\s\S]{0,160}handleAddToCart/, 'Add-to-cart control cannot submit a surrounding form');
assert.match(header, /src="\/topline-brand-mark\.svg"/, 'Navbar uses the canonical logo asset');
assert.match(footer, /src="\/topline-brand-mark\.svg"/, 'Footer reuses the canonical navbar logo asset');
assert.match(footer, /href="\/"[\s\S]{0,120}aria-label="Topline Flooring and Waterproofing home"/, 'Footer logo links home accessibly');
assert.match(app, /location\s*===\s*'\/cart'[\s\S]{0,180}<Cart\s*\/>/, 'App retains the cart route');
console.log('PASS: shop/cart reliability and brand uniformity (13 assertions)');
