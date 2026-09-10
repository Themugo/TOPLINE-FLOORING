import { existsSync, readFileSync } from 'node:fs';

const required = [
  'src/components/layout/CustomerLayout.tsx',
  'src/index.css',
  'src/pages/market.tsx',
  'src/pages/industries.tsx',
  'scripts/generate-sitemap.mjs',
  'index.html',
];
for (const file of required) {
  if (!existsSync(file)) throw new Error(`Missing ${file}`);
}
const layout = readFileSync('src/components/layout/CustomerLayout.tsx','utf8');
const css = readFileSync('src/index.css','utf8');
const market = readFileSync('src/pages/market.tsx','utf8');
const sitemap = readFileSync('scripts/generate-sitemap.mjs','utf8');
const index = readFileSync('index.html','utf8');
if (!layout.includes('Skip to main content') || !layout.includes('id="main-content"')) throw new Error('Skip navigation missing');
if (!css.includes('prefers-reduced-motion') || !css.includes(':focus-visible')) throw new Error('Accessibility motion/focus rules missing');
if (market.includes('Industrial Polymers Global') || market.includes('Apex Chemical Systems')) throw new Error('Placeholder partner data remains');
if (!sitemap.includes("loc: '/industries'") || !sitemap.includes("loc: '/market'")) throw new Error('Public routes missing from sitemap');
if (index.includes('+254 700 123 456') || index.includes('123 Industrial Parkway') || index.includes('https://facebook.com')) throw new Error('Placeholder business data remains in index shell');
console.log('Phase 27–29 source verification passed.');
