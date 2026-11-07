import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [
  ['real M-Pesa initiation endpoint', /payment-initiate/.test(read('scripts/verify-mpesa-provider-uat.mjs'))],
  ['one-time token status polling', /payment-status/.test(read('scripts/verify-mpesa-provider-uat.mjs')) && /access_token/.test(read('scripts/verify-mpesa-provider-uat.mjs'))],
  ['production host denylist', /cvjmfplhdlfvqnnmzqcp\.supabase\.co/.test(read('scripts/verify-mpesa-provider-uat.mjs'))],
  ['explicit sandbox environment', /MPESA_UAT_ENV/.test(read('scripts/verify-mpesa-provider-uat.mjs'))],
  ['explicit mutation opt-in', /MPESA_UAT_ALLOW_MUTATION/.test(read('scripts/verify-mpesa-provider-uat.mjs'))],
  ['persisted callback evidence', /artifacts.*payment-provider-uat/.test(read('scripts/verify-mpesa-provider-uat.mjs'))],
  ['M-Pesa callback secret fail-closed', /MPESA_CALLBACK_SECRET/.test(read('supabase/functions/payment-callback/index.ts')) && /return json\(401/.test(read('supabase/functions/payment-callback/index.ts'))],
  ['checkout identity lookup', /provider_transaction_id',checkout/.test(read('supabase/functions/payment-callback/index.ts'))],
  ['callback result code validation', /Invalid M-Pesa result code/.test(read('supabase/functions/payment-callback/index.ts'))],
  ['merchant request identity required', /!merchantRequest\|\|!tx\.provider_reference\|\|tx\.provider_reference!==merchantRequest/.test(read('supabase/functions/payment-callback/index.ts'))],
  ['provider RPC reconciliation', /apply_customer_payment_provider_event/.test(read('supabase/functions/payment-callback/index.ts'))],
  ['idempotent event ledger', /provider_event_id/.test(read('supabase/migrations/20261102120000_order_payment_recovery_hardening.sql'))],
  ['runbook distinguishes synthetic webhook from real provider callback', /not provider UAT/i.test(read('docs/PAYMENT-PROVIDER-UAT-RUNBOOK.md'))],
  ['generic webhook harness labels itself synthetic', /not a provider-originated payment transaction/i.test(read('scripts/verify-payment-provider-uat.mjs'))],
  ['runbook requires sandbox API base URL', /sandbox\.safaricom\.co\.ke/.test(read('docs/PAYMENT-PROVIDER-UAT-RUNBOOK.md'))],
  ['card provider limitation explicit', /no named acquirer/i.test(read('docs/PAYMENT-PROVIDER-UAT-RUNBOOK.md'))],
];
const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
if (failed.length) { console.error(`G-05 payment provider UAT contract failed ${failed.length}/${checks.length} checks.`); process.exit(1); }
console.log(`G-05 payment provider UAT source contract passed (${checks.length}/${checks.length}). No provider transaction was sent.`);
