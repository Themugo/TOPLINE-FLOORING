import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const checks = [];
const check = (name, condition) => checks.push({ name, pass: Boolean(condition) });

const home = read('src/pages/home.tsx');
const header = read('src/components/layout/Header.tsx');
const actionBar = read('src/components/layout/MobileActionBar.tsx');
const shop = read('src/pages/shop.tsx');
const portal = read('src/pages/portal.tsx');
const migration = read('supabase/migrations/20261015140000_reconcile_existing_verified_customer_portal_links.sql');

check('Homepage hero keeps the approved responsive height contract', /h-\[30rem\] min-h-\[30rem\] sm:h-\[32rem\] lg:h-\[35rem\]/.test(home));
check('Homepage hero keeps a business-image backdrop during image decoding', /backgroundImage: allSlides\[currentSlide\]/.test(home) && /backgroundSize: 'cover'/.test(home));
check('Active hero image is eager and synchronously decoded', /loading=\{index === currentSlide \? 'eager' : 'lazy'\}/.test(home) && /decoding=\{index === currentSlide \? 'sync' : 'async'\}/.test(home));
check('Mobile header provides accessible product search', /Search products/.test(header) && /topline-mobile-product-search/.test(header));
check('Mobile header search routes to the real shop catalogue', /setLocation\(`\/shop\?search=\$\{encodeURIComponent\(query\)\}`\)/.test(header));
check('Shop restores search term from URL', /new URLSearchParams\(window\.location\.search\)\.get\('search'\)/.test(shop));
check('Mobile header has a settings-driven direct call action', /aria-label="Call Topline"/.test(header) && /telHref\(phone\)/.test(header));
check('Mobile bottom navigation exposes Services and Shop', /href="\/services"[\s\S]*?Services/.test(actionBar) && /href="\/shop"[\s\S]*?Shop/.test(actionBar));
check('Mobile bottom navigation exposes WhatsApp and quotation', /wa\.me\/\$\{whatsapp\}/.test(actionBar) && /href="\/quotation"/.test(actionBar));
check('Mobile bottom navigation respects safe-area inset', /env\(safe-area-inset-bottom\)/.test(actionBar));
check('Customer dashboard core payload loads independently of optional sections', /const portal = await getCustomerPortal360\(\)/.test(portal) && /Promise\.allSettled/.test(portal));
check('Optional customer account sections degrade independently', /journeyResult\.status === 'fulfilled'/.test(portal) && /prefsResult\.status === 'fulfilled'/.test(portal) && /docsResult\.status === 'fulfilled'/.test(portal) && /communicationsResult\.status === 'fulfilled'/.test(portal));
check('Account identity backfill requires verified email', /u\.email_confirmed_at IS NOT NULL/.test(migration));
check('Account identity backfill rejects ambiguous email matches', /HAVING count\(\*\) = 1/.test(migration));
check('Account identity backfill avoids existing identity/customer mappings', /existing\.auth_user_id = u\.id OR existing\.customer_id = m\.customer_id/.test(migration));

for (const item of checks) console.log(`${item.pass ? 'PASS' : 'FAIL'} ${item.name}`);
console.log(`\nHomepage/mobile/account reliability verification: ${checks.filter((item) => item.pass).length}/${checks.length} passed.`);
if (checks.some((item) => !item.pass)) process.exitCode = 1;
