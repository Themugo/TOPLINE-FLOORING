import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const target = path.join(root, 'src', 'types', 'database.ts');
fs.mkdirSync(path.dirname(target), { recursive: true });

// Prefer the Supabase CLI executable already installed/available on PATH.
// This avoids Windows child-process failures when the project path contains
// shell metacharacters such as '&' (for example: TOPLINE FLOORING & ROOFING).
const cliCandidates = process.platform === 'win32'
  ? ['supabase.exe', 'supabase.cmd', 'supabase']
  : ['supabase'];
let output = null;
let lastError = null;
for (const command of cliCandidates) {
  try {
    output = execFileSync(command, ['gen', 'types', 'typescript', '--local'], { cwd: root, encoding: 'utf8' });
    break;
  } catch (error) {
    lastError = error;
  }
}
if (output === null) {
  const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  try {
    output = execFileSync(npxCommand, ['supabase', 'gen', 'types', 'typescript', '--local'], { cwd: root, encoding: 'utf8' });
  } catch (error) {
    throw lastError ?? error;
  }
}
fs.writeFileSync(target, output);
console.log(`Generated database types: ${target}`);
