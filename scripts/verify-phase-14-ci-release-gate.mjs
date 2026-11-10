import fs from 'node:fs';
import path from 'node:path';
import { checkReleaseEnvironmentFiles } from './lib-release-environment-check.mjs';

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
    'npm run verify:phases-15-17',
    'npm run verify:operation-17-production-automation',
    'npm run verify:operation-18-theme-brand-governance',
    'npm run lint',
    'npm run typecheck',
    'npm run build',
    'actions/upload-artifact@v4',
    'timeout-minutes:',
    'concurrency:',
  ];
  for (const token of required) if (!workflow.includes(token)) failures.push(`CI workflow missing required contract: ${token}`);
  const replayStep = workflow.match(/- name: Local Supabase replay\n([\s\S]*?)(?=\n      - name:|\n\s*-$|$)/);
  if (!replayStep) failures.push('CI must define a dedicated Local Supabase replay step.');
  else {
    if (!/env:\n(?:[ \t]+.*\n)*[ \t]+TOPLINE_ALLOW_LOCAL_DB_RESET: ['\"]true['\"]/m.test(replayStep[1])) {
      failures.push('Local Supabase replay must explicitly opt in to disposable local reset.');
    }
    if (!/run: npm run validate:local-db/.test(replayStep[1])) {
      failures.push('Local Supabase replay must invoke the guarded local-only validator.');
    }
  }
  const resetOptIns = [...workflow.matchAll(/TOPLINE_ALLOW_LOCAL_DB_RESET\s*:/g)];
  if (resetOptIns.length !== 1) failures.push('Local reset opt-in must appear exactly once in CI.');
  if (/^\s{0,6}TOPLINE_ALLOW_LOCAL_DB_RESET\s*:/m.test(workflow)) {
    failures.push('Local reset opt-in must not be configured at workflow or job scope.');
  }
  if (/pull_request_target:/i.test(workflow)) failures.push('CI must not use pull_request_target.');
  if (!/permissions:\s*\n\s+contents:\s+read/m.test(workflow)) failures.push('CI must use least-privilege contents: read permissions.');
  const productionArtifact = workflow.match(/- name: Upload production build\n([\s\S]*?)(?=\n      - name:|$)/);
  const artifactIndex = productionArtifact ? workflow.indexOf(productionArtifact[0]) : -1;
  const lastVerificationIndex = Math.max(
    workflow.lastIndexOf('npm run verify:g21-deployment-reconciliation'),
    workflow.lastIndexOf('npm run verify:g20-workflow-register'),
    workflow.lastIndexOf('npm run verify:operation-18-theme-brand-governance'),
    workflow.lastIndexOf('npm run verify:phases-15-17'),
    workflow.lastIndexOf('npm run build'),
  );
  if (artifactIndex < 0 || artifactIndex < lastVerificationIndex) failures.push('Production build artifact must be uploaded only after all quality and architecture gates pass.');
  if (artifactIndex >= 0 && /\n\s+run: npm run/.test(workflow.slice(artifactIndex))) failures.push('No verification command may follow the production build artifact upload.');
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

const envCheck = checkReleaseEnvironmentFiles(root);
for (const note of envCheck.notes) console.warn(`NOTE ${note}`);
failures.push(...envCheck.failures);

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
