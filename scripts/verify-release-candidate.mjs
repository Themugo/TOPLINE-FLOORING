import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const expectedProjectRef = 'jypkhvknfgoqrhwzbdwi';
const expectedUrl = `https://${expectedProjectRef}.supabase.co`;

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const migrationsDir = path.join(root, 'supabase', 'migrations');
const migrations = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

if (new Set(migrations.map((f) => f.match(/^\d+/)[0])).size !== migrations.length) failures.push('Duplicate active migration timestamps detected.');
if (!read('supabase/config.toml').includes(`project_id = "${expectedProjectRef}"`)) {
  failures.push('Supabase config is not pinned to the dedicated Topline project.');
}
if (!read('.env.example').includes(expectedUrl)) failures.push('Public environment example is not pinned to the dedicated Topline Supabase URL.');
if (!read('src/lib/supabase.ts').includes(expectedUrl)) failures.push('Frontend Supabase client is missing the dedicated Topline project guard.');

const providerBoundary = read('supabase/functions/payment-webhook/index.ts');
if (!providerBoundary.includes('x-payment-provider')) failures.push('Payment webhook boundary does not require a provider identifier.');
if (!providerBoundary.includes('x-payment-signature')) failures.push('Payment webhook boundary does not require a signature.');
if (!providerBoundary.includes('501')) failures.push('Unconfigured payment provider boundary must remain fail-closed.');

const lifecycle = read('docs/TOPLINE_PAYMENT_LIFECYCLE.md');
for (const required of [
  'Provider credentials belong to the client',
  'Run local Supabase replay and database tests',
  'UAT',
  'reservation expiry',
]) {
  if (!lifecycle.toLowerCase().includes(required.toLowerCase())) failures.push(`Payment lifecycle runbook missing: ${required}`);
}

const workflow = read('.github/workflows/ci.yml');
for (const command of [
  'npm run verify:migration-integrity',
  'npm run verify:payment-inventory-lifecycle',
  'npm run verify:payment-refund-expiry',
  'npm run verify:payment-provider-boundary',
]) {
  if (!workflow.includes(command)) failures.push(`CI workflow missing ${command}.`);
}

const forbidden = /(?<![A-Za-z0-9_])(?:service_role|SUPABASE_SERVICE_ROLE_KEY|consumer[_-]?secret|consumer[_-]?key|client[_-]?secret|access[_-]?token)\s*[:=]\s*["']?[A-Za-z0-9_\-\.\/+=]{12,}/i;
const scanDirs = ['src', 'supabase/functions', 'supabase/migrations'];
function walk(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(full));
    else result.push(full);
  }
  return result;
}
for (const dir of scanDirs) {
  for (const file of walk(path.join(root, dir))) {
    const text = fs.readFileSync(file, 'utf8');
    if (forbidden.test(text) && !file.endsWith('payment-webhook/index.ts')) {
      failures.push(`Potential hard-coded server credential/token in ${path.relative(root, file)}.`);
    }
  }
}

if (failures.length) {
  console.error('Release candidate gate FAILED.');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Release candidate gate PASSED.');
console.log(`- Dedicated Supabase project: ${expectedProjectRef}`);
console.log(`- Active migrations: ${migrations.length}`);
console.log('- Payment webhook: fail-closed until a real provider adapter is configured');
console.log('- Next external validation: local DB replay, linked dry-run, provider UAT');
