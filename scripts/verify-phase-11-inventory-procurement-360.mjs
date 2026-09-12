import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'supabase/migrations/20260912140000_063_inventory_procurement_operations_360.sql',
  'src/lib/inventory-procurement-360.ts',
  'src/pages/admin/inventory-procurement-operations.tsx',
  'src/pages/admin/inventory.tsx',
  'src/pages/admin/suppliers.tsx',
  'src/pages/admin/warehouses.tsx',
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing ${file}`);
}

const sql = fs.readFileSync(path.join(root, required[0]), 'utf8');
for (const token of [
  'procurement_events',
  'create_supplier',
  'update_supplier',
  'transition_purchase_order_lifecycle',
  'add_purchase_order_item',
  'remove_purchase_order_item',
  'reconcile_inventory_procurement',
  'get_inventory_procurement_operations_360',
  'require_staff_permission',
]) {
  if (!sql.includes(token)) throw new Error(`Missing Phase 11 contract: ${token}`);
}

const versions = fs.readdirSync(path.join(root, 'supabase/migrations'))
  .filter(f => f.endsWith('.sql'))
  .map(f => f.split('_')[0]);
if (new Set(versions).size !== versions.length) throw new Error('Duplicate migration timestamps detected');

const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
if (!app.includes('InventoryProcurementOperations')) throw new Error('Phase 11 route import missing');
if (!app.includes("'/admin/inventory-procurement-operations'")) throw new Error('Phase 11 route missing');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.scripts?.['verify:phase-11-inventory-procurement-360']) {
  throw new Error('Phase 11 package script missing');
}

console.log(`Phase 11 Inventory & Procurement Operations 360 verification passed. ${versions.length} unique migrations.`);
