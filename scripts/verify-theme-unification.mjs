import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const fail = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const css = read('src/index.css');
const tailwind = read('tailwind.config.js');
const engine = read('src/lib/theme-engine.ts');
const applier = read('src/components/ThemeApplier.tsx');
const themePage = read('src/pages/admin/theme.tsx');
const siteControl = read('src/pages/admin/site-control.tsx');
const app = read('src/App.tsx');
const revenueChart = read('src/components/admin/RevenueTrendChart.tsx');
const reportsPage = read('src/pages/admin/reports.tsx');

for (const [label, source, tokens] of [
  ['Tailwind palette', tailwind, ["primary:", "500: '#0c2d57'", "lime:", "400: '#b4e33d'", "50: '#f7f6f3'", "500: '#5f6b78'", "accent:", "500: '#0e6b78'"]],
  ['CSS semantic tokens', css, ['--topline-brand-primary: #0c2d57', '--topline-brand-accent: #b4e33d', '--topline-page-background: #f7f6f3', '--topline-surface: #ffffff', '--topline-muted: #5f6b78', '--topline-success:', '--topline-warning:', '--topline-danger:', '--topline-info:', '--topline-chart-1:', '--topline-chart-4:']],
  ['Runtime theme validation', engine, ['normalizeAppliedTheme', 'validateAppliedTheme', 'isValidThemeColor', 'ALLOWED_THEME_FONTS', 'applyAccentColorRamp', 'LIGHTER_STEPS', 'DARKER_STEPS', 'Math.min(32', 'Math.min(12', '--layout-section-gap', '--layout-content-gap']],
  ['Custom CSS safety', engine, ['validateCustomCss', '@import', 'outline', '40,000 characters', 'isSafeDesignTokenValue']],
  ['Theme application', applier, ['DEFAULT_APPLIED_THEME', 'validateCustomCss', 'isSafeDesignTokenValue', 'loadSiteDesignTokens', 'admin-custom-css']],
  ['Admin theme save validation', themePage, ['validateAppliedTheme', 'Theme settings need correction', '#0C2D57', '#B4E33D']],
  ['Site control CSS validation', siteControl, ['validateCustomCss', 'Unsafe CSS rejected', 'isSafeDesignTokenValue']],
  ['Revenue chart tokenization', revenueChart, ['--topline-chart-1', '--topline-border', '--topline-muted']],
  ['Reports chart tokenization', reportsPage, ['--topline-chart-2', '--topline-border', '--topline-muted']],
]) {
  for (const token of tokens) if (!source.includes(token)) fail.push(`${label} missing required contract: ${token}`);
}
if (!/body\s*\{[^}]*font-family:\s*var\(--theme-body-font/s.test(css)) fail.push('Body does not consume governed body-font token.');
if (!/h1,\s*h2,\s*h3,\s*h4,\s*h5,\s*h6\s*\{[^}]*font-family:\s*var\(--theme-heading-font/s.test(css)) fail.push('Headings do not consume governed heading-font token.');
if (!/\.page-container\s*\{[^}]*max-width:\s*var\(--container-max-width/s.test(css)) fail.push('Container width token is not applied.');
if (!/\.page-section\s*\{[^}]*padding-block:\s*var\(--layout-section-gap/s.test(css)) fail.push('Section spacing token is not applied.');
if (!/\.surface\s*\{[^}]*border-radius:\s*var\(--surface-radius,\s*var\(--theme-border-radius/s.test(css)) fail.push('Surface radius token is not applied.');
if (!/\.surface\s*\{[^}]*box-shadow:\s*var\(--surface-shadow/s.test(css)) fail.push('Surface shadow token is not applied.');
if (!/\.customer-intent-grid\s*\{[^}]*gap:\s*var\(--layout-content-gap/s.test(css)) fail.push('Content gap token is not applied.');
if (/stopColor="#[0-9a-f]{3,8}|stroke="#[0-9a-f]{3,8}/i.test(revenueChart)) fail.push('Revenue chart still hard-codes chart colors.');
if (/stroke="#[0-9a-f]{3,8}/i.test(reportsPage)) fail.push('Reports chart still hard-codes chart colors.');
if (!applier.includes("replace(/[._]/g, '-')")) fail.push('Site design token names are not normalized to CSS custom properties.');

function luminance(hex) {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? [...raw].map((x) => x + x).join('') : raw;
  const channels = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
const contrastPairs = [
  ['#0c2d57', '#ffffff', 'brand primary on white'],
  ['#0c2d57', '#f7f6f3', 'brand primary on concrete background'],
  ['#0c2d57', '#b4e33d', 'navy text on signal lime action'],
  ['#5f6b78', '#ffffff', 'muted text on white'],
  ['#566f0d', '#ffffff', 'strong lime accent text on white'],
  ['#0e6b78', '#ffffff', 'supporting petrol accent on white'],
  ['#166534', '#f0fdf4', 'success text on success surface'],
  ['#854d0e', '#fffbeb', 'warning text on warning surface'],
  ['#991b1b', '#fef2f2', 'danger text on danger surface'],
  ['#0e6b78', '#f0f9ff', 'information text on information surface'],
];
for (const [fg, bg, label] of contrastPairs) {
  const ratio = contrast(fg, bg);
  if (ratio < 4.5) fail.push(`${label} contrast ${ratio.toFixed(2)}:1 is below WCAG AA 4.5:1.`);
}

// Build a route inventory from the router's actual declarations. This is a source
// inventory only; rendered browser verification remains explicitly separate.
const moduleBySymbol = new Map();
for (const match of app.matchAll(/import\s+(\w+)\s+from\s+['"]@\/pages\/([^'"]+)['"]/g)) moduleBySymbol.set(match[1], match[2]);
for (const match of app.matchAll(/const\s+(\w+)\s*=\s*lazy\(\(\)\s*=>\s*import\(['"]@\/pages\/([^'"]+)['"]\)/g)) moduleBySymbol.set(match[1], match[2]);
const routes = new Map();
const add = (route, symbol, note = '') => routes.set(route, { route, symbol, file: moduleBySymbol.get(symbol) || 'resolve manually', note });
add('/', 'Home');
add('/admin/login', 'AdminLogin');
add('/admin', 'DashboardPage');
add('*', 'NotFound', 'Fallback route for unmatched paths.');
const adminStart = app.indexOf('const adminRoutes:');
const adminEnd = app.indexOf('\n  };', adminStart);
if (adminStart >= 0 && adminEnd > adminStart) {
  const block = app.slice(adminStart, adminEnd);
  for (const m of block.matchAll(/'([^']+)':\s*(\w+)/g)) add(m[1], m[2]);
}
const directRoutePattern = /if \(location === '([^']+)'(?:\s*\|\|\s*location === '([^']+)')?\)\s*\{([\s\S]*?)(?=\n  if \(|\n  return <NotFound|\n\})/g;
for (const m of app.matchAll(directRoutePattern)) {
  const components = [...m[3].matchAll(/<([A-Za-z][\w]*)\s*\/>/g)].map((item) => item[1]).filter((name) => !['Suspense'].includes(name));
  const symbol = components.at(-1);
  if (symbol && symbol !== 'PublicLoading' && symbol !== 'AdminLoading') {
    add(m[1], symbol); if (m[2]) add(m[2], symbol);
  }
}
for (const m of app.matchAll(/if \(location\.startsWith\('([^']+)'\)\)\s*\{([\s\S]*?)(?=\n  if \(|\n  return <NotFound|\n\})/g)) {
  const base = m[1];
  if (base.startsWith('/admin')) continue;
  const components = [...m[2].matchAll(/<([A-Za-z][\w]*)\s*\/>/g)].map((item) => item[1]);
  const symbol = components.at(-1);
  if (!symbol || symbol === 'PublicLoading' || symbol === 'AdminLoading') continue;
  const param = base === '/order-confirmation/' ? ':id' : ':slug';
  add(`${base}${param}`, symbol, 'Dynamic route pattern; test representative valid and invalid identifiers.');
}
const rows = [...routes.values()].sort((a,b) => a.route.localeCompare(b.route));
const csvCell = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
const header = ['route_pattern','audience','component_symbol','source_file','source_contract_status','browser_visual_status','responsive_status','interaction_status','notes'];
const csv = [header, ...rows.map(r => [r.route, r.route.startsWith('/admin') ? 'Admin / operations' : 'Public / customer', r.symbol, `src/pages/${r.file}`, 'SOURCE INVENTORY GENERATED', 'NOT RUN — browser inspection required', 'NOT RUN — desktop/tablet/mobile required', 'NOT RUN — representative interaction tests required', r.note])].map(row => row.map(csvCell).join(',')).join('\n') + '\n';
fs.writeFileSync(path.join(root, 'TOPLINE-THEME-ROUTE-VERIFICATION-MATRIX-2026-10-14.csv'), csv);

// Exercise the actual TypeScript theme engine under the project's Node 22 runtime,
// not only source-string assertions. This remains local and requires no services.
const runtimeTest = spawnSync(process.execPath, ['--experimental-strip-types', path.join(root, 'scripts/test-theme-engine.mjs')], { encoding: 'utf8' });
if (runtimeTest.status !== 0) fail.push(`Theme engine runtime regression tests failed: ${(runtimeTest.stderr || runtimeTest.stdout || 'unknown failure').trim()}`);
else console.log(runtimeTest.stdout.trim());

if (fail.length) {
  console.error('TOPLINE theme unification verification FAILED.');
  fail.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log('TOPLINE theme unification verification PASSED.');
console.log(`- Required design-token/runtime contracts: passed`);
console.log(`- WCAG AA contrast pairs checked: ${contrastPairs.length}/${contrastPairs.length} passed`);
console.log(`- Router inventory rows written: ${rows.length}`);
console.log('- Browser visual and responsive verification: explicitly pending; not represented as complete.');
