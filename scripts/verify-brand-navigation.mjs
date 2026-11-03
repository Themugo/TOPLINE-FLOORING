import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const header = read('src/components/layout/Header.tsx');
const mark = read('public/topline-brand-mark.svg');
const checks = [];
const check = (name, condition) => checks.push({ name, pass: Boolean(condition) });

check('Wordmark is driven by the brand setting with a Topline default', /wordmark: 'Topline'/.test(read('src/lib/brand.ts')) && /brand\.wordmark/.test(read('src/components/layout/BrandLockup.tsx')));
check('Default FLOORING & WATERPROOFING descriptor is defined once and editable', /descriptor: 'FLOORING & WATERPROOFING'/.test(read('src/lib/brand.ts')) && /useBrand\(\)/.test(header));
check('Brand promise is presented on large desktop layouts', /Professional Solutions for Lasting Spaces/.test(read('src/lib/brand.ts')) && /hidden lg:block/.test(read('src/components/layout/BrandLockup.tsx')));
check('Header references the dedicated scalable brand mark asset', /logoUrl: '\/topline-brand-mark\.svg'/.test(read('src/lib/brand.ts')) && /<BrandLockup variant="header"/.test(header) && /viewBox="0 0 120 104"/.test(mark));
check('Logo uses approved Ocean and Signal Lime tokens', /#0C2D57/.test(mark) && /#B4E33D/.test(mark));
check('Logo mark includes house/roof and flooring geometry', /<path/.test(mark) && /flooring/i.test(mark));
check('Desktop primary navigation remains responsive', /hidden lg:flex[^>]*aria-label="Main navigation"/.test(header));
check('Mobile navigation retains an accessible menu control', /aria-controls="mobile-menu"/.test(header) && /aria-expanded=\{mobileMenuOpen\}/.test(header));
check('Mobile menu includes a dedicated quotation call to action', /href="\/quotation"[\s\S]*?Request a quotation/.test(header));
check('Navigation closes on route changes', /setMobileMenuOpen\(false\);\s*setMoreMenuOpen\(false\);[\s\S]{0,80}\}, \[location\]\)/.test(header));
check('Escape closes open navigation menus', /event\.key === 'Escape'[\s\S]*setMobileMenuOpen\(false\)[\s\S]*setMoreMenuOpen\(false\)/.test(header));
check('Header actions expose keyboard focus styling', /focus-visible:ring-2/.test(header));

for (const item of checks) console.log(`${item.pass ? 'PASS' : 'FAIL'} ${item.name}`);
console.log(`\nSummary: ${checks.filter((item) => item.pass).length}/${checks.length} passed.`);
if (checks.some((item) => !item.pass)) process.exitCode = 1;
