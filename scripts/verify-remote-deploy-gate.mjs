import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrations = fs.readdirSync(path.join(root, 'supabase', 'migrations')).filter(f => f.endsWith('.sql')).sort();
const config = fs.readFileSync(path.join(root, 'supabase', 'config.toml'), 'utf8');
const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
const failures = [];

if (!config.includes('project_id = "jypkhvknfgoqrhwzbdwi"')) failures.push('supabase/config.toml is not pinned to the Topline project.');
if (!envExample.includes('jypkhvknfgoqrhwzbdwi.supabase.co')) failures.push('.env.example is not pinned to the Topline Supabase URL.');
if (migrations.length !== 20) failures.push(`Expected 20 active canonical migrations, found ${migrations.length}.`);
if (!migrations.every(f => /^2026\d{10}_.+\.sql$/.test(f))) failures.push('One or more active migration filenames do not use the canonical timestamp/name format.');

for (const file of migrations) {
  const sql = fs.readFileSync(path.join(root, 'supabase', 'migrations', file), 'utf8');
  if (/drop\s+schema\s+public/i.test(sql)) failures.push(`${file}: DROP SCHEMA public is forbidden.`);
  if (/admin123|ToplineSecure2024!/i.test(sql)) failures.push(`${file}: plaintext credential detected.`);
}

if (failures.length) {
  console.error('Remote deployment safety gate failed.');
  failures.forEach(f => console.error(`- ${f}`));
  process.exit(1);
}
console.log('Remote deployment safety gate passed. Safe next action: supabase link + db push --dry-run --linked.');
