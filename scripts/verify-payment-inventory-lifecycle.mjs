import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sql = fs.readFileSync(path.join(root, 'supabase/migrations/20260911170000_049_payment_inventory_lifecycle_hardening.sql'), 'utf8');
const checks = [
  'Payment exceeds outstanding order balance',
  'Order stock reservation is no longer available',
  'Paid or partially paid orders require payment/refund handling before cancellation',
  'WHERE id=p_order_id FOR UPDATE',
  'provider_transaction_id',
  "status='converted'",
  'REVOKE EXECUTE ON FUNCTION public.record_order_payment_transaction',
];
for (const check of checks) if (!sql.includes(check)) throw new Error(`Lifecycle hardening check failed: ${check}`);
console.log('Topline payment/inventory lifecycle verification passed.');
