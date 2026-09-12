import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationsDir = path.join(root, 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
const errors = [];

if (files.length !== 40) errors.push(`Expected 40 active migrations, found ${files.length}.`);

const timestamps = files.map((f) => f.slice(0, 14));
const unique = new Set(timestamps);
if (unique.size !== timestamps.length) errors.push('Migration timestamps are not unique.');
for (let i = 1; i < timestamps.length; i += 1) {
  if (timestamps[i] <= timestamps[i - 1]) errors.push(`Migration ordering violation: ${files[i - 1]} -> ${files[i]}`);
}

const required = [
  '20260912160000_065_backup_export_operations_360.sql',
  '20260912170000_066_sales_project_lifecycle_360_hardening.sql',
  '20260912180000_067_communications_provider_response_360.sql',
];
for (const file of required) if (!files.includes(file)) errors.push(`Missing required canonical migration: ${file}`);

const tableCreators = new Map();
const functions = new Map();
for (const file of files) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-zA-Z0-9_]+)/gi)) tableCreators.set(m[1].toLowerCase(), file);
  for (const m of sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-zA-Z0-9_]+)/gi)) functions.set(m[1].toLowerCase(), file);
  if (/drop\s+schema\s+public\s+cascade/i.test(sql)) errors.push(`${file}: destructive DROP SCHEMA public CASCADE is forbidden.`);
  if (/security\s+definer/i.test(sql) && !/set\s+search_path\s*=\s*public(?:\s*,[^\n;]+)?/i.test(sql)) {
    errors.push(`${file}: SECURITY DEFINER functions must explicitly set search_path to public, pg_temp.`);
  }
}

const requiredRpcs = [
  'create_customer_order','convert_lead_to_customer','convert_quotation_to_order','create_site_visit',
  'transition_invoice_lifecycle','create_purchase_order','get_customer_portal_360','create_operational_data_export',
  'complete_communication_delivery_worker','record_provider_delivery_event_worker','record_inbound_communication_worker',
  'get_customer_communications_360'
];
for (const rpc of requiredRpcs) if (!functions.has(rpc)) errors.push(`Missing required production RPC: ${rpc}`);

const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
for (const forbidden of ['service_role','SUPABASE_SERVICE_ROLE_KEY']) {
  if (envExample.includes(forbidden)) errors.push(`.env.example contains forbidden credential name: ${forbidden}`);
}

if (errors.length) {
  console.error('Phase 33–35 database validation failed.');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Phase 33–35 database validation passed (${files.length} migrations, ${tableCreators.size} tables, ${functions.size} functions).`);
