import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20261102120000_order_payment_recovery_hardening.sql'), 'utf8');
const callback = fs.readFileSync(path.join(root, 'supabase/functions/payment-callback/index.ts'), 'utf8');
const initiate = fs.readFileSync(path.join(root, 'supabase/functions/payment-initiate/index.ts'), 'utf8');
const status = fs.readFileSync(path.join(root, 'supabase/functions/payment-status/index.ts'), 'utf8');
const cart = fs.readFileSync(path.join(root, 'src/pages/cart.tsx'), 'utf8');
const checks = [
  ['late success can locate failed attempts', /status IN \(\'pending\',\'failed\'\)/.test(migration)],
  ['stale failure cannot downgrade successful/reversed/refunded transaction', /v_tx\.status IN \('successful','reversed','refunded','partially_refunded'\)/.test(migration)],
  ['provider transaction must match target order/invoice', /Provider transaction target does not match payment attempt/.test(migration)],
  ['late success reuses existing transaction rather than inventing a duplicate', /UPDATE public\.payment_transactions SET status='successful'/.test(migration)],
  ['duplicate success callback cannot double-apply invoice payment', /idempotent_payment_replay/.test(migration)],
  ['provider identifier mismatch cannot fall back to a different order attempt', /p_provider_transaction_id IS NULL AND p_order_id IS NOT NULL/.test(migration)],
  ['customer payment path consumes reserved stock on first full payment', /Stock consumed by customer provider-confirmed paid order/.test(migration) && /inventory_reservations SET status='converted'/.test(migration)],
  ['late paid order with expired stock reservation creates fulfillment exception', /payment_confirmed_inventory_exception/.test(migration) && /fulfillment_review_required/.test(migration)],
  ['M-Pesa callback matches stable CheckoutRequestID', /p_provider_transaction_id:checkout,p_provider_reference:receipt\|\|checkout/.test(callback)],
  ['M-Pesa callback does not acknowledge failed reconciliation', /if\(applyError\|\|data\?\.success===false\).*return json\(500/.test(callback) && !/if\(!data&&status==='failed'\)/.test(callback)],
  ['provider dispatch outcome is tracked', /providerRequestDispatched/.test(initiate)],
  ['idempotent replay reissues secure recovery token without new charge', /Reissue a fresh one-time status token/.test(initiate) && /idempotent_replay: true/.test(initiate)],
  ['only known pre-dispatch failures can be retried on the same ledger attempt', /initiation_outcome === \"not_dispatched\"/.test(initiate) && /initiation_outcome: \"not_dispatched\"/.test(initiate)],
  ['checkout idempotency survives a browser reload until payment attempt is returned', /topline-checkout-idempotency-key/.test(cart) && /localStorage.getItem/.test(cart) && /localStorage.setItem/.test(cart)],
  ['uncertain provider response remains pending', /initiation_outcome: \"unknown\"/.test(initiate) && /status: \"pending\", initiation_uncertain: true/.test(initiate)],
  ['uncertain initiation returns customer recovery token', /access_token: accessToken/.test(initiate)],
  ['payment status remains protected by hashed one-time token', /public_token_hash/.test(status) && /sha256Hex\(token\)/.test(status)],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`\nOrder/payment recovery checks: ${checks.length - failed}/${checks.length} passed.`);
if (failed) process.exitCode = 1;
