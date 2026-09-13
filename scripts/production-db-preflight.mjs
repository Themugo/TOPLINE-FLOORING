import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];
const projectRef = 'zmbsskvnzjdaxuxlauyx';

const env = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
if (!env.includes('VITE_SUPABASE_URL=https://zmbsskvnzjdaxuxlauyx.supabase.co')) errors.push('Canonical Topline Supabase URL is missing from .env.example.');
if (env.includes('service_role') || env.includes('SUPABASE_SERVICE_ROLE_KEY')) errors.push('Server-only service-role credential is exposed in .env.example.');

const workflows = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
if (!workflows.includes('npm run verify:phases-33-35')) errors.push('CI does not run the Phase 33–35 gate.');

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((f) => f.endsWith('.sql')).sort();
if (migrations.length < 40) errors.push(`Expected at least 40 active migrations, found ${migrations.length}.`);
if (migrations.some((f) => !/^\d{14}_[a-z0-9][a-z0-9_-]*\.sql$/.test(f))) errors.push('One or more migration filenames violate the production naming contract.');

const readme = fs.readFileSync(path.join(root, 'docs/PHASES_33_35_DATABASE_VALIDATION.md'), 'utf8');
if (!readme.includes(projectRef)) warnings.push('Phase documentation should retain the dedicated project reference.');

if (errors.length) {
  console.error('Production database preflight failed.');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('Production database preflight passed.');
for (const warning of warnings) console.warn(`WARN: ${warning}`);
