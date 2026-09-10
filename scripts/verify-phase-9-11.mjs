import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const required = [
  'supabase/migrations/20260910120000_catalogue_inventory_procurement_engine.sql',
  'src/pages/admin/products.tsx',
  'src/pages/admin/inventory.tsx',
  'src/pages/admin/warehouses.tsx',
  'src/pages/admin/suppliers.tsx',
  'src/hooks/use-data.ts',
];
for (const file of required) if (!fs.existsSync(path.join(root,file))) throw new Error(`Missing ${file}`);
const sql = fs.readFileSync(path.join(root,required[0]),'utf8');
for (const fn of ['adjust_product_stock','set_warehouse_stock','transfer_stock','receive_purchase_order_item','create_purchase_order','add_purchase_order_item']) {
  if (!sql.includes(`FUNCTION public.${fn}`)) throw new Error(`Missing RPC ${fn}`);
}
const checks = [
  ['src/pages/admin/inventory.tsx', "rpc('adjust_product_stock'"],
  ['src/pages/admin/warehouses.tsx', "rpc('set_warehouse_stock'"],
  ['src/hooks/use-data.ts', "rpc('transfer_stock'"],
  ['src/hooks/use-data.ts', "rpc('receive_purchase_order_item'"],
  ['src/hooks/use-data.ts', "rpc('create_purchase_order'"],
  ['src/hooks/use-data.ts', "rpc('add_purchase_order_item'"],
];
for (const [file, needle] of checks) if (!fs.readFileSync(path.join(root,file),'utf8').includes(needle)) throw new Error(`Missing wiring ${needle}`);
console.log('Phase 9–11 source verification passed.');
