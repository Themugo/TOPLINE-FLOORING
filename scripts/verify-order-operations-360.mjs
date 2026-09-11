import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const types = fs.readFileSync(path.join(root, 'src/lib/types.ts'), 'utf8');
const rpc = fs.readFileSync(path.join(root, 'supabase/migrations/20260912020000_058_authorization_order_operations_360.sql'), 'utf8');
const operations = fs.readFileSync(path.join(root, 'src/lib/order-operations.ts'), 'utf8');
const ordersPage = fs.readFileSync(path.join(root, 'src/pages/admin/orders.tsx'), 'utf8');

const checks = [
  ['Order type includes canonical order_number', /export interface Order\s*\{[\s\S]*?order_number:\s*string \| null;/],
  ['058 RPC returns the complete orders row', /'order',\s*to_jsonb\(v_order\)/],
  ['frontend Order Operations 360 uses the shared Order type', /OrderOperations360.*order:\s*Order/],
  ['admin order operations view reads order_number from the shared contract', /order360\.order\.order_number/],
];

for (const [label, pattern] of checks) {
  if (!pattern.test(label.includes('frontend Order') ? operations : label.includes('admin order') ? ordersPage : label.includes('058 RPC') ? rpc : types)) {
    console.error(`FAIL: ${label}`);
    process.exit(1);
  }
}

console.log('Order Operations 360 type contract verification PASSED.');
for (const [label] of checks) console.log(`- ${label}`);
