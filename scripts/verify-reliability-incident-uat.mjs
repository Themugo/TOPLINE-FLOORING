import fs from 'node:fs';
const failures=[]; const check=(name,ok)=>{if(!ok)failures.push(name);};
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const ci=fs.readFileSync('.github/workflows/ci.yml','utf8');
const runner=fs.readFileSync('scripts/validate-reliability-incident-uat.mjs','utf8');
const docs=fs.readFileSync('docs/RELIABILITY-REAL-INCIDENT-ALERT-AND-RECOVERY-UAT-2026-11-07.md','utf8');
const template=JSON.parse(fs.readFileSync('artifacts-reliability-incident-evidence-template.json','utf8'));
check('package UAT command',pkg.scripts?.['uat:reliability-incident']==='node scripts/validate-reliability-incident-uat.mjs');
check('CI syntax gate',ci.includes('node --check scripts/validate-reliability-incident-uat.mjs'));
for(const token of ["TOPLINE_INCIDENT_UAT_ENV !== 'staging'","TOPLINE_ALLOW_INCIDENT_UAT !== 'true'",'canonical production project','alert_delivery_reference','incident_acknowledged_at','incident_mitigated_at','incident_resolved_at','recovery_restore_validated','storage_restore_validated','business_smoke_test_passed','measured_rto_minutes','measured_rpo_minutes','createHash']) check(`runner contract ${token}`,runner.includes(token));
for(const token of ['provider-side monitor','Alert delivered','isolated recovery project','object storage separately','pre-approved targets','not independently verified']) check(`runbook ${token}`,docs.toLowerCase().includes(token.toLowerCase()));
check('template includes required staging identity',typeof template.project_ref==='string' && typeof template.tested_commit_sha==='string');
check('template defaults evidence flags to false',template.alert_delivery_confirmed===false && template.recovery_restore_validated===false && template.storage_restore_validated===false && template.business_smoke_test_passed===false);
if(failures.length){console.error(`Reliability incident UAT verifier FAILED: ${failures.length}`);failures.forEach(x=>console.error(`- ${x}`));process.exit(1)}
console.log('Reliability real incident alert & recovery UAT source contract: PASS (20 checks)');
