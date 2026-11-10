import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const fail = (message) => { console.error(`BLOCKED: ${message}`); process.exit(2); };
const required = (name) => { const v = process.env[name]?.trim(); if (!v) fail(`Missing required environment variable: ${name}`); return v; };
if (process.env.TOPLINE_DR_UAT_ENV !== 'staging') fail('TOPLINE_DR_UAT_ENV=staging is required. Production restore testing is prohibited.');
if (process.env.TOPLINE_ALLOW_DR_UAT !== 'true') fail('Set TOPLINE_ALLOW_DR_UAT=true only after approving an isolated recovery drill.');
const ref = required('TOPLINE_DR_STAGING_PROJECT_REF');
if (!/^[a-z0-9]{20}$/.test(ref)) fail('Staging project ref must be 20 lowercase alphanumeric characters.');
const config = fs.readFileSync('supabase/config.toml','utf8');
const canonical = config.match(/^project_id\s*=\s*"([a-z0-9]+)"/m)?.[1];
if (!canonical || ref === canonical) fail('Refusing the canonical production project.');
const evidencePath = path.resolve(process.env.TOPLINE_DR_EVIDENCE_FILE || 'artifacts/g111-disaster-recovery-uat/evidence.json');
if (!fs.existsSync(evidencePath)) fail(`Evidence file not found: ${evidencePath}`);
let e;
try { e = JSON.parse(fs.readFileSync(evidencePath,'utf8')); } catch { fail('Evidence file is not valid JSON.'); }
const requiredStrings = ['provider_backup_reference','backup_completed_at','restore_environment_reference','restore_started_at','restore_completed_at','restore_validation_reference','storage_backup_reference','storage_restore_reference','database_validation_reference','tested_commit_sha'];
for (const key of requiredStrings) if (typeof e[key] !== 'string' || !e[key].trim()) fail(`Evidence field ${key} is required.`);
if (e.project_ref !== ref) fail('Evidence project_ref does not match the selected staging project.');
if (!/^[a-f0-9]{40,64}$/i.test(e.tested_commit_sha)) fail('tested_commit_sha must be a Git SHA.');
for (const key of ['measured_rto_minutes','measured_rpo_minutes','target_rto_minutes','target_rpo_minutes']) if (!Number.isFinite(e[key]) || e[key] < 0) fail(`${key} must be a non-negative number.`);
if (e.measured_rto_minutes > e.target_rto_minutes) fail('Measured RTO exceeds the approved target.');
if (e.measured_rpo_minutes > e.target_rpo_minutes) fail('Measured RPO exceeds the approved target.');
const dates = ['backup_completed_at','restore_started_at','restore_completed_at'].map(k => Date.parse(e[k]));
if (dates.some(Number.isNaN) || dates[2] < dates[1]) fail('Backup/restore timestamps are invalid or out of order.');
const hash = crypto.createHash('sha256').update(fs.readFileSync(evidencePath)).digest('hex');
const outDir = path.resolve('artifacts/g111-disaster-recovery-uat');
fs.mkdirSync(outDir,{recursive:true});
const summary = {
  status: 'EVIDENCE_VALIDATED_NOT_INDEPENDENTLY_VERIFIED',
  scope: 'staging-only disaster recovery evidence package',
  project_ref: ref,
  tested_commit_sha: e.tested_commit_sha,
  measured_rto_minutes: e.measured_rto_minutes,
  target_rto_minutes: e.target_rto_minutes,
  measured_rpo_minutes: e.measured_rpo_minutes,
  target_rpo_minutes: e.target_rpo_minutes,
  provider_backup_reference: e.provider_backup_reference,
  restore_environment_reference: e.restore_environment_reference,
  restore_validation_reference: e.restore_validation_reference,
  database_validation_reference: e.database_validation_reference,
  storage_backup_reference: e.storage_backup_reference,
  storage_restore_reference: e.storage_restore_reference,
  evidence_file_sha256: hash,
  sanitized: true,
  note: 'This validator checks completeness and target thresholds only. A reviewer must independently inspect provider backup/restore records and validation evidence.'
};
fs.writeFileSync(path.join(outDir,'uat-summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(`Evidence package structurally validated. SHA-256 ${hash}`);
console.log('STATUS: EVIDENCE_VALIDATED_NOT_INDEPENDENTLY_VERIFIED');
