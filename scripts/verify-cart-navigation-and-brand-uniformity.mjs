import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const shop = readFileSync(new URL('../src/pages/shop.tsx', import.meta.url), 'utf8');
const header = readFileSync(new URL('../src/components/layout/Header.tsx', import.meta.url), 'utf8');
const footer = readFileSync(new URL('../src/components/layout/Footer.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

assert.match(shop, /import\s*\{\s*Link,\s*useLocation\s*\}\s*from\s*'wouter'/, 'Shop can navigate with the existing router');
assert.match(shop, /addItem\(product,\s*variant\)/, 'Add to cart retains the selected product and variant');
assert.match(shop, /setLocation\('\/cart'\)/, 'Add to cart opens the cart route');
assert.match(shop, /type="button"[\s\S]{0,160}handleAddToCart/, 'Add-to-cart control cannot submit a surrounding form');
assert.match(header, /src="\/topline-brand-mark\.svg"/, 'Navbar uses the canonical logo asset');
assert.match(footer, /src="\/topline-brand-mark\.svg"/, 'Footer reuses the canonical navbar logo asset');
assert.match(footer, /href="\/"[\s\S]{0,120}aria-label="Topline Flooring and Waterproofing home"/, 'Footer logo links home accessibly');
assert.match(app, /location\s*===\s*'\/cart'[\s\S]{0,180}<Cart\s*\/>/, 'App retains the cart route');
console.log('PASS: cart navigation and brand uniformity (8 assertions)');
