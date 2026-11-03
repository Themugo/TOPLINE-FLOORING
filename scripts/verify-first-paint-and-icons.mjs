import { readFileSync, existsSync } from 'node:fs';
const read = (p) => readFileSync(p, 'utf8');
const checks = [];
const check = (n, ok) => checks.push([n, Boolean(ok)]);
const html = read('index.html'); const home = read('src/pages/home.tsx'); const bar = read('src/components/layout/MobileActionBar.tsx');
check('index.html paints a branded splash, not a blank page', /id="boot-splash"/.test(html) && /#boot-splash[^}]*background: #f7f6f3/.test(html) && !/#boot-splash[^}]*background: #0c2d57/.test(html) && /name="theme-color" content="#f7f6f3"/.test(html));
check('hero preload script is external (CSP script-src self)', /<script src="\/boot\.js">/.test(html) && existsSync('public/boot.js') && !/<script>(?!<)/.test(html.replace(/<script type="module"[^>]*><\/script>/, '')));
check('hero shows a placeholder until its data has loaded', /const heroPending = slidesLoading/.test(home) && /if \(heroPending\) return \[\];/.test(home));
check('hero never draws a stock default before real slides arrive', home.indexOf('if (heroPending) return [];') < home.indexOf('const defaultSlide'));
check('first hero image is remembered for next-visit preload', /topline:hero-image/.test(home) && /topline:hero-image/.test(read('public/boot.js')));
check('mobile bar uses business-relevant icons', /Layers/.test(bar) && /Package/.test(bar) && /ReceiptText/.test(bar) && /WhatsAppIcon/.test(bar) && !/Wrench|ShoppingBag|MessageCircle|FileText/.test(bar));
check('WhatsApp uses the real brand mark everywhere', existsSync('src/components/icons/WhatsAppIcon.tsx') && !/MessageCircle/.test(read('src/components/ui/WhatsAppButton.tsx')) && !/MessageCircle/.test(read('src/pages/track-order.tsx')));
let failed = 0; for (const [n, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`); if (!ok) failed++; }
process.exit(failed ? 1 : 0);
