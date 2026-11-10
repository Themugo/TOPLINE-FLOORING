import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'release-evidence', 'G-23');
const registerPath = path.join(dir, 'release-evidence-register.json');
const failures = [];
const migrationsDir = path.join(root, 'supabase', 'migrations');
const sourceMigrationCount = fs.readdirSync(migrationsDir).filter(name => /^\d{14}_.+\.sql$/.test(name)).length;
const register = JSON.parse(fs.readFileSync(registerPath, 'utf8'));
const ids = new Set();
const allowed = new Set(['PENDING', 'VERIFIED', 'BLOCKED']);
for (const item of register.criteria ?? []) {
  if (!item.id || ids.has(item.id)) failures.push(`Missing or duplicate criterion id: ${item.id ?? '(blank)'}`);
  ids.add(item.id);
  if (!allowed.has(item.status)) failures.push(`${item.id}: unsupported status ${item.status}`);
  if (item.status === 'VERIFIED') {
    if (!item.evidence_file || !item.evidence_summary || !item.verified_by || !item.verified_at_utc) {
      failures.push(`${item.id}: VERIFIED requires evidence_file, evidence_summary, verified_by and verified_at_utc.`);
      continue;
    }
    const resolved = path.resolve(dir, item.evidence_file);
    if (!resolved.startsWith(`${path.resolve(dir)}${path.sep}`)) {
      failures.push(`${item.id}: evidence path escapes the G-23 evidence directory.`);
      continue;
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile() || fs.statSync(resolved).size === 0) {
      failures.push(`${item.id}: evidence file is missing or empty (${item.evidence_file}).`);
    }
  }
}
if (register.canonical?.supabase_project_ref !== 'cvjmfplhdlfvqnnmzqcp') failures.push('Canonical Supabase project reference mismatch.');
if (register.canonical?.source_migration_count !== sourceMigrationCount) {
  failures.push(`Evidence register migration count ${register.canonical?.source_migration_count ?? '(missing)'} does not match ${sourceMigrationCount} active source migrations.`);
}
if (!Number.isInteger(sourceMigrationCount) || sourceMigrationCount < 1) failures.push('Unable to derive active source migration count.');
if (register.release_status !== 'NOT_CERTIFIED' && register.criteria.some(x => x.status !== 'VERIFIED')) {
  failures.push('Release status cannot advance while mandatory criteria remain unverified.');
}
if (failures.length) {
  console.error('G-23 EVIDENCE REGISTER: FAIL');
  failures.forEach(x => console.error(`- ${x}`));
  process.exit(1);
}
const verified = register.criteria.filter(x => x.status === 'VERIFIED').length;
const pending = register.criteria.filter(x => x.status === 'PENDING').length;
const blocked = register.criteria.filter(x => x.status === 'BLOCKED').length;
console.log('G-23 EVIDENCE REGISTER: STRUCTURE PASS');
console.log(`Verified ${verified}/${register.criteria.length}; pending ${pending}; blocked ${blocked}.`);
console.log('Release decision: NOT CERTIFIED — external evidence and approvals remain outstanding.');
