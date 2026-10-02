import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

const m93 = '20260930210000_close_legacy_public_read_policies.sql';
const m94 = '20260930220000_projects_admin_contract_columns.sql';
const manifest = read('supabase/MIGRATION_MANIFEST.md');
for (const m of [m93, m94]) {
  check(fs.existsSync(path.join(root, 'supabase/migrations', m)), `Missing migration ${m}`);
  check(manifest.includes(m), `Manifest missing ${m}`);
}
const s93 = read(`supabase/migrations/${m93}`);
check(s93.includes("p.policyname = 'public_read'") && s93.includes('DROP POLICY public_read'), 'Legacy public_read policies must be dropped');
check(s93.includes('CREATE OR REPLACE VIEW public.public_projects') && s93.includes('WHERE is_active = true'), 'public_projects view must filter to active projects');
check(!/actual_cost|estimated_cost|customer_id|order_id|project_value|project_address/.test(s93.split('CREATE OR REPLACE VIEW')[1].split('FROM public.projects')[0]), 'public_projects must not expose internal columns');
check(s93.includes('DROP POLICY IF EXISTS rbac_public_read_projects'), 'Base projects table must not be publicly readable');
const s94 = read(`supabase/migrations/${m94}`);
check(!/estimated_budget|actual_expenses|expense_items/.test(s94.split('CREATE OR REPLACE VIEW')[1]), 'Budget columns must not be published through the view');

// Public code paths must read the safe view, never the base projects table.
check(!read('src/pages/portfolio.tsx').includes(".from('projects')"), 'portfolio.tsx must not query the base projects table');
check(read('src/lib/public-projects.ts').includes(".from('public_projects')"), 'Public projects loader must use the public_projects view');
check(read('scripts/generate-sitemap.mjs').includes("'public_projects'"), 'Sitemap must read project slugs from public_projects');

// Known schema/code contract fixes.
check(!read('src/pages/market.tsx').includes('sort_order'), 'partners has display_order, not sort_order');
check(!read('src/pages/admin/navigation.tsx').includes('updated_at'), 'navigation_menus has no updated_at column');
const aud = read('src/components/admin/MediaAssetAuditor.tsx');
check(!/is_compressed|compression_ratio|webp_url/.test(aud), 'Media auditor must not use nonexistent media_files columns or fake compression');

// Margin data and coupon-guessing protection.
const m95 = '20260930230000_move_product_cost_prices_staff_only.sql';
const m96 = '20260930240000_coupon_validation_throttle.sql';
for (const m of [m95, m96]) {
  check(fs.existsSync(path.join(root, 'supabase/migrations', m)), `Missing migration ${m}`);
  check(manifest.includes(m), `Manifest missing ${m}`);
}
const s95 = read(`supabase/migrations/${m95}`);
check(s95.includes('DROP COLUMN cost_price') && s95.includes("current_user_has_permission('catalog','select')"), 'cost_price must move to a staff-only table');
const s96 = read(`supabase/migrations/${m96}`);
check(s96.includes('coupon_validation_failures') && s96.includes("interval '10 minutes'"), 'validate_coupon must throttle failed lookups');
check(s96.includes("SET search_path = ''") , 'validate_coupon must keep a fixed search_path');
for (const f of ['src', 'supabase/functions']) {
  const walk = (d) => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
  for (const file of walk(f).filter((x) => /\.(ts|tsx)$/.test(x))) {
    check(!read(file).includes('cost_price'), `${file} must not reference public cost_price columns`);
  }
}

// Production must generate the sitemap during `npm run build` (Vercel's build command), otherwise
// /sitemap.xml falls through to the SPA rewrite and crawlers get HTML.
const pkg = JSON.parse(read('package.json'));
check(pkg.scripts.prebuild === 'node scripts/generate-sitemap.mjs', 'package.json prebuild must generate the sitemap');
check(JSON.parse(read('vercel.json')).buildCommand === 'npm run build', 'Vercel must build with npm run build');
check(read('.gitignore').includes('public/sitemap.xml'), 'public/sitemap.xml is a build artifact and must be git-ignored');
check(read('public/.well-known/security.txt').includes('Expires:'), 'security.txt requires an Expires field (RFC 9116)');
check(read('public/.well-known/security.txt') === read('public/security.txt'), '/.well-known/security.txt and /security.txt must match');

const m97 = '20260930250000_finance_permission_resource.sql';
check(fs.existsSync(path.join(root, 'supabase/migrations', m97)) && manifest.includes(m97), 'finance permission migration missing or not in manifest');
check(read(`supabase/migrations/${m97}`).includes("'finance'") && read(`supabase/migrations/${m97}`).includes("resource = 'payments'"), 'finance permission must mirror payments grants');

if (failures.length) { console.error('Database read boundary verification FAILED.'); failures.forEach((f) => console.error(`- ${f}`)); process.exit(1); }
console.log('Database read boundary static verification PASSED.');
