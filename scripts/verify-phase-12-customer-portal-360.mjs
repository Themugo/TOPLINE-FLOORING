import fs from 'node:fs';
import path from 'node:path';
const required = [
  'supabase/migrations/20260912150000_064_customer_portal_360.sql',
  'supabase/migrations/20261107170000_customer_portal_identity_data_minimization.sql',
  'src/lib/customer-portal-360.ts',
  'src/pages/admin/customer-portal-operations.tsx',
  'src/pages/portal.tsx',
  'src/lib/customer-portal.ts',
  'docs/PHASE_12_CUSTOMER_PORTAL_360.md',
];
const missing = required.filter((f) => !fs.existsSync(path.resolve(f)));
if (missing.length) { console.error('Missing:', missing.join(', ')); process.exit(1); }
const migration = fs.readFileSync(required[0], 'utf8');
const hardening = fs.readFileSync(required[1], 'utf8');
const lib = fs.readFileSync(required[2], 'utf8');
const portal = fs.readFileSync(required[4], 'utf8');
const admin = fs.readFileSync(required[3], 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const needle of ['get_customer_portal_360', 'get_current_customer_id', 'REVOKE ALL ON FUNCTION public.get_customer_portal_360() FROM PUBLIC, anon', 'GRANT EXECUTE ON FUNCTION public.get_customer_portal_360() TO authenticated']) if (!migration.includes(needle)) throw new Error(`Migration contract missing: ${needle}`);
if (!lib.includes("supabase.rpc('get_customer_portal_360')")) throw new Error('Portal 360 client must use the canonical RPC');
if (!portal.includes('getCustomerPortal360')) throw new Error('Portal UI not converged to Portal 360 data source');
if (!app.includes("'/admin/customer-portal-operations'")) throw new Error('Admin customer portal operations route missing');
if (!hardening.includes("jsonb_build_object('id', c.id, 'name', c.name, 'email', c.email, 'phone', c.phone, 'company', c.company)")) throw new Error('Portal customer identity projection must be explicitly allow-listed');
if (hardening.includes("'customer', (SELECT to_jsonb(c)")) throw new Error('Portal must not serialize the complete customer row');
if (!hardening.includes("q.status <> 'draft'") || !hardening.includes("i.status <> 'draft'")) throw new Error('Customer-visible draft exclusions were not retained');
if (!hardening.includes("SET search_path = ''") || !hardening.includes('REVOKE ALL ON FUNCTION public.get_customer_portal_360() FROM PUBLIC, anon') || !hardening.includes('GRANT EXECUTE ON FUNCTION public.get_customer_portal_360() TO authenticated')) throw new Error('Portal RPC security/grant contract missing');
for (const needle of ['const failed = [customers, access, projects, invoices, cases, installations].find((result) => result.error)', 'setStats(null)', 'setLoadError(', 'stats === null ?']) if (!admin.includes(needle)) throw new Error(`Admin metrics fail-closed contract missing: ${needle}`);
if (!pkg.scripts['verify:phase-12-customer-portal-360']) throw new Error('Phase 12 verification script missing');
const versions = fs.readdirSync('supabase/migrations').filter(f => /^\d{14}_/.test(f)).map(f => f.slice(0,14));
if (new Set(versions).size !== versions.length) throw new Error('Duplicate migration versions detected');
console.log('Phase 12 Customer Portal 360 source verification passed (identity minimization, fail-closed metrics, RPC grants and lifecycle contract).');
