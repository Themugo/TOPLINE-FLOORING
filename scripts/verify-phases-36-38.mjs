import { execFileSync } from 'node:child_process';

const commands = [
  ['verify:database-dependencies', 'Database dependency verification'],
  ['verify:generated-types', 'Generated database types verification'],
  ['verify:remote-deploy-gate', 'Remote deployment safety gate'],
];

for (const [script, label] of commands) {
  try {
    execFileSync('npm', ['run', script], { stdio: 'inherit', shell: process.platform === 'win32' });
  } catch {
    console.error(`${label} failed.`);
    process.exit(1);
  }
}
console.log('Phase 36–38 static verification passed.');
