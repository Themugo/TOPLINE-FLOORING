import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const home = read('src/pages/home.tsx');
const css = read('src/index.css');
const checks = [];
const check = (name, condition) => checks.push({ name, pass: Boolean(condition) });

check('Homepage hero preserves approved responsive height classes', /topline-home-hero relative h-\[30rem\] min-h-\[30rem\] sm:h-\[32rem\] lg:h-\[35rem\]/.test(home));
check('Configured CMS hero slides remain the first and authoritative choice', /if \(configuredSlides\.length > 0\) return configuredSlides/.test(home));
check('Catalogue hero fallback only uses records with real media and valid routes', /filter\(\(product\) => Boolean\(product\.image_url && product\.slug\)\)/.test(home) && /Boolean\(service\.image_url && service\.slug\)/.test(home));
check('Product and service hero slides are fallback-only, not appended to curated CMS slides', /const mediaBackedCatalogueSlides = \[\.\.\.productSlides, \.\.\.serviceSlides\]/.test(home) && /return mediaBackedCatalogueSlides\.length > 0 \? mediaBackedCatalogueSlides : \[defaultSlide\]/.test(home));
check('Hero slide index resets safely when CMS/catalogue content changes', /if \(currentSlide >= allSlides\.length\) setCurrentSlide\(0\)/.test(home));
check('Hero heading remains high-contrast and mobile-scaled', /text-\[2rem\].*text-white/.test(home) && /max-width: 13ch/.test(css));
check('Hero uses approved Signal Lime accent and primary action', /text-\[#B4E33D\]/.test(home) && /bg-\[#B4E33D\].*text-\[#0C2D57\]/.test(home));
check('Mobile hero hides overlapping side arrows while retaining slide indicators', /hidden sm:flex absolute left-3/.test(home) && /hidden sm:flex absolute right-3/.test(home) && /aria-label=\{`Show featured slide/.test(home));
check('Customer intent shortcuts use a compact two-column mobile layout', /customer-intent-grid \{ @apply grid grid-cols-2/.test(css));
check('Customer intent cards adapt spacing and text sizes for small screens', /customer-intent-card \{ @apply flex min-w-0/.test(css) && /text-\[11px\] sm:text-xs/.test(css));
check('Hero respects reduced-motion preferences', /prefers-reduced-motion: reduce/.test(css) && /transition-duration: 0\.01ms !important/.test(css));
check('Hero focus indicators remain explicitly visible', /\.topline-home-hero a:focus-visible/.test(css) && /outline-offset: 4px/.test(css));

for (const item of checks) console.log(`${item.pass ? 'PASS' : 'FAIL'} ${item.name}`);
console.log(`\nHomepage premium/mobile verification: ${checks.filter((item) => item.pass).length}/${checks.length} passed.`);
if (checks.some((item) => !item.pass)) process.exitCode = 1;
