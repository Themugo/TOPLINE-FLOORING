import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const projectRef = 'jypkhvknfgoqrhwzbdwi';
const migrationDir = path.join(root, 'supabase', 'migrations');
const migrations = fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql')).sort();
const failures = [];

const config = fs.readFileSync(path.join(root, 'supabase', 'config.toml'), 'utf8');
const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
const deployment = fs.readFileSync(path.join(root, 'DEPLOYMENT.md'), 'utf8');
const migrationManifest = fs.readFileSync(path.join(root, 'supabase', 'MIGRATION_MANIFEST.md'), 'utf8');

if (!config.includes(`project_id = "${projectRef}"`)) failures.push('supabase/config.toml is not pinned to the dedicated Topline project.');
if (!envExample.includes(`VITE_SUPABASE_URL=https://${projectRef}.supabase.co`)) failures.push('.env.example is not pinned to the dedicated Topline Supabase URL.');
if (envExample.includes('SUPABASE_SERVICE_ROLE_KEY') || /service[_-]?role\s*=/i.test(envExample)) failures.push('Server-only service-role credential appears in .env.example.');
if (migrations.length < 40) failures.push(`Expected at least 40 active migrations, found ${migrations.length}.`);
if (new Set(migrations.map((f) => f.match(/^\d+/)?.[0])).size !== migrations.length) failures.push('Duplicate active migration timestamps detected.');
if (!migrations.every((f) => /^\d{14}_[a-z0-9][a-z0-9_-]*\.sql$/.test(f))) failures.push('One or more active migration filenames violate the production naming contract.');
if (!deployment.includes('db push --dry-run --linked')) failures.push('DEPLOYMENT.md must document the linked dry-run gate before deployment.');
if (!migrationManifest.includes('db push --dry-run --linked')) failures.push('Migration manifest must document the linked dry-run gate.');

for (const file of migrations) {
  const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
  if (/drop\s+schema\s+public/i.test(sql)) failures.push(`${file}: DROP SCHEMA public is forbidden.`);
  if (/admin123|ToplineSecure2024!/i.test(sql)) failures.push(`${file}: plaintext credential detected.`);
  if (/supabase_service_role_key|service_role_key/i.test(sql)) failures.push(`${file}: service-role credential identifier found in active migration.`);
}

const executableFiles = [
  ...fs.readdirSync(path.join(root, 'scripts')).filter((f) => f.endsWith('.mjs') && f !== 'verify-remote-deploy-gate.mjs' && f !== 'verify-phases-36-38.mjs').map((f) => path.join(root, 'scripts', f)),
  ...fs.readdirSync(root).filter((f) => f.endsWith('.cmd')).map((f) => path.join(root, f)),
];
for (const file of executableFiles) {
  const text = fs.readFileSync(file, 'utf8');
  if (/supabase\s+db\s+reset\s+--linked/i.test(text)) failures.push(`${path.relative(root, file)}: linked remote reset is forbidden in executable tooling.`);
}

if (failures.length) {
  console.error('Remote deployment safety gate failed.');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Remote deployment safety gate passed (${migrations.length} active migrations, project ${projectRef}).`);
