import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const migrationsDir = path.join(root, 'supabase', 'migrations');
const migrations = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
const expected = [
  '20260912170000_066_sales_project_lifecycle_360_hardening.sql',
  '20260912180000_067_communications_provider_response_360.sql',
  '20260912190000_068_finance_communications_analytics_360_hardening.sql',
  '20260912200000_069_reporting_operational_intelligence_360.sql',
];
const failures = [];

if (migrations.length < 73) failures.push(`Expected at least 73 active migrations, found ${migrations.length}.`);
for (const file of expected) if (!migrations.includes(file)) failures.push(`Missing required late-stage migration: ${file}`);
for (let i = 1; i < migrations.length; i += 1) if (migrations[i - 1] >= migrations[i]) failures.push(`Migration order is not strictly increasing at ${migrations[i]}.`);

const scripts = [
  ['verify:database-dependencies', 'Database dependency contract'],
  ['verify:generated-types', 'Generated type contract'],
  ['verify:remote-deploy-gate', 'Remote deployment safety gate'],
];
for (const [script, label] of scripts) {
  const verifier = {
    'verify:database-dependencies': 'verify-database-dependencies.mjs',
    'verify:generated-types': 'verify-generated-types.mjs',
    'verify:remote-deploy-gate': 'verify-remote-deploy-gate.mjs',
  }[script];
  try {
    execFileSync(process.execPath, [path.join(root, 'scripts', verifier)], { cwd: root, stdio: 'inherit' });
  } catch {
    failures.push(`${label} failed.`);
  }
}

const docs = fs.readFileSync(path.join(root, 'docs', 'PHASES_36_38_DATABASE_RECONCILIATION.md'), 'utf8');
for (const requiredText of ['73 active migrations', '142 tables', '213 functions', 'db push --dry-run --linked', 'Never run `supabase db reset --linked`']) {
  if (!docs.includes(requiredText)) failures.push(`Phase 36–38 documentation is missing: ${requiredText}`);
}

if (failures.length) {
  console.error('Phases 36–38 verification failed.');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Phases 36–38 Database Reconciliation & Deployment Safety 360 passed.');
