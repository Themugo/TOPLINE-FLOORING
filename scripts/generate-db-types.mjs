import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const target = path.join(root, 'src', 'types', 'database.ts');
const args = ['gen', 'types', 'typescript', '--local'];
fs.mkdirSync(path.dirname(target), { recursive: true });

function run(command, commandArgs) {
  return execFileSync(command, commandArgs, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
}

let output;
let directError;

// Prefer a directly installed Supabase CLI. This avoids npm/npx child-process
// resolution problems on Windows when the repository path contains '&'.
try {
  output = run(process.platform === 'win32' ? 'supabase.exe' : 'supabase', args);
} catch (error) {
  directError = error;
}

if (!output) {
  const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  try {
    output = run(npxCommand, ['supabase', ...args]);
  } catch (error) {
    if (process.platform === 'win32') {
      // Last-resort shell fallback for Windows installations where the CLI is
      // available through npx but direct executable resolution is unavailable.
      // The command is fixed; repository contents are never interpolated.
      try {
        output = execSync(`npx supabase ${args.join(' ')}`, {
          cwd: root,
          encoding: 'utf8',
          windowsHide: true,
          shell: true,
        });
      } catch (shellError) {
        const detail = shellError?.stderr?.toString?.().trim() ||
          error?.stderr?.toString?.().trim() ||
          directError?.stderr?.toString?.().trim() ||
          shellError?.message || error?.message || directError?.message || 'unknown error';
        throw new Error(
          `Supabase database type generation could not run from this project path. ${detail}\n` +
          'If this is a Windows path containing &, map the project to a drive letter (for example: subst T: "C:\\Users\\hp\\Desktop\\TOPLINE FLOORING & ROOFING") and rerun npm run db:types.'
        );
      }
    } else {
      const detail = error?.stderr?.toString?.().trim() || directError?.stderr?.toString?.().trim() || error?.message || 'unknown error';
      throw new Error(`Supabase database type generation failed: ${detail}`);
    }
  }
}

if (!output || !/export\s+type\s+Database\s*=/.test(output)) {
  throw new Error('Supabase CLI returned no recognizable Database type output. Ensure the local Supabase database is running and migrated.');
}

fs.writeFileSync(target, output);
console.log(`Generated database types: ${target}`);
