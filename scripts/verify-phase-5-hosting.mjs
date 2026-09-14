import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const checks = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const check = (condition, message) => condition ? checks.push(message) : failures.push(message);

const expectedUrl = 'https://toplineflooringandwaterproofing.co.ke';
const expectedSupabase = 'https://zmbsskvnzjdaxuxlauyx.supabase.co';
const envExample = read('.env.example');
const vercel = JSON.parse(read('vercel.json'));
const robots = read('public/robots.txt');
const security = read('public/.well-known/security.txt');
const packageJson = JSON.parse(read('package.json'));

check(fs.existsSync(path.join(root, '.env.example')), '.env.example exists');
check(envExample.includes(`VITE_SUPABASE_URL=${expectedSupabase}`), '.env.example pins the dedicated Topline Supabase URL');
check(envExample.includes('VITE_SUPABASE_PUBLISHABLE_KEY='), '.env.example documents the public Supabase key');
check(envExample.includes(`VITE_SITE_URL=${expectedUrl}`), '.env.example defines the canonical Topline production URL');
check(!envExample.match(/SUPABASE_SERVICE_ROLE_KEY|service_role/i), '.env.example contains no service-role/server secret contract');
check(!fs.existsSync(path.join(root, '.env')), 'No local .env is packaged');
check(!fs.existsSync(path.join(root, '.env.local')), 'No local .env.local is packaged');
check(packageJson.engines?.node === '22.x', 'Node 22.x remains pinned for hosting builds');
check(vercel.buildCommand === 'npm run build', 'Vercel uses the repository build contract');
check(vercel.outputDirectory === 'dist', 'Vercel serves dist');
check(Array.isArray(vercel.headers) && vercel.headers.length > 0, 'Vercel security headers are configured');
check(JSON.stringify(vercel).includes('Content-Security-Policy'), 'Content-Security-Policy is configured');
check(JSON.stringify(vercel).includes('X-Content-Type-Options'), 'X-Content-Type-Options is configured');
check(JSON.stringify(vercel).includes('X-Frame-Options'), 'X-Frame-Options is configured');
check(Array.isArray(vercel.redirects), 'Canonical host redirect rules are explicitly declared');
check(vercel.redirects?.some((r) => r.source === '/:path*' && r.destination === 'https://toplineflooringandwaterproofing.co.ke/:path*' && r.has?.some((condition) => condition.type === 'host' && condition.value === 'www.toplineflooringandwaterproofing.co.ke')), 'www host redirects to the canonical non-www host');
check(robots.includes('Disallow: /admin/'), 'robots blocks the admin portal');
check(robots.includes('Sitemap: https://toplineflooringandwaterproofing.co.ke/sitemap.xml'), 'robots advertises the canonical sitemap');
check(fs.existsSync(path.join(root, 'public', '.well-known', 'security.txt')), 'security.txt is published under /.well-known/');
check(security.includes('mailto:toplineflooringandwaterproofin@gmail.com'), 'security.txt uses the real Topline security contact');
check(security.includes(`Canonical: ${expectedUrl}/.well-known/security.txt`), 'security.txt declares its canonical URL');
check(read('src/lib/supabase.ts').includes(expectedSupabase), 'frontend Supabase target guard remains pinned to Topline');

if (failures.length) {
  console.error('Phase 5 hosting/release verification FAILED.');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Phase 5 hosting/release verification PASSED.');
checks.forEach((message) => console.log(`- ${message}`));
console.log('External activation remains required: Vercel project/domain, DNS, Supabase Auth URLs, and production UAT.');
