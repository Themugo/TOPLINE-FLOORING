import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = fileURLToPath(new URL('.', import.meta.url));
const files = (await readdir(root))
  .filter((name) =>
    name.startsWith('verify-') &&
    name.endsWith('.mjs') &&
    name !== 'verify-all.mjs' &&
    name !== 'verify-payment-provider-uat.mjs'
  )
  .sort();

const results = [];
for (const file of files) {
  const child = spawn(process.execPath, [join(root, file)], {
    stdio: 'inherit',
    cwd: join(root, '..'),
    windowsHide: false,
  });
  const code = await new Promise((resolve) => child.on('close', resolve));
  results.push({ file, passed: code === 0 });
}

const failed = results.filter((result) => !result.passed);
console.log(`Verification summary: ${results.length - failed.length}/${results.length} passed, ${failed.length} failed.`);
if (failed.length) {
  for (const result of failed) console.error(`- ${result.file}`);
  process.exit(1);
}
