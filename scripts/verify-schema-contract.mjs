import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const dir = path.join(root, 'supabase', 'migrations');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
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
  '20260910170000_customer_journey_notifications.sql'
];
const missing = required.filter(f => !files.includes(f));
if (missing.length) throw new Error(`Missing canonical migrations: ${missing.join(', ')}`);
if (files.some((f,i) => i && files[i-1] >= f)) throw new Error('Migration filenames are not strictly ordered.');
for (const file of files) {
  const sql = fs.readFileSync(path.join(dir,file),'utf8');
  if (/\bDROP\s+SCHEMA\s+public\b/i.test(sql)) throw new Error(`Destructive DROP SCHEMA found in ${file}`);
  for (const m of sql.matchAll(/SECURITY\s+DEFINER[\s\S]{0,300}?LANGUAGE\s+plpgsql[\s\S]{0,300}?AS\s+\$\$/gi)) {
    if (!/search_path\s*=\s*[^\n]+/i.test(m[0])) throw new Error(`SECURITY DEFINER function without explicit search_path in ${file}`);
  }
}
console.log(`Schema contract verification passed (${files.length} active migrations).`);
