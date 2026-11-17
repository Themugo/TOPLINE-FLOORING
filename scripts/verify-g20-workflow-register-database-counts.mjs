import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(), failures=[];
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const assert=(ok,msg)=>{if(!ok)failures.push(msg)};
const files=fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')).sort();
const versions=files.map(f=>f.match(/^(\d{14})_/)?.[1]);
const inventory=JSON.parse(read('docs/MASTER-WORKFLOW-REGISTER.json'));
const wf=inventory.workflow_register.find(x=>x.workflow_id==='WF-12');
const source=read('scripts/verify-database-dependencies.mjs');
const csv=read('docs/MASTER-WORKFLOW-REGISTER.csv');
assert(versions.length===173,'Expected 173 active migration files in current source package.');
assert(versions.every(Boolean)&&new Set(versions).size===versions.length,'Migration timestamps are invalid or duplicated.');
assert(wf?.entry_points.includes(`${files.length} active SQL migrations`),'WF-12 entry-point migration count is stale.');
assert(wf?.backend_and_data_dependencies.includes('167 tables; 276 functions; 290 FK references'),'WF-12 database object counts are stale.');
assert(wf?.phase0_status.includes('173 ACTIVE MIGRATIONS'),'WF-12 migration status is stale.');
assert(wf?.phase0_status.includes('167 TABLES, 276 FUNCTIONS, 290 FK REFERENCES'),'WF-12 object-count status is stale.');
assert(csv.includes('WF-12,Database/Supabase/RLS/data integrity,Anonymous/customer/staff/admin/service role,173 active SQL migrations; Supabase config; local DB test harness,167 tables; 276 functions; 290 FK references (current repository dependency verifier; source-derived, not remote catalog)'),'WF-12 CSV entry point/dependency counts are stale.');
assert(csv.includes('173 ACTIVE MIGRATIONS; CURRENT REPOSITORY DEPENDENCY SCAN: 167 TABLES, 276 FUNCTIONS, 290 FK REFERENCES'),'WF-12 CSV status is stale.');
assert(inventory.database_inventory?.active_migration_files===files.length,'Structured inventory migration count is stale.');
assert(inventory.database_inventory?.tables===167&&inventory.database_inventory?.functions===276&&inventory.database_inventory?.foreign_key_references===290,'Structured inventory object counts are stale.');
assert(inventory.database_inventory?.scope.includes('not a live Supabase catalog snapshot'),'Inventory does not distinguish source counts from live database counts.');
assert(source.includes('createdTables.size')&&source.includes('createdFunctions.size')&&source.includes('refs.length'),'Count source verifier contract changed.');
const manifest=read('supabase/MIGRATION_MANIFEST.md');
assert(manifest.includes('173 uniquely timestamped active migrations'),'Migration manifest count disagrees with current source.');
assert(manifest.includes('20261107240000_g20_data_subject_identity_verification.sql'),'Manifest latest migration pointer is stale.');
for(const obsolete of ['158 SQL migrations','158 ACTIVE MIGRATIONS','274 functions']) {
 assert(!JSON.stringify(wf).includes(obsolete),`Obsolete WF-12 count remains: ${obsolete}`);
}
for(const obsolete of ['158 SQL migrations','158 ACTIVE MIGRATIONS','274 functions']) {
 assert(!csv.includes(obsolete),`Obsolete WF-12 CSV count remains: ${obsolete}`);
}
if(failures.length){console.error('G-20 MASTER WORKFLOW REGISTER RECONCILIATION: FAIL');failures.forEach(x=>console.error('- '+x));process.exit(1)}
console.log('G-20 MASTER WORKFLOW REGISTER RECONCILIATION: PASS');
console.log(`WF-12 source counts: ${files.length} migrations, 167 tables, 276 functions, 290 FK references.`);
console.log('Source-vs-live database qualification retained; live replay remains pending.');
