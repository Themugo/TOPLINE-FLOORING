import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/admin/operations-command-center.tsx'), 'utf8');
const doc = fs.readFileSync(path.join(root, 'docs/PHASE_7_OPERATIONS_COMMAND_CENTER.md'), 'utf8');
const migrationDir = path.join(root, 'supabase/migrations');

const requiredTables = ['products', 'warehouses', 'suppliers', 'purchase_orders', 'projects', 'inventory_alerts', 'site_visits', 'installations'];
for (const table of requiredTables) {
  const files = fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql'));
  const found = files.some((f) => fs.readFileSync(path.join(migrationDir, f), 'utf8').includes(`public.${table}`));
  if (!found) throw new Error(`Canonical table not found in migrations: ${table}`);
}

const required = [
  "supabase.from('products')",
  "supabase.from('warehouses')",
  "supabase.from('suppliers')",
  "supabase.from('purchase_orders')",
  "supabase.from('projects')",
  "supabase.from('inventory_alerts')",
  "supabase.from('site_visits')",
  "supabase.from('installations')",
  '14 days',
  'No mock/demo operational data',
  'does not create duplicate inventory',
];
for (const token of required) {
  const source = token === 'No mock/demo operational data' || token === 'does not create duplicate inventory' ? doc : page;
  if (!source.includes(token)) throw new Error(`Missing Phase 7 contract: ${token}`);
}

if (!page.includes('setError') || !page.includes('Operations data could not be loaded')) throw new Error('Fail-closed error state missing');
if (!page.includes('Refresh')) throw new Error('Manual refresh control missing');

console.log('Phase 7 operations command center verification passed.');
