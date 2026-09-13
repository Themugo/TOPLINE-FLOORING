import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const fail = (message) => { throw new Error(message); };
const migrationsDir = 'supabase/migrations';
const migrationFiles = readdirSync(migrationsDir).filter((f) => /^\d+.*\.sql$/.test(f)).sort();
if (!migrationFiles.length) fail('No active Supabase migrations found.');

const timestamps = migrationFiles.map((f) => f.match(/^\d+/)[0]);
if (new Set(timestamps).size !== timestamps.length) fail('Duplicate migration timestamps detected.');
for (let i = 1; i < timestamps.length; i++) if (timestamps[i] <= timestamps[i - 1]) fail(`Migration ordering is not strictly increasing: ${migrationFiles[i - 1]} -> ${migrationFiles[i]}`);

const forbidden = [/admin123/i, /ToplineSecure2024/i, /example\.com/i, /nirchkrkwtpobwtrkpgy/i, /service_role\s*[:=]\s*["'][^"']+["']/i];
for (const file of migrationFiles) {
  const text = readFileSync(path.join(migrationsDir, file), 'utf8');
  for (const pattern of forbidden) if (pattern.test(text)) fail(`${file}: forbidden legacy/placeholder/credential pattern ${pattern}`);
  if (/CREATE\s+POLICY/i.test(text) && !/ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(text)) fail(`${file}: policy definitions must be accompanied by explicit RLS enablement.`);
  if (/SECURITY\s+DEFINER/i.test(text) && !/SET\s+search_path/i.test(text)) fail(`${file}: SECURITY DEFINER function is missing an explicit search_path.`);
}

const required = [
  '20260910000000_topline_canonical_schema.sql',
  '20260910090000_032_commerce_contract_hardening.sql',
  '20260910100000_033_staff_rbac_audit_foundation.sql',
  '20260910110000_topline_rpc_contracts.sql',
  '20260910120000_catalogue_inventory_procurement_engine.sql',
  '20260910130000_customer_portal_security.sql',
  '20260910140000_sales_project_lifecycle.sql',
  '20260910150000_project_delivery_field_operations.sql',
  '20260910160000_finance_communications_analytics.sql',
  '20260910170000_customer_journey_notifications.sql',
  '20260912180000_067_communications_provider_response_360.sql',
  '20260912190000_068_finance_communications_analytics_360_hardening.sql',
  '20260912200000_069_reporting_operational_intelligence_360.sql',
];
for (const file of required) if (!migrationFiles.includes(file)) fail(`Missing required migration: ${file}`);

const readme = readFileSync('supabase/README.md', 'utf8');
for (const file of required) if (!readme.includes(file)) fail(`supabase/README.md does not document ${file}`);

if (!existsSync('supabase/config.toml')) fail('Missing supabase/config.toml');
const config = readFileSync('supabase/config.toml', 'utf8');
if (!config.includes('project_id = "zmbsskvnzjdaxuxlauyx"')) fail('Supabase config is not pinned to the Topline project.');

const securityTest = 'supabase/tests/security_regression.sql';
if (!existsSync(securityTest)) fail('Missing security regression SQL test.');
const security = readFileSync(securityTest, 'utf8');
for (const table of ['staff_profiles','staff_role_assignments','customers','orders','order_items','invoices','payments','communication_outbox','customer_communications']) {
  if (!security.includes(`'${table}'`)) fail(`Security regression test does not cover ${table}.`);
}
if (!/relrowsecurity/.test(security)) fail('Security regression test must assert RLS enablement.');
if (!/roles\s*@>\s*ARRAY\['anon'\]/.test(security)) fail('Security regression test must reject anonymous policies.');

const envExample = readFileSync('.env.example', 'utf8');
for (const key of ['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY']) if (!envExample.includes(key)) fail(`.env.example is missing ${key}`);
if (!envExample.includes('zmbsskvnzjdaxuxlauyx.supabase.co')) fail('Topline Supabase URL missing from environment contract.');
for (const secretFile of ['.env','.env.local','.env.production']) if (existsSync(secretFile)) fail(`${secretFile} must not be committed or packaged.`);
const gitignore = readFileSync('.gitignore','utf8');
if (!gitignore.includes('.env*')) fail('.gitignore must exclude environment files.');
if (!gitignore.includes('node_modules')) fail('.gitignore must exclude node_modules.');

const ci = readFileSync('.github/workflows/ci.yml','utf8');
if (!ci.includes('npm run verify:phases-30-32')) fail('CI must run the Phase 30-32 gate.');
if (!ci.includes('npm run verify:phase-14-ci-release-gate')) fail('CI must retain the Phase 14 release gate.');
if (/pull_request_target/i.test(ci)) fail('CI must not use pull_request_target.');
if (!/permissions:\s*\n\s+contents:\s+read/.test(ci)) fail('CI must retain read-only contents permission.');

console.log(`Phases 30-32 production verification passed (${migrationFiles.length} active migrations).`);
