import fs from 'node:fs';
const workflow = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const failures = [];
const required = [
  ['Node 22 setup', /node-version: 22/],
  ['lockfile-based npm cache', /cache-dependency-path: package-lock\.json/],
  ['clean reproducible dependency install', /run: npm ci/],
  ['frontend environment evidence', /record-frontend-certification\.mjs/],
  ['standalone ESLint step', /name: Frontend lint \(ESLint\)[\s\S]*?run: npm run lint/],
  ['standalone TypeScript step', /name: Frontend TypeScript certification[\s\S]*?run: npm run typecheck/],
  ['standalone production build step', /name: Frontend production build \(Vite\)[\s\S]*?run: npm run build/],
  ['always-uploaded frontend evidence', /name: Upload frontend certification evidence[\s\S]*?if: always\(\)/],
];
for (const [label, pattern] of required) if (!pattern.test(workflow)) failures.push(`Missing ${label}`);
for (const [name, command] of [['lint', 'npm run lint'], ['typecheck', 'npm run typecheck'], ['build', 'npm run build']]) {
  if (!pkg.scripts[name]) failures.push(`package.json missing ${name} script`);
}
for (const file of ['scripts/record-frontend-certification.mjs', 'package-lock.json']) {
  if (!fs.existsSync(file)) failures.push(`Missing ${file}`);
}
if (failures.length) {
  console.error('G-04 frontend build CI verifier FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('G-04 frontend build CI verifier PASSED (npm ci, lint, TypeScript, Vite build and evidence upload are explicit).');
