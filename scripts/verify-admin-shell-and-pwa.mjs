import fs from 'node:fs';
import vm from 'node:vm';

const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });
const read = (p) => fs.readFileSync(p, 'utf8');

const app = read('src/App.tsx');
const nav = read('src/lib/admin-nav.ts');
const perms = read('src/lib/admin-permissions.ts');
const layout = read('src/components/admin/AdminLayout.tsx');
const guard = read('src/components/admin/AdminGuard.tsx');
const html = read('index.html');
const manifest = JSON.parse(read('public/manifest.webmanifest'));
const sw = read('public/sw.js');
const vercel = JSON.parse(read('vercel.json'));
const header = read('src/components/layout/Header.tsx');
const actionBar = read('src/components/layout/MobileActionBar.tsx');
const customerLayout = read('src/components/layout/CustomerLayout.tsx');
const pwa = read('src/lib/pwa.ts');
const main = read('src/main.tsx');
const offline = read('public/offline.html');

// ---- Admin navigation completeness -------------------------------------------------------------
const routes = [...app.matchAll(/'(\/admin\/[a-z0-9-]+)':\s*Admin/g)].map((m) => m[1]);
const navRegistry = nav.split('The sidebar shows one entry per job')[0];
const hubHrefs = [...nav.split('The sidebar shows one entry per job')[1].matchAll(/href: '(\/admin[a-z0-9/-]*)'/g)].map((m) => m[1]);
const navHrefs = [...navRegistry.matchAll(/href: '(\/admin[a-z0-9/-]*)'/g)].map((m) => m[1]);
const permHrefs = new Set([...perms.matchAll(/'(\/admin[a-z0-9/-]*)':\s*\{/g)].map((m) => m[1]));
const missingFromNav = routes.filter((r) => !navHrefs.includes(r));
const unknownInNav = navHrefs.filter((h) => h !== '/admin' && !routes.includes(h));
const duplicates = navHrefs.filter((h, i) => navHrefs.indexOf(h) !== i);
check(`Every admin route (${routes.length}) is reachable from the sidebar${missingFromNav.length ? ` — missing: ${missingFromNav.join(', ')}` : ''}`, routes.length > 60 && missingFromNav.length === 0);
check('Sidebar has no links to unregistered routes and no duplicates', unknownInNav.length === 0 && duplicates.length === 0 && navHrefs.includes('/admin'));
check('Every route belongs to exactly one sidebar hub (short, task-based menu)', hubHrefs.length === navHrefs.length && new Set(hubHrefs).size === hubHrefs.length && navHrefs.every((h) => hubHrefs.includes(h)));
check('Every admin route has a permission rule', routes.every((r) => permHrefs.has(r)) && permHrefs.has('/admin'));
check('Guard looks permissions up with a normalised path (trailing slash cannot bypass the rule)', guard.includes('ROUTE_PERMISSIONS[normalizedPath]') && guard.includes('normalizeAdminPath(window.location.pathname)'));
check('Active nav item uses segment-boundary, longest-match logic', nav.includes('path.startsWith(`${item.href}/`)') && nav.includes('best.length'));

// ---- Admin layout quality ---------------------------------------------------------------------
check('Sidebar is sticky with its own scroll on desktop and a fixed drawer on phones', layout.includes('lg:sticky') && layout.includes('overflow-y-auto') && layout.includes('h-dvh') && layout.includes('overscroll-contain'));
check('Mobile drawer: aria-expanded/controls, Escape, focus trap, scroll lock, closes on route change', layout.includes('aria-expanded={drawerOpen}') && layout.includes("event.key === 'Escape'") && layout.includes('trapTab') && layout.includes('useBodyScrollLock(drawerOpen || cmdOpen)') && layout.includes('setDrawerOpen(false);\n    setCmdOpen(false);'));
check('Closed drawer is removed from tab order (invisible) and active link exposes aria-current', layout.includes("'-translate-x-full invisible'") && layout.includes("aria-current={active ? 'page' : undefined}"));
check('Quick navigate is a labelled modal dialog with arrow-key/Enter support and backdrop dismissal', layout.includes('role="dialog"') && layout.includes('aria-modal="true"') && layout.includes("event.key === 'ArrowDown'") && layout.includes("event.key === 'Enter'") && layout.includes('e.target === e.currentTarget'));
check('Navigation is filtered by staff permissions (display only; server remains authority)', layout.includes('useStaffPermissions') && layout.includes('filterAdminSidebar(ADMIN_SIDEBAR, navSearch, canSee)'));
check('Layout renders at most one <h1> (page title only, never the brand) and does not render an empty one', (layout.match(/<h1/g) || []).length === 1 && layout.includes('{title && ('));
check('Layout has skip link, breadcrumb landmark, labelled controls and 44px touch targets', layout.includes('Skip to content') && layout.includes('aria-label="Breadcrumb"') && layout.includes('h-11 w-11') && layout.includes('aria-label="Filter menu"'));
check('Layout makes scrolling tables keyboard-focusable and associates orphan labels', layout.includes("el.tabIndex = 0") && layout.includes('label.htmlFor = control.id'));
check('Layout honours device safe areas and shows an offline notice', layout.includes('env(safe-area-inset-top)') && layout.includes('env(safe-area-inset-bottom)') && layout.includes('You are offline'));

// ---- PWA: manifest, icons -----------------------------------------------------------------------
const pngSize = (file) => {
  const b = fs.readFileSync(file);
  const sig = b.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
  return sig ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null;
};
check('Manifest declares name, short_name, start_url, scope, standalone display and brand colours', manifest.name && manifest.short_name && manifest.start_url && manifest.scope === '/' && manifest.display === 'standalone' && manifest.theme_color === '#f7f6f3' && manifest.background_color);
check('Manifest theme_color matches <meta name="theme-color">', html.includes(`<meta name="theme-color" content="${manifest.theme_color}"`));
const iconProblems = [];
for (const icon of manifest.icons.filter((i) => i.type === 'image/png')) {
  const file = `public${icon.src}`;
  if (!fs.existsSync(file)) { iconProblems.push(`${icon.src} missing`); continue; }
  const dims = pngSize(file);
  const [w, h] = icon.sizes.split('x').map(Number);
  if (!dims || dims[0] !== w || dims[1] !== h) iconProblems.push(`${icon.src} is ${dims ? dims.join('x') : 'not a PNG'} but declares ${icon.sizes}`);
}
check(`Manifest icons exist and match their declared sizes${iconProblems.length ? ` — ${iconProblems.join('; ')}` : ''}`, iconProblems.length === 0);
const has = (size, purpose) => manifest.icons.some((i) => i.sizes === size && i.purpose === purpose && i.type === 'image/png');
check('Icons cover 192/512 "any" and a maskable 512 (Android adaptive icons)', has('192x192', 'any') && has('512x512', 'any') && has('512x512', 'maskable'));
const apple = pngSize('public/icons/apple-touch-icon.png');
check('Apple touch icon is a 180×180 PNG and linked from index.html', apple && apple[0] === 180 && apple[1] === 180 && html.includes('rel="apple-touch-icon"'));
check('index.html links the manifest, enables viewport-fit=cover and iOS standalone meta', html.includes('rel="manifest" href="/manifest.webmanifest"') && html.includes('viewport-fit=cover') && html.includes('apple-mobile-web-app-capable') && html.includes('mobile-web-app-capable'));
check('Manifest shortcuts point at real public routes', manifest.shortcuts.length >= 3 && manifest.shortcuts.every((s) => ['/quotation', '/shop', '/track-order', '/portal'].some((r) => s.url.startsWith(r) && app.includes(`'${r}'`))));

// ---- PWA: service worker safety -----------------------------------------------------------------
let swSyntax = true;
try { new vm.Script(sw); } catch { swSyntax = false; }
check('Service worker parses', swSyntax);
check('Service worker only handles same-origin GET requests (Supabase, payments and other hosts are never intercepted)', sw.includes("request.method !== 'GET'") && sw.includes('url.origin !== self.location.origin'));
check('Service worker never caches HTML navigations or the SPA shell; offline page is the only fallback', sw.includes("request.mode === 'navigate'") && sw.includes('caches.match(OFFLINE_URL)') && !/PRECACHE\s*=\s*\[[^\]]*index\.html/.test(sw) && !/cache\.put\([^)]*navigate/.test(sw));
check('Service worker updates only on user request (SKIP_WAITING), never auto-skips waiting', sw.includes("'SKIP_WAITING'") && !/install[\s\S]{0,300}self\.skipWaiting\(\)/.test(sw.split("addEventListener('message'")[0]));
check('Service worker precache files exist', [...sw.matchAll(/'(\/[a-z0-9./-]+)'/gi)].map((m) => m[1]).filter((p) => /\.(html|png|svg)$/.test(p)).every((p) => fs.existsSync(`public${p}`)));
check('Offline page is self-contained and CSP-safe (no inline script)', !/<script/i.test(offline) && offline.includes('You are offline'));
const headerFor = (source) => (vercel.headers.find((h) => h.source === source)?.headers || []).map((h) => `${h.key}:${h.value}`).join('|');
check('Vercel serves sw.js uncached with Service-Worker-Allowed, and the manifest with the right type', /no-cache/.test(headerFor('/sw.js')) && headerFor('/sw.js').includes('Service-Worker-Allowed:/') && headerFor('/manifest.webmanifest').includes('application/manifest+json'));
const csp = (vercel.headers[0].headers.find((h) => h.key === 'Content-Security-Policy') || {}).value || '';
check("CSP permits the worker, manifest and icons without loosening script-src ('self' only)", /script-src 'self';/.test(csp) && !/worker-src/.test(csp) && /img-src 'self' data: blob: https:/.test(csp));
check('Service worker is registered in production only and update/install flows are wired', pwa.includes('import.meta.env.PROD') && pwa.includes('beforeinstallprompt') && pwa.includes('controllerchange') && main.includes('initPwa()') && app.includes('<PwaPrompts />'));

// ---- Mobile navigation / scrolling --------------------------------------------------------------
check('Public mobile menu locks background scroll and has a tap-outside backdrop; no duplicated route effect', header.includes('useBodyScrollLock(mobileMenuOpen)') && header.includes('onClick={() => setMobileMenuOpen(false)}') && (header.match(/setMobileMenuOpen\(false\);\s*\n\s*setMoreMenuOpen\(false\);\s*\n\s*setMobileSearchOpen\(false\);\s*\n\s*\}, \[location\]\)/g) || []).length === 1 && (header.match(/\}, \[location\]\)/g) || []).length === 1);
check('Mobile action bar shows the current section (aria-current) and the page clears it plus the device safe area', actionBar.includes('aria-current={current(') && customerLayout.includes('env(safe-area-inset-bottom)'));
check('Global CSS: scroll-padding under fixed header, tap-delay removal, no horizontal overscroll', read('src/index.css').includes('scroll-padding-top') && read('src/index.css').includes('touch-action: manipulation') && read('src/index.css').includes('overscroll-behavior-x: none'));

let failed = 0;
for (const r of checks) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.name}`);
  if (!r.pass) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed.`);
if (failed) process.exitCode = 1;
