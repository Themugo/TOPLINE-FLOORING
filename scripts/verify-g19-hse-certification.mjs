import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(), failures=[];
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const assert=(ok,msg)=>{if(!ok)failures.push(msg)};
const migrationName='20261107230000_g19_hse_site_safety_integrity.sql';
const migration=read(`supabase/migrations/${migrationName}`);
const lib=read('src/lib/hse-site-compliance-360.ts');
const page=read('src/pages/admin/hse-site-compliance-360.tsx');
const active=fs.readdirSync(path.join(root,'supabase/migrations')).filter(x=>x.endsWith('.sql')).sort();
const versions=active.map(x=>x.match(/^(\d{14})_/)?.[1]);
assert(new Set(versions).size===versions.length,'Duplicate active migration timestamps.');
assert(versions.every((v,i)=>i===0||versions[i-1]<v),'Migration timestamps are not strictly increasing.');
assert(active.includes(migrationName),'G-19 migration is missing from the active migration chain.');
for(const token of [
 'Immediate safety control (minimum 5 characters) is required',
 'Resolved or closed HSE events cannot be reopened or downgraded',
 'Corrective action must be completed before independent verification',
 'Corrective action must be verified before closure',
 'Verified or closed corrective actions cannot be reopened or downgraded',
 'All HSE corrective actions must be verified or closed before event closure',
 'private.require_staff_permission'
]) assert(migration.includes(token),`Migration safeguard missing: ${token}`);
assert(page.includes('setData(null)'),'Failed HSE refresh does not clear stale snapshot.');
assert(page.includes("loading||!data?'—':Number(v||0)"),'HSE metrics can show false zero after failed load.');
assert(page.includes('Immediate safety control taken'),'HSE event UI does not collect immediate control evidence.');
assert(page.includes("s==='open'||s==='blocked'?'in_progress'"),'Blocked corrective actions cannot resume through the admin workflow.');
assert(page.includes('Responsible owner user UUID'),'Corrective action UI does not collect owner.');
assert(page.includes('Action due date'),'Corrective action UI does not collect due date.');
assert(page.includes('Next safety review date'),'Site UI does not collect next review date.');
assert(page.includes('Emergency arrangements'),'Site UI does not collect emergency arrangements.');
assert(page.includes('Required PPE'),'Site UI does not collect PPE requirements.');
assert(page.includes('HSE event data unavailable.'),'HSE event unavailable state is ambiguous.');
assert(lib.includes('p_immediate_control:p.immediateControl??null'),'HSE client does not pass immediate-control evidence.');
const pkg=JSON.parse(read('package.json'));
assert(pkg.scripts?.['verify:g19-hse'],'G-19 verifier is not registered.');
assert(pkg.scripts?.['test:g19-hse'],'G-19 regression command is not registered.');
assert(read('.github/workflows/ci.yml').includes('npm run verify:g19-hse'),'G-19 CI gate is missing.');
const manifest=read('supabase/MIGRATION_MANIFEST.md');
assert(manifest.includes(migrationName),'Migration manifest is missing G-19.');
assert(manifest.includes(`contains ${active.length} uniquely timestamped active migrations`),'Migration manifest active count is stale.');
if(failures.length){console.error('G-19 HSE SOURCE CERTIFICATION: FAIL');failures.forEach(x=>console.error('- '+x));process.exit(1)}
console.log('G-19 HSE SOURCE CERTIFICATION: PASS');
console.log(`Active migrations: ${active.length}; latest: ${active.at(-1)}`);
console.log('Immediate-control capture, irreversible closure gates, action evidence, site readiness fields, stale-data handling and CI registration: PASS');
