import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const envFile = path.join(root, '.env');
const envExample = path.join(root, '.env.example');
const expectedProjectRef = 'jypkhvknfgoqrhwzbdwi';
const expectedSite = 'https://toplineflooringandwaterproofing.co.ke';

const result = { ready: true, checks: [] };
function add(label, status, detail) {
  result.checks.push({ label, status, detail });
  if (status === 'BLOCKED') result.ready = false;
}

if (!fs.existsSync(envFile)) {
  add('Production environment file', 'BLOCKED', 'Create .env locally or configure the same variables in Vercel. The file is intentionally gitignored.');
} else {
  const env = fs.readFileSync(envFile, 'utf8');
  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SITE_URL'];
  for (const key of required) {
    const match = env.match(new RegExp(`^${key}=(.*)$`, 'm'));
    const value = match?.[1]?.trim() ?? '';
    const placeholder = !value || /your_|replace_|change_me|example\.com/i.test(value);
    add(key, placeholder ? 'BLOCKED' : 'READY', placeholder ? 'Missing or placeholder value.' : 'Configured without printing the secret/value.');
  }
  const url = env.match(/^VITE_SUPABASE_URL=(.*)$/m)?.[1]?.trim();
  add('Dedicated Supabase target', url === `https://${expectedProjectRef}.supabase.co` ? 'READY' : 'BLOCKED', 'Must target the dedicated Topline Supabase project.');
  const site = env.match(/^VITE_SITE_URL=(.*)$/m)?.[1]?.trim();
  add('Canonical site URL', site === expectedSite ? 'READY' : 'BLOCKED', `Must be ${expectedSite}.`);
}

add('Environment template', fs.existsSync(envExample) ? 'READY' : 'BLOCKED', '.env.example is present.');
add('Secrets safety', !fs.existsSync(path.join(root, '.git', 'index.lock')) ? 'READY' : 'BLOCKED', 'Repository is not locked by an unfinished Git operation.');
add('Provider activation', 'MANUAL', 'Brevo, Africa\'s Talking, Supabase Auth SMTP, Edge Functions and callbacks require external account configuration and real UAT.');
add('Database deployment', 'MANUAL', 'Run linked Supabase dry-run/deployment from an authorized Supabase CLI session; this check does not claim remote deployment.');
add('Domain cutover', 'MANUAL', 'Verify Vercel domain, DNS, HTTPS and www canonical redirect before switching production traffic.');
add('Launch UAT', 'MANUAL', 'Complete public quote/contact, authentication, admin RBAC, catalogue, order, project, invoice, email and SMS smoke tests.');

console.log(JSON.stringify(result, null, 2));
if (!result.ready) process.exit(1);
