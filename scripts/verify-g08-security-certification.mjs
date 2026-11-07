import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const ci = fs.readFileSync(path.join(root,'.github','workflows','ci.yml'),'utf8');
const runner = fs.readFileSync(path.join(root,'scripts','run-g08-security-uat.mjs'),'utf8');
const sql = fs.readFileSync(path.join(root,'supabase','tests','g08_role_isolation_live.sql'),'utf8');
const runbook = fs.readFileSync(path.join(root,'docs','G-08-SECURITY-CERTIFICATION-UAT-RUNBOOK.md'),'utf8');
const checks = [
 ['package static verifier command', pkg.scripts['verify:g08-security-certification'] === 'node scripts/verify-g08-security-certification.mjs'],
 ['package live UAT command', pkg.scripts['uat:g08-security'] === 'node scripts/run-g08-security-uat.mjs'],
 ['CI static verifier registration', ci.includes('npm run verify:g08-security-certification')],
 ['runner staging-only environment gate', runner.includes("TOPLINE_SECURITY_UAT_ENV !== 'staging'")],
 ['runner explicit mutation opt-in', runner.includes("TOPLINE_ALLOW_SECURITY_UAT !== 'true'")],
 ['runner rejects canonical project', runner.includes('expectedRef === canonicalRef')],
 ['runner verifies linked project ref', runner.includes("supabase', '.temp', 'project-ref")],
 ['runner verifies database host/ref match', runner.includes('db.${expectedRef}.supabase.co')],
 ['runner uses psql stop-on-error', runner.includes("'-v', 'ON_ERROR_STOP=1'")],
 ['runner records sanitized evidence', runner.includes('g08-security-uat-summary.json') && runner.includes('sql_sha256')],
 ['SQL is read-only and rolled back', sql.includes('BEGIN READ ONLY;') && sql.includes('ROLLBACK;')],
 ['SQL checks sensitive table RLS', ['customers','orders','projects','invoices','service_cases','communication_outbox','staff_profiles'].every(t => sql.includes(`'${t}'`))],
 ['SQL checks storage RLS/private bucket', sql.includes('storage.objects') && sql.includes("id='private-documents' AND public=false")],
 ['SQL checks worker RPC execution grants', sql.includes('claim_communication_outbox') && sql.includes('complete_communication_delivery') && sql.includes('fail_communication_delivery')],
 ['SQL tests anon and cross-customer denial', sql.includes('SET LOCAL ROLE anon') && sql.includes('Customer A can read Customer B order')],
 ['SQL tests owner positive control', sql.includes('Customer B cannot read its own fixture order')],
 ['runbook contains live UAT instructions', runbook.includes('TOPLINE_G08_CUSTOMER_A_AUTH_ID') && runbook.includes('psql')],
 ['runbook explicitly distinguishes live from static', runbook.includes('not a full penetration test')]
];
let failed=0;
for (const [name, ok] of checks) { console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) failed++; }
if (failed) { console.error(`G-08 static verifier failed: ${failed}/${checks.length}`); process.exit(1); }
console.log(`G-08 static verifier passed: ${checks.length}/${checks.length}`);
