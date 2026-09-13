import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];
const expectedProjectRef = 'zmbsskvnzjdaxuxlauyx';
const expectedSupabaseUrl = `https://${expectedProjectRef}.supabase.co`;
const expectedSiteUrl = 'https://toplineflooringandwaterproofing.co.ke';

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => failures.push(message);
const warn = (message) => warnings.push(message);

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

// 1. Repository / deterministic release contract.
for (const required of ['package.json', 'package-lock.json', '.env.example', 'vercel.json', 'vite.config.ts', 'index.html', 'src/main.tsx', 'src/App.tsx', 'supabase/config.toml', 'supabase/MIGRATION_MANIFEST.md', 'DEPLOYMENT.md', 'docs/PHASE_6_PRODUCTION_LAUNCH_RUNBOOK.md']) {
  if (!exists(required)) fail(`Missing release-critical file: ${required}`);
}
const pkg = JSON.parse(read('package.json'));
if (pkg.engines?.node !== '22.x') fail('package.json must pin Node to 22.x.');
if (pkg.scripts?.build !== 'node ./node_modules/vite/bin/vite.js build') fail('Production build script must use the repository Vite CLI path.');
if (!pkg.scripts?.['verify:operation-9-production-certification']) fail('Operation 9 verifier is not registered in package.json.');

// 2. Environment and target pinning.
const envExample = read('.env.example');
for (const key of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SITE_URL']) if (!envExample.includes(key)) fail(`.env.example missing ${key}.`);
if (!envExample.includes(expectedSupabaseUrl)) fail('Environment contract is not pinned to the dedicated Topline Supabase URL.');
if (!envExample.includes(expectedSiteUrl)) fail('Environment contract is not pinned to the canonical Topline site URL.');
const supabaseClient = read('src/lib/supabase.ts');
if (!supabaseClient.includes(expectedSupabaseUrl)) fail('Browser Supabase client is missing the dedicated Topline target guard.');
for (const secretFile of ['.env', '.env.local', '.env.production']) if (exists(secretFile)) fail(`Secret-bearing file exists in release tree: ${secretFile}`);

// 3. Migration integrity and current-chain truth.
const migrationsDir = path.join(root, 'supabase', 'migrations');
const migrations = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
const versions = migrations.map((f) => f.match(/^(\d{14})_/)?.[1]);
if (versions.some((v) => !v)) fail('Every active migration must start with a 14-digit timestamp.');
if (new Set(versions).size !== versions.length) fail('Duplicate active migration timestamps detected.');
for (let i = 1; i < versions.length; i++) if (versions[i - 1] >= versions[i]) fail(`Migration ordering is not strictly increasing: ${migrations[i - 1]} -> ${migrations[i]}`);
const latest = migrations.at(-1);
if (!latest || latest < '20260913080000_081_executive_operations_control_360.sql') fail(`Unexpected migration chain position: ${latest}`);
const manifest = read('supabase/MIGRATION_MANIFEST.md');
if (!manifest.includes(latest)) fail('Migration manifest does not contain the latest active migration.');
if (/contains\s+50\s+uniquely timestamped active migrations/i.test(manifest)) fail('Migration manifest contains stale 50-migration release count.');
if (!manifest.includes(`contains ${migrations.length} uniquely timestamped active migrations`)) fail(`Migration manifest does not state the current active count (${migrations.length}).`);

// 4. Frontend route/component integrity: every lazy page import in App.tsx must resolve.
const app = read('src/App.tsx');
const lazyImports = [...app.matchAll(/import\(['"](@\/[^'"]+)['"]\)/g)].map((m) => m[1]);
for (const alias of lazyImports) {
  const rel = alias.replace(/^@\//, 'src/');
  const candidates = [`${rel}.tsx`, `${rel}.ts`, `${rel}/index.tsx`, `${rel}/index.ts`];
  if (!candidates.some(exists)) fail(`App route lazy import has no source file: ${alias}`);
}
for (const route of ['/admin/executive-operations-360', '/admin/communications-journey-360', '/admin/customer-lifecycle-360', '/admin/supply-chain-360', '/admin/fulfillment-delivery-360', '/admin/project-delivery-360', '/admin/commercial-lifecycle', '/admin/login', '/portal', '/track-order', '/quotation', '/shop']) {
  if (!app.includes(route)) fail(`Critical application route missing from App.tsx: ${route}`);
}

// 5. Cumulative operation gates are registered in both package scripts and CI.
const ci = read('.github/workflows/ci.yml');
for (let i = 1; i <= 8; i++) {
  const script = `verify:operation-${i}-`;
  if (!Object.keys(pkg.scripts ?? {}).some((key) => key.startsWith(script))) fail(`Operation ${i} verifier is not registered in package.json.`);
  if (!ci.includes(script)) fail(`CI workflow is missing the Operation ${i} verification gate.`);
}
if (!ci.includes('npm run verify:operation-9-production-certification')) fail('CI workflow is missing the Operation 9 certification gate.');
if (/^\s{6}npm run verify:/m.test(ci)) fail('CI contains a free-floating npm command outside a YAML run block.');
if (/pull_request_target:/i.test(ci)) fail('CI must not use pull_request_target.');
if (!/permissions:\s*\n\s+contents:\s+read/m.test(ci)) fail('CI must retain least-privilege contents: read permissions.');
if (!ci.includes('npm ci') || !ci.includes('npm run lint') || !ci.includes('npm run typecheck') || !ci.includes('npm run build')) fail('CI is missing deterministic install/frontend quality gates.');

// 6. Security / credential boundary scan.
const forbiddenSecret = /(?<![A-Za-z0-9_])(?:SUPABASE_SERVICE_ROLE_KEY|consumer[_-]?secret|consumer[_-]?key|client[_-]?secret|access[_-]?token)\s*[:=]\s*[\"']?[A-Za-z0-9_\-./+=]{12,}/i;
const hardcodedToken = /(?:BEGIN PRIVATE KEY|ghp_[A-Za-z0-9]{20,}|sk_live_[A-Za-z0-9]{12,})/;
for (const dir of ['src', 'supabase/functions', 'supabase/migrations']) {
  for (const file of walk(path.join(root, dir))) {
    const rel = path.relative(root, file);
    if (rel === 'supabase/functions/payment-webhook/index.ts' || rel === 'src/lib/supabase.ts') continue;
    const text = fs.readFileSync(file, 'utf8');
    if (hardcodedToken.test(text) || forbiddenSecret.test(text)) fail(`Potential hard-coded server credential material found in ${rel}.`);
  }
}
const webhook = read('supabase/functions/payment-webhook/index.ts');
for (const token of ['x-payment-provider', 'x-payment-signature', '501']) if (!webhook.includes(token)) fail(`Payment webhook fail-closed contract missing: ${token}`);

// 7. Hosting contract / security headers.
const vercel = JSON.parse(read('vercel.json'));
if (vercel.framework !== 'vite' || vercel.outputDirectory !== 'dist' || vercel.buildCommand !== 'npm run build') fail('Vercel build/output contract is inconsistent.');
if (!JSON.stringify(vercel).includes('X-Content-Type-Options') || !JSON.stringify(vercel).includes('X-Frame-Options') || !JSON.stringify(vercel).includes('Referrer-Policy')) fail('Required baseline security headers are missing from vercel.json.');
if (!JSON.stringify(vercel).includes(expectedSiteUrl)) fail('Canonical site URL is missing from Vercel configuration.');

// 8. Production operations remain explicitly external/manual rather than falsely certified by source checks.
const runbook = read('docs/PHASE_6_PRODUCTION_LAUNCH_RUNBOOK.md');
for (const required of ['Supabase', 'Email', 'SMS', 'Vercel / DNS', 'Business UAT', 'Cutover']) if (!runbook.includes(required)) fail(`Production launch runbook is missing section: ${required}`);
for (const manual of ['db push --dry-run --linked', 'Real inbox delivery test passed', 'Real Kenyan handset test passed', 'Business UAT', 'HTTPS certificate active']) if (!runbook.includes(manual)) fail(`Launch runbook is missing explicit external validation: ${manual}`);
warn('Remote Supabase migration application is not certified by source inspection; perform linked dry-run, review, then authorized db push.');
warn('Payment, email, SMS, DNS, backup/restore and business UAT remain external evidence requirements.');

if (failures.length) {
  console.error('Operation 9 Production Certification FAILED.');
  failures.forEach((f) => console.error(`- ${f}`));
  process.exit(1);
}
console.log('Operation 9 Production Certification: STRUCTURAL GATE PASSED');
console.log(`- Dedicated Supabase project: ${expectedProjectRef}`);
console.log(`- Active migrations: ${migrations.length}`);
console.log(`- Latest migration: ${latest}`);
console.log('- Application route/import integrity: passed');
console.log('- Cumulative operations 1–8 + Operation 9 CI registration: passed');
console.log('- Credential boundary and payment fail-closed checks: passed');
console.log('- Vercel/security header contract: passed');
console.log('- External deployment/UAT evidence: manual and not falsely claimed');
for (const w of warnings) console.log(`WARNING: ${w}`);
