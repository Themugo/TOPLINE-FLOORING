import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const workflowPath = '.github/workflows/ci.yml';
if (!exists(workflowPath)) failures.push('Missing .github/workflows/ci.yml');
else {
  const workflow = read(workflowPath);
  const required = [
    'actions/checkout@v4',
    'actions/setup-node@v4',
    'node-version: 22',
    'cache: npm',
    'npm ci',
    'npm run verify:doctor',
    'npm run verify:migration-integrity',
    'npm run verify:release-candidate',
    'npm run verify:phase-14-ci-release-gate',
    'npm run lint',
    'npm run typecheck',
    'npm run build',
    'actions/upload-artifact@v4',
    'timeout-minutes:',
    'concurrency:',
  ];
  for (const token of required) if (!workflow.includes(token)) failures.push(`CI workflow missing required contract: ${token}`);
  if (/pull_request_target:/i.test(workflow)) failures.push('CI must not use pull_request_target.');
  if (!/permissions:\s*\n\s+contents:\s+read/m.test(workflow)) failures.push('CI must use least-privilege contents: read permissions.');
}

const pkg = JSON.parse(read('package.json'));
for (const script of [
  'verify:phase-14-ci-release-gate',
  'verify:doctor',
  'verify:migration-integrity',
  'verify:release-candidate',
]) {
  if (!pkg.scripts?.[script]) failures.push(`package.json is missing ${script}`);
}
if (!exists('package-lock.json')) failures.push('package-lock.json is required for deterministic npm ci.');
if (pkg.engines?.node !== '22.x') failures.push('package.json engines.node must remain pinned to 22.x.');

const migrationsDir = path.join(root, 'supabase', 'migrations');
const migrations = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
const versions = migrations.map((f) => f.match(/^(\d{14})_/)?.[1]);
if (versions.some((v) => !v)) failures.push('Every active migration must begin with a 14-digit timestamp.');
if (new Set(versions).size !== versions.length) failures.push('Duplicate active migration timestamps detected.');
for (let i = 1; i < versions.length; i++) {
  if (versions[i - 1] >= versions[i]) failures.push(`Migration ordering is not strictly increasing: ${migrations[i - 1]} -> ${migrations[i]}`);
}

const forbiddenFiles = ['.env', '.env.local', '.env.production'];
for (const file of forbiddenFiles) if (exists(file)) failures.push(`Secret-bearing local environment file must not be committed: ${file}`);

const workflow = read(workflowPath);
if (/SUPABASE_SERVICE_ROLE_KEY\s*[:=]/i.test(workflow)) failures.push('CI workflow must not hard-code service-role credentials.');
if (/BEGIN PRIVATE KEY|ghp_[A-Za-z0-9]{20,}|sk_live_[A-Za-z0-9]{12,}/.test(workflow)) failures.push('Potential credential material detected in CI workflow.');

if (failures.length) {
  console.error('Phase 14 CI / Release Gate FAILED.');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Phase 14 CI / Release Gate source verification PASSED.');
console.log(`- Active migrations: ${migrations.length}`);
console.log('- Node/npm toolchain: Node 22 + npm ci');
console.log('- CI permissions: contents: read');
console.log('- Frontend gate: lint + typecheck + build');
console.log('- Release gate: architecture, migration and production contracts');
