import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(p, 'utf8');
const checks = []; const check = (n, ok) => checks.push([n, Boolean(ok)]);
const header = read('src/components/layout/Header.tsx'), footer = read('src/components/layout/Footer.tsx'), admin = read('src/components/admin/AdminLayout.tsx');
const editor = read('src/pages/admin/site-settings.tsx'), brand = read('src/lib/brand.ts'), lockup = read('src/components/layout/BrandLockup.tsx');
check('brand defaults live in one module', /DEFAULT_BRAND/.test(brand) && /resolveBrand/.test(brand));
check('header and footer render the shared lockup', /<BrandLockup variant="header"/.test(header) && /<BrandLockup variant="footer"/.test(footer));
check('no hardcoded logo file, descriptor or slogan in header/footer/admin', ![header, footer, admin].some((s) => /topline-brand-mark|FLOORING & WATERPROOFING|Professional Solutions for Lasting Spaces|Topline Admin/.test(s)));
check('admin sidebar uses the brand logo and name', /brand\.logoUrl/.test(admin) && /brand\.wordmark/.test(admin));
check('lockup adapts to custom logos and can hide brand text', /customLogo/.test(lockup) && /showText/.test(lockup));
check('editor saves logo and favicon into site_info (the row the site reads)', /logo_url: url/.test(editor) && /favicon_url: url/.test(editor) && !/updateSetting\('logo'|updateSetting\('favicon'/.test(editor));
check('editor carries over logo/favicon saved under the old keys', /legacyLogo/.test(editor) && /legacyFavicon/.test(editor));
check('editor edits wordmark, descriptor, slogan with live preview', /brand_wordmark/.test(editor) && /brand_descriptor/.test(editor) && /brand_promise/.test(editor) && /resolveBrand\(settings\.site_info\)/.test(editor));
check('favicon follows the editor', /BrandHead/.test(read('src/App.tsx')) && /link\[rel="icon"\]/.test(read('src/components/layout/BrandHead.tsx')));
check('footer copyright no longer repeats the business name suffix', !/\$\{siteName\} Flooring and Waterproofing/.test(footer));
check('brand documentation exists', /What does not change automatically/.test(read('docs/brand-and-site-identity.md')));
let failed = 0; for (const [n, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`); if (!ok) failed++; }
process.exit(failed ? 1 : 0);
