import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationsDir = path.join(root, 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
const versionPattern = /^(\d{14})_/;
const entries = files.map((file) => {
  const match = file.match(versionPattern);
  if (!match) throw new Error(`Migration filename has invalid timestamp: ${file}`);
  return { file, version: match[1] };
});
const byVersion = new Map();
for (const entry of entries) {
  const list = byVersion.get(entry.version) ?? [];
  list.push(entry.file);
  byVersion.set(entry.version, list);
}
const duplicates = [...byVersion.entries()].filter(([, names]) => names.length > 1);
if (duplicates.length) {
  console.error('Duplicate migration timestamps:');
  for (const [version, names] of duplicates) console.error(`  ${version}: ${names.join(', ')}`);
  throw new Error('Migration timestamp uniqueness check failed');
}
for (let i = 1; i < entries.length; i++) {
  if (entries[i - 1].version >= entries[i].version) throw new Error(`Migration ordering is not strictly increasing: ${entries[i - 1].file} -> ${entries[i].file}`);
}
const required = [
  '20260910120000_catalogue_inventory_procurement_engine.sql',
  '20260912130100_062_sales_crm_360.sql',
  '20260912130000_062_finance_billing_operations_360.sql',
  '20260912140000_063_inventory_procurement_operations_360.sql',
  '20260912150000_064_customer_portal_360.sql',
  '20260912160000_065_backup_export_operations_360.sql',
];
for (const file of required) if (!files.includes(file)) throw new Error(`Required migration missing: ${file}`);
const routeSource = fs.readFileSync(path.join(root, 'src', 'App.tsx'), 'utf8');
for (const route of ['/admin/inventory-procurement-operations', '/admin/customer-portal-operations']) {
  if (!routeSource.includes(route)) throw new Error(`Missing application route: ${route}`);
}
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const script of ['verify:phase-11-inventory-procurement-360', 'verify:phase-12-customer-portal-360', 'verify:phase-13-backup-export-360']) {
  if (!packageJson.scripts?.[script]) throw new Error(`Missing package script: ${script}`);
}
console.log(`Clean project integrity passed: ${files.length} migrations, ${new Set(entries.map((e) => e.version)).size} unique timestamps.`);
