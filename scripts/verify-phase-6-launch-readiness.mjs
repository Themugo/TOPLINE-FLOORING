import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const checks = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const check = (condition, message) => condition ? checks.push(message) : failures.push(message);

const expectedProjectRef = 'zmbsskvnzjdaxuxlauyx';
const expectedUrl = `https://${expectedProjectRef}.supabase.co`;
const migrationsDir = path.join(root, 'supabase', 'migrations');
const migrations = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

check(new Set(migrations.map((f) => f.match(/^\d+/)[0])).size === migrations.length, 'Active migration timestamps are unique.');
check(read('supabase/config.toml').includes(`project_id = "${expectedProjectRef}"`), 'Supabase config remains pinned to the dedicated Topline project.');
check(read('.env.example').includes(expectedUrl), 'Environment contract points at the dedicated Topline Supabase project.');
check(read('src/lib/supabase.ts').includes(expectedUrl), 'Frontend Supabase client retains the dedicated project guard.');
check(read('vercel.json').includes('"buildCommand": "npm run build"'), 'Vercel uses the repository production build command.');
check(read('vercel.json').includes('"outputDirectory": "dist"'), 'Vercel serves the Vite dist output.');
check(read('vercel.json').includes('"source": "/(.*)"'), 'Vercel SPA routing is defined.');
check(read('public/robots.txt').includes('Sitemap: https://toplineflooringandwaterproofing.co.ke/sitemap.xml'), 'Robots policy declares the canonical sitemap.');
check(exists('public/.well-known/security.txt'), 'Security contact file exists.');
check(exists('docs/PHASE_6_PRODUCTION_LAUNCH_READINESS.md'), 'Phase 6 launch runbook exists.');
check(exists('scripts/production-launch-check.mjs'), 'Production launch check script exists.');
check(exists('supabase/functions/deliver-communications/index.ts'), 'Transactional communications worker remains present.');
check(exists('supabase/functions/sms-delivery-report/index.ts'), 'SMS delivery-report callback remains present.');

const env = read('.env.example');
for (const key of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SITE_URL']) {
  check(env.includes(`${key}=`), `Environment contract declares ${key}.`);
}
check(env.includes('VITE_SITE_URL=https://toplineflooringandwaterproofing.co.ke'), 'Canonical site URL is fixed in the environment contract.');

if (failures.length) {
  console.error('Phase 6 launch-readiness verification FAILED.');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Phase 6 launch-readiness verification PASSED.');
checks.forEach((message) => console.log(`- ${message}`));
