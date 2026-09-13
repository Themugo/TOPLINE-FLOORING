import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const canonicalRef = 'zmbsskvnzjdaxuxlauyx';
const canonicalUrl = `https://${canonicalRef}.supabase.co`;

function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }

const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else files.push(full);
  }
}
walk(root);

for (const file of files) {
  if (file.endsWith('scripts/verify-operation-16-client-owned-supabase.mjs')) continue;
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes(['jypkhvknfgoqrhwzbdwi'].join(''))) failures.push(`Retired Supabase project reference found in ${path.relative(root, file)}.`);
}

const config = read('supabase/config.toml');
if (!config.includes(`project_id = "${canonicalRef}"`)) failures.push('supabase/config.toml is not pinned to the canonical client-owned project.');

const supabaseClient = read('src/lib/supabase.ts');
if (!supabaseClient.includes(canonicalUrl)) failures.push('Frontend Supabase client is not pinned to the canonical client-owned Supabase URL.');

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((f) => f.endsWith('.sql')).sort();
if (migrations.length < 59) failures.push(`Expected at least 59 active migrations; found ${migrations.length}.`);
if (!migrations.includes('20260913150000_088_client_owned_infrastructure_hardening.sql')) failures.push('Operation 16 hardening migration is missing.');

const pkg = JSON.parse(read('package.json'));
if (pkg.scripts['verify:operation-16-client-owned-supabase'] !== 'node scripts/verify-operation-16-client-owned-supabase.mjs') failures.push('Operation 16 verifier is not registered in package.json.');

if (failures.length) {
  console.error('Operation 16 client-owned Supabase verification FAILED.');
  failures.forEach((f) => console.error(`- ${f}`));
  process.exit(1);
}

console.log('Operation 16 client-owned Supabase verification PASSED.');
console.log(`- Canonical project: ${canonicalRef}`);
console.log(`- Canonical URL: ${canonicalUrl}`);
console.log(`- Active migrations: ${migrations.length}`);
console.log('- Retired project reference scan: PASS');
