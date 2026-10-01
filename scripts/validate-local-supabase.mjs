import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationsDir = path.join(root, 'supabase', 'migrations');
const typesTarget = path.join(root, 'src', 'types', 'database.ts');
const migrations = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
if (new Set(migrations.map((f) => f.match(/^\d+/)[0])).size !== migrations.length) throw new Error('Duplicate migration timestamps detected.');

const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run(args, label) {
  try {
    const commandArgs = ['supabase', ...args];
    let out;
    try {
      out = execFileSync(npxCommand, commandArgs, { cwd: root, encoding: 'utf8', stdio: ['ignore','pipe','pipe'] });
    } catch (error) {
      if (process.platform !== 'win32' || error?.code !== 'EINVAL') throw error;
      // Windows can reject execFileSync('npx.cmd', ...) when the project path contains '&'.
      // Fall back to the command shell; the command and arguments are fixed, not user input.
      out = execSync([npxCommand, ...commandArgs].join(' '), { cwd: root, encoding: 'utf8', stdio: ['ignore','pipe','pipe'], shell: true });
    }
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
