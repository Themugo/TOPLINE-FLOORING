import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) failures.push(message); };

const migration = '20261107220000_g18_data_governance_privacy_evidence_hardening.sql';
assert(exists(`supabase/migrations/${migration}`), 'G-18 hardening migration missing.');
const active = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((f) => f.endsWith('.sql')).sort();
const versions = active.map((f) => f.match(/^(\d{14})_/)?.[1]);
assert(versions.every(Boolean), 'An active migration has an invalid timestamp.');
assert(new Set(versions).size === versions.length, 'Duplicate active migration timestamps detected.');
assert(versions.every((v, i) => i === 0 || versions[i - 1] < v), 'Active migration ordering is not strictly increasing.');

const sql = read(`supabase/migrations/${migration}`);
for (const token of [
  'complete_data_subject_request', 'A valid evidence reference (3-500 characters) is required',
  'record_access_review', 'Independent access review is required',
  "jsonb_typeof(v_snapshot) IS DISTINCT FROM 'array'", 'A role snapshot is required',
  'Findings are required when access changes or revocation are required',
  'private.require_staff_permission', 'REVOKE ALL ON FUNCTION'
]) assert(sql.includes(token), `Hardening SQL missing: ${token}`);

const client = read('src/lib/data-governance-360.ts');
assert(client.includes('evidenceReference:string'), 'Client closure API must require evidence reference.');
assert(client.includes('p_evidence_reference:evidenceReference'), 'Client must pass evidence reference to RPC.');
const page = read('src/pages/admin/data-governance-360.tsx');
for (const token of ['Evidence reference', 'recordAccessReview', 'Pending staff access reviews', 'Customer record UUID', 'setData(null)']) {
  assert(page.includes(token), `Admin workflow missing: ${token}`);
}
assert(page.includes('data?.pending_access_reviews?.length'), 'Pending access reviews are not rendered.');
assert(page.includes('reviewer cannot review themselves'), 'UI must explain independent review rule.');

const pkg = JSON.parse(read('package.json'));
assert(pkg.scripts?.['verify:g18-data-governance'], 'G-18 verifier not registered in package scripts.');
assert(pkg.scripts?.['test:g18-data-governance'], 'G-18 test command not registered.');
const ci = read('.github/workflows/ci.yml');
assert(ci.includes('npm run verify:g18-data-governance'), 'G-18 CI gate missing.');
const manifest = read('supabase/MIGRATION_MANIFEST.md');
assert(manifest.includes(migration), 'G-18 migration missing from manifest.');
assert(manifest.includes(`contains ${active.length} uniquely timestamped active migrations`), 'Current migration count in manifest is stale.');
const prior = read('scripts/verify-operation-12-data-governance.mjs');
assert(prior.includes('data_subject_requests') && prior.includes('access_reviews'), 'Existing Operation 12 structural verifier unexpectedly changed.');

if (failures.length) {
  console.error('G-18 DATA GOVERNANCE & PRIVACY FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('G-18 DATA GOVERNANCE & PRIVACY: SOURCE GATE PASSED');
console.log(`- Active migrations: ${active.length}; latest: ${active.at(-1)}`);
console.log('- Closure requires evidence; access review is independent and bounded.');
console.log('- Admin request/access-review workflows, CI and manifest registered.');
