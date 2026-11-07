import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const edge = await readFile('supabase/functions/payment-initiate/index.ts', 'utf8');
const migration = await readFile('supabase/migrations/20261107110000_payment_initiation_atomic_reservation.sql', 'utf8');
const callback = await readFile('supabase/functions/payment-callback/index.ts', 'utf8');
const manifest = await readFile('supabase/MIGRATION_MANIFEST.md', 'utf8');
const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const checks = [
  ['payment initiation delegates transaction+attempt creation to atomic RPC', edge.includes('create_payment_attempt_atomic_360') && !edge.includes('.from("payment_transactions")\n      .insert({\n        order_id: targetType')],
  ['atomic RPC locks order target', /FROM public\.orders WHERE id=p_target_id FOR UPDATE/.test(migration)],
  ['atomic RPC locks invoice target', /FROM public\.invoices WHERE id=p_target_id FOR UPDATE/.test(migration)],
  ['atomic RPC serializes concurrent starts before pending check', migration.indexOf('FOR UPDATE') < migration.indexOf('payment_in_progress')],
  ['atomic RPC checks idempotency within target lock', migration.includes('WHERE idempotency_key=p_idempotency_key FOR UPDATE')],
  ['atomic RPC rejects idempotency key reuse for a different target or gateway', migration.includes('Idempotency key belongs to a different payment request')],
  ['atomic RPC rejects duplicate in-flight online charge', migration.includes("t.status='pending'") && migration.includes("t.method<>'bank_transfer'") && migration.includes("'payment_in_progress'")],
  ['atomic RPC leaves bank transfer outside immediate-charge lockout', migration.includes("t.method<>'bank_transfer'")],
  ['atomic RPC revalidates outstanding order/invoice balance', migration.includes('p_amount>v_balance')],
  ['atomic RPC inserts transaction and attempt in one database transaction', migration.includes('INSERT INTO public.payment_transactions') && migration.includes('INSERT INTO public.payment_attempts')],
  ['atomic RPC is service-role only', migration.includes("coalesce(auth.role(),'') <> 'service_role'")],
  ['atomic RPC denies public and authenticated execution', migration.includes('FROM PUBLIC,anon,authenticated') && migration.includes('TO service_role')],
  ['migration is registered in canonical manifest', manifest.includes('20261107110000_payment_initiation_atomic_reservation.sql')],
  ['package exposes Phase 5 targeted verifier', packageJson.scripts['verify:phase-5-payment-initiation-atomicity'] === 'node scripts/verify-phase-5-payment-initiation-atomicity.mjs'],
  ['payment retry refuses a stale attempt larger than the live outstanding balance', edge.includes('Number(replayTx.amount) > amount') && edge.includes('outstanding balance changed after this payment attempt')],
  ['provider callback accepts POST only', /req\.method!==\x27POST\x27/.test(callback)],
  ['provider callback caps payload at 64 KiB before parsing', /bytes\.byteLength>65536/.test(callback)],
  ['provider callback authenticates raw request bytes for signed card events', callback.includes('const raw=rawBody') && callback.includes('x-payment-signature')],
];
for (const [name, passed] of checks) {
  assert.equal(passed, true, name);
  console.log(`PASS ${name}`);
}
console.log(`Phase 5 payment initiation atomicity: ${checks.length}/${checks.length} passed`);
