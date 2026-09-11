import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const vercelJson = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));

const failures = [];
const checks = [];

function check(condition, message) {
  if (!condition) failures.push(message);
  else checks.push(message);
}

check(packageJson.type === 'module', 'package.json uses ESM mode');
check(packageJson.engines?.node === '22.x', 'Vercel Node runtime is pinned to 22.x');
check(packageJson.scripts?.build === 'vite build', 'production build script delegates to the Vite CLI');
check(vercelJson.buildCommand === 'npm run build', 'Vercel delegates the build to package.json');
check(vercelJson.outputDirectory === 'dist', 'Vercel serves the Vite dist directory');
check(vercelJson.framework === 'vite', 'Vercel framework is explicitly Vite');
check(fs.existsSync(path.join(root, 'vite.config.ts')), 'vite.config.ts exists');
check(fs.existsSync(path.join(root, 'index.html')), 'index.html exists');
check(fs.existsSync(path.join(root, 'src', 'main.tsx')), 'src/main.tsx exists');
check(!JSON.stringify(vercelJson).includes('node_modules/vite/bin/vite.js'), 'Vercel config does not hard-code an internal node_modules Vite path');

if (failures.length) {
  console.error('Vercel deployment verification FAILED.');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Vercel deployment verification PASSED.');
for (const message of checks) console.log(`- ${message}`);
