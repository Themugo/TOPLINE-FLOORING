import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) failures.push(message); };
const migration = '20261107240000_g20_data_subject_identity_verification.sql';
assert(exists(`supabase/migrations/${migration}`), 'G-20 identity-verification migration missing.');
const files = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((file) => file.endsWith('.sql')).sort();
const versions = files.map((file) => file.match(/^(\d{14})_/)?.[1]);
assert(versions.every(Boolean), 'An active migration has an invalid timestamp.');
assert(new Set(versions).size === versions.length, 'Duplicate migration timestamps detected.');
assert(versions.every((version, index) => index === 0 || versions[index - 1] < version), 'Migration ordering is not strictly increasing.');
assert(files.length === 168, `Expected 168 active migrations, found ${files.length}.`);
assert(files.includes(migration), 'G-20 identity verification migration must remain in the active source chain.');
assert(files.at(-1) === '20261110140000_g19_hse_dashboard_evidence_and_owner_validation.sql', 'G-19 HSE dashboard evidence follow-up must be the latest source migration.');

const sql = read(`supabase/migrations/${migration}`);
for (const token of [
  'identity_verified_at', 'identity_verification_reference',
  'verify_data_subject_request', "private.require_staff_permission('customers','update')",
  "status IN ('received','verifying','in_progress')", 'FOR UPDATE',
  'Identity verification is required before completing a data-subject request',
  'evidence_recorded', 'identity_verified',
  "private.require_staff_permission('reports','select')",
  "'identity_verified_at',r.identity_verified_at",
  'REVOKE ALL ON FUNCTION public.verify_data_subject_request(uuid,text) FROM PUBLIC, anon',
  'GRANT EXECUTE ON FUNCTION public.verify_data_subject_request(uuid,text) TO authenticated'
]) assert(sql.includes(token), `Privacy SQL missing required control: ${token}`);
assert(!sql.includes("'identity_verification_reference',r.identity_verification_reference"), 'Protected verification reference must not be exposed in the governance snapshot.');

const client = read('src/lib/data-governance-360.ts');
assert(client.includes('verifyDataSubjectRequest'), 'Client identity verification RPC wrapper missing.');
assert(client.includes('p_identity_verification_reference'), 'Client does not pass verification reference.');
assert(client.includes('identity_verified_at:string|null'), 'Client snapshot type missing verification timestamp.');
const page = read('src/pages/admin/data-governance-360.tsx');
for (const token of ['Verify identity', 'identity_verified_at', 'Verify identity before completing this request', 'does not itself fulfil the request']) {
  assert(page.includes(token), `Privacy admin workflow missing: ${token}`);
}

const exportMigration = read('supabase/migrations/20261107180000_phase13_export_integrity_and_audit_access_hardening.sql');
for (const token of ["private.require_staff_permission('system', 'read')", "'customers'", "'orders'", "'invoices'", "'projects'", "'service_cases'", "'hash_algorithm', 'SHA-256'"]) {
  assert(exportMigration.includes(token), `Operational export control missing: ${token}`);
}
const exportFn = read('supabase/functions/customer-data-export/index.ts');
assert(exportFn.includes("rpc('create_operational_data_export')"), 'Export Edge Function RPC call missing.');
assert(exportFn.includes("req.method !== 'POST'"), 'Export endpoint must reject non-POST requests.');
assert(exportFn.includes('Authorization'), 'Export endpoint must require an Authorization header.');

const pkg = JSON.parse(read('package.json'));
assert(pkg.scripts?.['verify:g20-data-subject-privacy'], 'G-20 verifier missing from package scripts.');
assert(pkg.scripts?.['test:g20-data-subject-privacy'], 'G-20 test command missing from package scripts.');
assert(read('.github/workflows/ci.yml').includes('npm run verify:g20-data-subject-privacy'), 'G-20 CI gate missing.');
const manifest = read('supabase/MIGRATION_MANIFEST.md');
assert(manifest.includes(migration), 'G-20 migration missing from manifest.');
assert(manifest.includes('contains 168 uniquely timestamped active migrations'), 'Migration manifest count is stale.');

if (failures.length) {
  console.error('G-20 DATA-SUBJECT PRIVACY FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('G-20 DATA-SUBJECT PRIVACY: SOURCE GATE PASSED');
console.log('- Identity verification is evidence-backed, staff-authorized and single-use.');
console.log('- Successful request completion is blocked until identity is verified.');
console.log('- Verification evidence reference is not returned in governance snapshots.');
console.log('- Operational export remains staff-only and auditable.');
console.log(`- Active migrations: ${files.length}; latest: ${files.at(-1)}`);
