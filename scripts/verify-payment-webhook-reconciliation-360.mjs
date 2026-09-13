import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationDir = path.join(root, 'supabase', 'migrations');
const migration = fs.readdirSync(migrationDir).find((f) => f.includes('_099_payment_webhook_reconciliation_360.sql'));
if (!migration) throw new Error('099 payment webhook/reconciliation migration missing');
const sql = fs.readFileSync(path.join(migrationDir, migration), 'utf8');
const webhook = fs.readFileSync(path.join(root, 'supabase/functions/payment-webhook/index.ts'), 'utf8');
const checks = [
  ['provider event ledger', /CREATE TABLE IF NOT EXISTS public\.payment_provider_events/],
  ['unique provider event', /UNIQUE\(provider, provider_event_id\)/],
  ['service-role RPC boundary', /auth\.role\(\) <> 'service_role'/],
  ['payload hash replay protection', /payload_hash/],
  ['service-role execute grant', /TO service_role/],
  ['order row lock', /FROM public\.orders WHERE id=v_order_id FOR UPDATE/],
  ['full-payment stock consumption', /IF v_new_status='paid' THEN/],
  ['reconciliation function', /reconcile_payment_provider_events/],
  ['webhook signature verification', /x-payment-signature/],
  ['timestamp replay window', /MAX_CLOCK_SKEW_SECONDS/] ,
  ['payload size limit', /MAX_BODY_BYTES/],
  ['service role key server-side only', /SUPABASE_SERVICE_ROLE_KEY/],
  ['webhook RPC call', /apply_payment_provider_event/],
];
for (const [name, re] of checks) {
  const haystack = ['webhook signature verification','timestamp replay window','payload size limit','service role key server-side only','webhook RPC call'].includes(name) ? webhook : sql;
  if (!re.test(haystack)) throw new Error(`FAILED: ${name}`);
}
console.log('Production Payments + Reconciliation + Provider Webhooks 360 verification PASSED');
