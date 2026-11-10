import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),fail=[];
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const migrationName='20261110130000_g19_hse_transition_and_independent_verification.sql';
const evidenceMigrationName='20261110140000_g19_hse_dashboard_evidence_and_owner_validation.sql';
const sql=read(`supabase/migrations/${migrationName}`);
const evidenceSql=read(`supabase/migrations/${evidenceMigrationName}`);
const page=read('src/pages/admin/hse-site-compliance-360.tsx');
const files=fs.readdirSync(path.join(root,'supabase/migrations')).filter(x=>x.endsWith('.sql')).sort();
const versions=files.map(x=>x.match(/^(\d{14})_/)?.[1]);
const assert=(ok,msg)=>{if(!ok)fail.push(msg)};
assert(files.includes(migrationName),'G-19 follow-up migration is absent.');
assert(files.includes(evidenceMigrationName),'G-19 dashboard evidence migration is absent.');
assert(new Set(versions).size===versions.length,'Duplicate migration timestamps exist.');
assert(versions.every((v,i)=>i===0||versions[i-1]<v),'Migration timestamps are not strictly increasing.');
for(const token of [
 'A responsible site safety owner is required','PPE requirements or a documented not-applicable reason are required',
 'Emergency arrangements are required','A future safety review date is required',
 'A responsible owner is required for every corrective action','A due date is required for every corrective action',
 'Corrective actions cannot be added after an HSE event is resolved',
 'Closed HSE events cannot be reopened or downgraded','Invalid HSE event transition:',
 "(v_event.status='resolved' AND p_status='closed')",'All HSE corrective actions must be closed before event closure',
 'Corrective action owner cannot independently verify their own work',
 'Invalid corrective action transition:','Verification notes are required'
]) assert(sql.includes(token),`Missing HSE lifecycle safeguard: ${token}`);
assert(sql.includes('FOR UPDATE'),'HSE parent/action rows are not serialized with row locks.');
assert(page.includes('Responsible site safety owner user UUID'),'Site UI does not collect responsible safety owner.');
assert(page.includes('PPE or documented reason'),'Site UI does not explicitly capture PPE applicability.');
assert(page.includes('Responsible owner user UUID (required)'),'Corrective action UI still treats owner as optional.');
assert(page.includes("!['resolved','closed'].includes(val(e.status))"),'Resolved events still expose add-action UI.');
assert(read('supabase/MIGRATION_MANIFEST.md').includes(migrationName),'Migration manifest omits G-19 follow-up migration.');
assert(read('supabase/MIGRATION_MANIFEST.md').includes(evidenceMigrationName),'Migration manifest omits G-19 dashboard evidence migration.');
for(const token of ['immediate_control','responsible_name','emergency_notes','verification_notes','verifier_name','An active staff member must be assigned as responsible site safety owner','An active staff member must own every corrective action','A future due date is required for every corrective action']) assert(evidenceSql.includes(token),`Missing HSE evidence/read-model safeguard: ${token}`);
assert(page.includes('Immediate control evidence:'),'HSE dashboard does not display immediate-control evidence.');
assert(page.includes('Emergency arrangements:'),'HSE dashboard does not display emergency arrangements.');
assert(page.includes('Independently verified by'),'HSE dashboard does not display independent verification evidence.');
assert(read('.github/workflows/ci.yml').includes('npm run verify:g19-hse-lifecycle'),'G-19 lifecycle verifier is missing from CI.');
const pkg=JSON.parse(read('package.json'));
assert(pkg.scripts?.['verify:g19-hse-lifecycle']==='node scripts/verify-g19-hse-lifecycle-integrity.mjs','Package script is missing.');
if(fail.length){console.error('G-19 HSE LIFECYCLE INTEGRITY: FAIL');fail.forEach(x=>console.error('- '+x));process.exit(1)}
console.log('G-19 HSE LIFECYCLE INTEGRITY: PASS');
console.log(`Active migrations: ${files.length}; latest: ${files.at(-1)}`);
console.log('Site readiness, accountable action ownership, sequential event/action transitions, independent verification and CI registration: PASS');
