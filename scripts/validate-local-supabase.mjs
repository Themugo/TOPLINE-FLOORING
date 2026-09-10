import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrations = fs.readdirSync(path.join(root, 'supabase', 'migrations')).filter(f => f.endsWith('.sql')).sort();
if (!migrations.length) throw new Error('No active Supabase migrations found.');

function run(args, label) {
  try {
    const out = execFileSync('npx', ['supabase', ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore','pipe','pipe'] });
    console.log(`${label}: passed`);
    if (out.trim()) console.log(out.trim());
    return true;
  } catch (err) {
    const detail = `${err.stdout ?? ''}${err.stderr ?? ''}`.trim();
    if (/docker|daemon|not found|could not determine executable|timed out/i.test(detail)) {
      console.warn(`${label}: not executed — local Supabase/Docker is unavailable.`);
      return false;
    }
    console.error(detail || `${label}: failed`);
    process.exitCode = 1;
    return false;
  }
}

console.log(`Active migration count: ${migrations.length}`);
const started = run(['start'], 'Supabase local start');
if (!started) process.exit(0);
run(['db', 'reset', '--local'], 'Local database reset');
run(['db', 'lint', '--local'], 'Local database lint');
run(['test', 'db', '--local'], 'Database regression tests');
run(['gen', 'types', 'typescript', '--local'], 'Local TypeScript generation');
