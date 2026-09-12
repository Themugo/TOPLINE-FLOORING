import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationDir = path.join(root, 'supabase', 'migrations');
const files = fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql')).sort();

if (files.length !== 28) throw new Error(`Expected 28 active migrations, found ${files.length}`);
if (files.some((f) => !/^2026\d{10}_.+\.sql$/.test(f))) throw new Error('Invalid active migration filename');

const sql = fs.readFileSync(path.join(migrationDir, '20260911160000_048_ecommerce_stability_foundation.sql'), 'utf8');
const hardening = fs.readFileSync(path.join(migrationDir, '20260911170000_049_payment_inventory_lifecycle_hardening.sql'), 'utf8');
const required = [
  'CREATE TABLE IF NOT EXISTS public.inventory_reservations',
  'CREATE TABLE IF NOT EXISTS public.payment_transactions',
  'ALTER TABLE public.orders',
  'CREATE OR REPLACE FUNCTION public.create_secure_customer_order',
  'CREATE OR REPLACE FUNCTION public.update_order_status_transaction',
  'CREATE OR REPLACE FUNCTION public.record_order_payment_transaction',
  'CREATE OR REPLACE FUNCTION public.release_expired_inventory_reservations',
  'v_item jsonb;',
  'notes text,',
  'GRANT EXECUTE ON FUNCTION public.create_secure_customer_order',
];
for (const token of required) if (!sql.includes(token)) throw new Error(`Phase 48 integrity check failed: ${token}`);
for (const token of ['Payment exceeds outstanding order balance','Order stock reservation is no longer available','Paid or partially paid orders require payment/refund handling before cancellation','provider_transaction_id']) {
  if (!hardening.includes(token)) throw new Error(`Phase 51–53 lifecycle hardening check failed: ${token}`);
}

// Guard against the specific compile-time mismatch caught during Phase 49 review.
const recordFn = sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.record_order_payment_transaction'));
if (!recordFn.includes('v_item jsonb;')) throw new Error('Payment transaction function does not declare v_item');
if (!recordFn.includes('idempotency_key,notes,paid_at')) throw new Error('Payment transaction function does not include the notes column in its insert contract');

console.log('Topline migration integrity verification passed.');
