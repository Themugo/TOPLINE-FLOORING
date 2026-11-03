import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const header = read('src/components/layout/Header.tsx');
const css = read('src/index.css');
const checks = [];
const check = (name, condition) => checks.push({ name, pass: Boolean(condition) });

check('Mobile menu is an opaque, dedicated navigation surface', /topline-mobile-menu/.test(header) && /background-color:\s*#F7F6F3/.test(css) && /backdrop-filter:\s*none/.test(css));
check('Mobile menu no longer uses translucent white or backdrop blur', !/id="mobile-menu"[^>]*bg-white\/98/.test(header) && !/id="mobile-menu"[^>]*backdrop-blur/.test(header));
check('Mobile navigation uses the existing CMS header menu with safe fallback', /useNavigationMenus\('header'\)/.test(header) && /menus\.length > 0 \? menus/.test(header));
check('Home route has a dedicated navigation icon', /href === '\/'\) return Home/.test(header));
check('Services and portfolio routes have relevant navigation icons', /startsWith\('\/services'\)\) return Layers/.test(header) && /startsWith\('\/portfolio'\)\) return Building2/.test(header));
check('Shop and tracking routes have relevant navigation icons', /startsWith\('\/shop'\)\) return Package/.test(header) && /startsWith\('\/track-order'\)\) return PackageSearch/.test(header));
check('Contact and quotation routes have relevant navigation icons', /startsWith\('\/contact'\)\) return Headset/.test(header) && /startsWith\('\/quotation'\)\) return ReceiptText/.test(header));
check('Mobile navigation links expose at least 48px minimum height', /min-h-12/.test(header));
check('Active route remains explicitly exposed to assistive technology', /aria-current=\{isActive\(link\.href\) \? 'page' : undefined\}/.test(header));
check('Menu button exposes expanded state and controls the menu', /aria-expanded=\{mobileMenuOpen\}/.test(header) && /aria-controls="mobile-menu"/.test(header));
check('Escape closes the mobile menu', /event\.key === 'Escape'\)\s*\{\s*setMobileMenuOpen\(false\);\s*setMoreMenuOpen\(false\);/.test(header));
check('Route changes close both navigation menus', /setMobileMenuOpen\(false\);\s*setMoreMenuOpen\(false\);[\s\S]*\}, \[location\]\)/.test(header));
check('Mobile menu actions retain customer account, tracking and quotation routes', /href="\/portal"/.test(header) && /href="\/track-order"/.test(header) && /href="\/quotation"/.test(header));
check('Phone and email actions remain settings-driven', /href=\{telHref\(phone\)\}/.test(header) && /href=\{`mailto:\$\{email\}`\}/.test(header));
check('Keyboard focus treatment is present on menu links', /focus-visible:ring-2 focus-visible:ring-\[#0E6B78\]/.test(header));
check('Mobile menu honours safe-area inset at the bottom', /env\(safe-area-inset-bottom\)/.test(css));
check('Mobile menu pins the quotation action outside the scrolling list', /shrink-0 border-t[\s\S]*Request a quotation/.test(header) && /flex-1 overflow-y-auto overscroll-contain/.test(header));
check('Mobile menu does not repeat quotation, account or tracking in the main list', /const menuLinks = \(mobileMenus\.length > 0 \? [^\n]*navLinks\)\.filter/.test(header) && /'\/quotation', '\/portal', '\/track-order'/.test(header));
check('Mobile menu moves focus in on open and back to the toggle on close', /menuToggleRef\.current\?\.focus/.test(header) && /mobileNavRef\.current\?\.querySelector/.test(header));
check('Staff sign-in is demoted to a quiet link', /Staff sign in/.test(header));
check('Menu entrance animation honours reduced motion', /topline-menu-enter/.test(css) && /prefers-reduced-motion: reduce\) \{ \.topline-menu-enter/.test(css));

for (const item of checks) console.log(`${item.pass ? 'PASS' : 'FAIL'} ${item.name}`);
console.log(`\nMobile navigation refinement: ${checks.filter((item) => item.pass).length}/${checks.length} passed.`);
if (checks.some((item) => !item.pass)) process.exitCode = 1;
