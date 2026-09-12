import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const warnings = [];

const envExample = read('.env.example');
for (const required of ['VITE_SUPABASE_URL=', 'VITE_SUPABASE_PUBLISHABLE_KEY=', 'VITE_SITE_URL=']) {
  if (!envExample.includes(required)) failures.push(`Missing ${required} in .env.example`);
}

const cms = read('src/lib/cms-defaults.ts');
for (const forbidden of ['example.com', 'Your Flooring Company', '+1 (555)', 'USD', 'America/New_York', 'MOCK_']) {
  if (cms.includes(forbidden)) failures.push(`Launch CMS default contains forbidden placeholder/mock marker: ${forbidden}`);
}

const supabase = read('src/lib/supabase.ts');
if (!supabase.includes('jypkhvknfgoqrhwzbdwi.supabase.co')) failures.push('Supabase client is not pinned to the dedicated Topline project.');

const migrationDir = path.join(root, 'supabase', 'migrations');
const migrations = fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql')).sort();
if (migrations.length < 20) warnings.push(`Only ${migrations.length} active migrations found; confirm canonical chain before production deployment.`);

for (const required of [
  'claim_communication_outbox_worker',
  'complete_communication_delivery_worker',
  'fail_communication_delivery_worker',
]) {
  const found = migrations.some((file) => read(path.join('supabase/migrations', file)).includes(required));
  if (!found) failures.push(`Missing communication worker contract: ${required}`);
}

const fn = read('supabase/functions/deliver-communications/index.ts');
for (const required of ['BREVO_API_KEY', 'AT_API_KEY', 'TOPLINE_WORKER_SECRET']) {
  if (!fn.includes(required)) failures.push(`Communication worker missing provider secret boundary: ${required}`);
}

const vercel = read('vercel.json');
if (!vercel.includes('Content-Security-Policy')) warnings.push('CSP exists; perform browser-level third-party asset validation before production cutover.');

if (failures.length) {
  console.error('Launch gap verification FAILED');
  failures.forEach((f) => console.error(`- ${f}`));
  process.exit(1);
}

console.log('Launch gap verification passed.');
warnings.forEach((w) => console.warn(`WARN: ${w}`));
console.log(`Active migrations: ${migrations.length}`);
console.log('Production provider credentials remain external secrets; none were added to the repository.');
