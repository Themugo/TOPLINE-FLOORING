import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = 'supabase/migrations';
const files = readdirSync(root).filter((f) => /^\d+.*\.sql$/.test(f)).sort();
if (!files.length) throw new Error('No active Supabase migrations found.');

const timestamps = files.map((f) => f.match(/^\d+/)[0]);
if (new Set(timestamps).size !== timestamps.length) throw new Error('Duplicate migration timestamps detected.');

const forbidden = [
  /admin123/i,
  /ToplineSecure2024/i,
  /example\.com/i,
  /nirchkrkwtpobwtrkpgy/i,
];
for (const file of files) {
  const text = readFileSync(path.join(root, file), 'utf8');
  for (const pattern of forbidden) {
    if (pattern.test(text)) throw new Error(`${file}: forbidden legacy/placeholder value ${pattern}`);
  }
  if (/CREATE\s+POLICY/i.test(text) && !/ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(text)) {
    throw new Error(`${file}: policy definitions must be accompanied by explicit RLS enablement.`);
  }
  if (/SECURITY\s+DEFINER/i.test(text) && !/SET\s+search_path/i.test(text)) {
    throw new Error(`${file}: SECURITY DEFINER function is missing an explicit search_path.`);
  }
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
];
for (const file of required) if (!files.includes(file)) throw new Error(`Missing canonical migration: ${file}`);

const readme = readFileSync('supabase/README.md', 'utf8');
for (const file of required) if (!readme.includes(file)) throw new Error(`supabase/README.md does not document ${file}`);

if (!existsSync('supabase/config.toml')) throw new Error('Missing supabase/config.toml');
const config = readFileSync('supabase/config.toml', 'utf8');
if (!config.includes('project_id = "zmbsskvnzjdaxuxlauyx"')) throw new Error('Supabase config is not pinned to the Topline project.');

console.log(`Database contract verification passed (${files.length} active migrations).`);
