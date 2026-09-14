import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const fail=[];
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const migrations=fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')).sort();
for(const f of ['20260914100000_105_db_9_data_governance_privacy_hardening.sql','20260914100100_106_db_10_identity_privileged_access_hardening.sql','20260914100200_107_db_11_quality_corrective_action_hardening.sql']) if(!migrations.includes(f)) fail.push(`Missing ${f}`);
const checks=[
 ['20260914100000_105_db_9_data_governance_privacy_hardening.sql','data_governance_policies','data_subject_requests','access_reviews'],
 ['20260914100100_106_db_10_identity_privileged_access_hardening.sql','privileged_access_requests','staff_identity_events','staff_role_assignments','staff_role_permissions','staff_roles','staff_permissions','staff_profiles','staff_invitations'],
 ['20260914100200_107_db_11_quality_corrective_action_hardening.sql','quality_inspections_360','quality_corrective_actions_360','hse_corrective_actions_360','project_quality_inspections']
];
for(const [file,...tokens] of checks){const sql=read(`supabase/migrations/${file}`);for(const t of tokens) if(!sql.includes(t)) fail.push(`${file}: missing ${t}`); if(!sql.includes('REVOKE ALL')) fail.push(`${file}: missing grant boundary hardening`);}
if(!read('supabase/MIGRATION_MANIFEST.md').includes('85 uniquely timestamped active migrations')) fail.push('Migration manifest does not declare 84 active migrations.');
if(fail.length){console.error('DB-9–11 verification FAILED.');for(const x of fail) console.error(`- ${x}`);process.exit(1)}
console.log('DB-9–11 verification PASSED.');
console.log(`- Local migration files: ${migrations.length}`);
console.log('- DB-9 Data Governance & Privacy hardening: passed');
console.log('- DB-10 Identity & Privileged Access hardening: passed');
console.log('- DB-11 Quality & Corrective Action hardening: passed');
