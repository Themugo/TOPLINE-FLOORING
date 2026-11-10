import fs from 'node:fs';

const file = process.argv[2] ?? 'artifacts/g23-disaster-recovery/drill-evidence.json';
if (!fs.existsSync(file)) {
  console.error(`BLOCKED: evidence file not found: ${file}`);
  console.error('Copy docs/drill-evidence.template.json and populate it only from real provider/drill evidence.');
  process.exit(2);
}
const e = JSON.parse(fs.readFileSync(file, 'utf8'));
const fail = [];
const required = [
  'drill_id','source_project_ref','recovery_project_ref','provider_backup_reference',
  'backup_completed_at_utc','incident_declared_at_utc','recovery_point_at_utc',
  'restore_requested_at_utc','restore_completed_at_utc','service_restored_at_utc',
  'storage_backup_reference','storage_restore_reference','storage_manifest_reference',
  'database_validation_reference','application_smoke_test_reference',
  'operator','independent_observer','business_owner','approval_reference'
];
for (const key of required) if (typeof e[key] !== 'string' || !e[key].trim()) fail.push(`${key} is required.`);
if (e.source_project_ref !== 'cvjmfplhdlfvqnnmzqcp') fail.push('source_project_ref does not match canonical source.');
if (!/^[a-z0-9]{20}$/.test(e.recovery_project_ref || '') || e.recovery_project_ref === e.source_project_ref) fail.push('Recovery project must be a distinct valid project ref.');
if (!/^[a-f0-9]{40,64}$/i.test(e.tested_commit_sha || '')) fail.push('tested_commit_sha must be a Git SHA.');
const parse = key => Date.parse(e[key]);
const times = ['backup_completed_at_utc','incident_declared_at_utc','recovery_point_at_utc','restore_requested_at_utc','restore_completed_at_utc','service_restored_at_utc'];
for (const k of times) if (!Number.isFinite(parse(k)) || !/Z$/.test(e[k] || '')) fail.push(`${k} must be a valid UTC ISO timestamp ending in Z.`);
const num = key => Number.isFinite(e[key]) && e[key] >= 0;
for (const k of ['approved_target_rto_minutes','approved_target_rpo_minutes']) if (!num(k)) fail.push(`${k} must be an approved non-negative number.`);
if (times.every(k => Number.isFinite(parse(k)))) {
  const t0=parse('incident_declared_at_utc'), rp=parse('recovery_point_at_utc'), restored=parse('service_restored_at_utc');
  if (rp > t0) fail.push('Recovery point is after incident start; timeline invalid.');
  if (parse('restore_requested_at_utc') < t0 || parse('restore_completed_at_utc') < parse('restore_requested_at_utc') || restored < parse('restore_completed_at_utc')) fail.push('Restore/service timestamps are out of order.');
  const rpo=(t0-rp)/60000, rto=(restored-t0)/60000;
  if (num('measured_rpo_minutes') && Math.abs(e.measured_rpo_minutes-rpo)>1) fail.push(`Entered RPO differs from timestamp-derived RPO (${rpo.toFixed(2)} min).`);
  if (num('measured_rto_minutes') && Math.abs(e.measured_rto_minutes-rto)>1) fail.push(`Entered RTO differs from timestamp-derived RTO (${rto.toFixed(2)} min).`);
  if (rpo > e.approved_target_rpo_minutes) fail.push(`RPO target missed: ${rpo.toFixed(2)} > ${e.approved_target_rpo_minutes} minutes.`);
  if (rto > e.approved_target_rto_minutes) fail.push(`RTO target missed: ${rto.toFixed(2)} > ${e.approved_target_rto_minutes} minutes.`);
  e.measured_rpo_minutes=Number(rpo.toFixed(2));
  e.measured_rto_minutes=Number(rto.toFixed(2));
}
for (const k of ['database_restore_status','storage_restore_status','integrity_validation_status','application_smoke_test_status']) {
  if (!['PASS','FAIL'].includes(e[k])) fail.push(`${k} must be PASS or FAIL based on executed tests.`);
}
if (e.database_restore_status!=='PASS'||e.storage_restore_status!=='PASS'||e.integrity_validation_status!=='PASS'||e.application_smoke_test_status!=='PASS') fail.push('All four recovery validation statuses must PASS for a successful drill.');
if (fail.length) {
  console.error('G-23 DRILL EVIDENCE: FAIL / NOT CLOSED');
  fail.forEach(x=>console.error(`- ${x}`));
  process.exit(1);
}
console.log('G-23 DRILL EVIDENCE: STRUCTURALLY VALID');
console.log(`Measured RPO: ${e.measured_rpo_minutes} minutes (target ${e.approved_target_rpo_minutes})`);
console.log(`Measured RTO: ${e.measured_rto_minutes} minutes (target ${e.approved_target_rto_minutes})`);
console.log('Provider artifacts and owner sign-offs still require independent human inspection.');
