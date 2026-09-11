import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationsDir = path.join(root, 'supabase', 'migrations');
const typesTarget = path.join(root, 'src', 'types', 'database.ts');
const migrations = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
if (migrations.length !== 23) throw new Error(`Expected 23 active migrations, found ${migrations.length}.`);

const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run(args, label) {
  try {
    const out = execFileSync(npxCommand, ['supabase', ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore','pipe','pipe'] });
    console.log(`${label}: passed`);
    if (out.trim()) console.log(out.trim());
    return out;
  } catch (err) {
    const detail = `${err.stdout ?? ''}${err.stderr ?? ''}`.trim();
    throw new Error(`${label}: failed\n${detail}`);
  }
}

console.log(`Active migration count: ${migrations.length}`);
run(['start'], 'Supabase local start');
run(['db', 'reset', '--local'], 'Local database reset');
run(['db', 'lint', '--local'], 'Local database lint');
run(['test', 'db', '--local'], 'Database regression tests');
const types = run(['gen', 'types', 'typescript', '--local'], 'Local TypeScript generation');
fs.mkdirSync(path.dirname(typesTarget), { recursive: true });
fs.writeFileSync(typesTarget, types);
console.log(`Generated database types: ${typesTarget}`);
