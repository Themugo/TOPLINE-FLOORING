import { existsSync, readFileSync } from 'node:fs';

const required = [
  'src/components/layout/CustomerLayout.tsx',
  'src/components/ui/WhatsAppButton.tsx',
  'src/hooks/use-seo.ts',
  'src/index.css',
  'src/pages/market.tsx',
  'src/pages/industries.tsx',
  'scripts/generate-sitemap.mjs',
  'public/robots.txt',
  'index.html',
];
for (const file of required) {
  if (!existsSync(file)) throw new Error(`Missing ${file}`);
}

const layout = readFileSync('src/components/layout/CustomerLayout.tsx','utf8');
const wa = readFileSync('src/components/ui/WhatsAppButton.tsx','utf8');
const seo = readFileSync('src/hooks/use-seo.ts','utf8');
const css = readFileSync('src/index.css','utf8');
const market = readFileSync('src/pages/market.tsx','utf8');
const sitemap = readFileSync('scripts/generate-sitemap.mjs','utf8');
const robots = readFileSync('public/robots.txt','utf8');
const index = readFileSync('index.html','utf8');
const industries = readFileSync('src/pages/industries.tsx','utf8');

if (!layout.includes('Skip to main content') || !layout.includes('id="main-content"')) throw new Error('Skip navigation missing');
if (!css.includes('prefers-reduced-motion') || !css.includes(':focus-visible')) throw new Error('Accessibility motion/focus rules missing');
if (!wa.includes('aria-expanded') || !wa.includes('aria-label={isOpen') || wa.includes('15550000000')) throw new Error('WhatsApp accessibility/default configuration not hardened');
if (!seo.includes("og:locale") || !seo.includes("en-KE") || !seo.includes('schema-website')) throw new Error('SEO locale/site schema missing');
if (market.includes('Industrial Polymers Global') || market.includes('Apex Chemical Systems')) throw new Error('Placeholder partner data remains');
if (!sitemap.includes("loc: '/industries'") || !sitemap.includes("loc: '/market'")) throw new Error('Public routes missing from sitemap');
if (!robots.includes('Sitemap: https://toplineflooringandwaterproofing.co.ke/sitemap.xml') || !robots.includes('Disallow: /admin')) throw new Error('Robots policy missing');
if (!index.includes('Topline Flooring and Waterproofing') || !index.includes('og:locale')) throw new Error('Static SEO shell metadata missing');
if (!industries.includes('Request a Technical Assessment')) throw new Error('Industry conversion path missing');
console.log('Phase 27–29 source verification passed.');
