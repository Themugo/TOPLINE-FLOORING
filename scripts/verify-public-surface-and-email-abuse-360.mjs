import fs from 'node:fs';
import path from 'node:path';

// Static guard for the 2026-10-16 audit hardening. The behavioural checks live in
// supabase/tests/public_surface_regression.sql and need a database; these checks keep the code-level
// fixes from being quietly undone.
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const migrationName = '20261016090000_public_write_surface_and_email_abuse_controls_360.sql';
expect(fs.existsSync(path.join(root, 'supabase/migrations', migrationName)), `Missing migration ${migrationName}.`);
const migration = fs.existsSync(path.join(root, 'supabase/migrations', migrationName)) ? read(`supabase/migrations/${migrationName}`) : '';
for (const needle of [
  'REVOKE ALL ON public.public_projects FROM PUBLIC, anon, authenticated',
  'DROP POLICY IF EXISTS quotations_public_insert',
  'DROP POLICY IF EXISTS leads_public_insert',
  'DROP POLICY IF EXISTS contact_messages_public_insert',
  'communication_suppressions',
  "'superseded'",
  "code','rate_limited'",
  'E\'Hello %s,\\n\\n',
]) expect(migration.includes(needle), `Hardening migration is missing: ${needle}`);

expect(fs.existsSync(path.join(root, 'supabase/tests/public_surface_regression.sql')), 'Public surface SQL regression test is missing.');


// Part 2: outbound message guards and stock-hoarding limit.
const guardsName = '20261016120000_outbound_message_abuse_guards_360.sql';
expect(fs.existsSync(path.join(root, 'supabase/migrations', guardsName)), `Missing migration ${guardsName}.`);
const guards = fs.existsSync(path.join(root, 'supabase/migrations', guardsName)) ? read(`supabase/migrations/${guardsName}`) : '';
for (const needle of [
  'communication_outbox_volume_guard',
  'private.sanitize_inline_text(c.name,60)',
  "code','rate_limited'",
  'orders_email_created_idx',
]) expect(guards.includes(needle), `Message-guards migration is missing: ${needle}`);

// Secrets and signatures are compared in constant time.
for (const file of [
  'supabase/functions/deliver-communications/index.ts',
  'supabase/functions/operations-scheduler/index.ts',
  'supabase/functions/expire-reservations/index.ts',
  'supabase/functions/payment-callback/index.ts',
]) {
  const source = read(file);
  expect(source.includes('constantTimeEqual'), `${file} must use constantTimeEqual for secret/signature checks.`);
  expect(!/x-topline-worker-secret['"]\)\s*!==/.test(source), `${file} compares the worker secret with !==.`);
}
expect(!/toLowerCase\(\)\s*!==\s*expected\.toLowerCase\(\)/.test(read('supabase/functions/payment-callback/index.ts')), 'Card callback HMAC must not be compared with !==.');

// Payment redirects stay on Topline origins and checkout URLs must be https.
const initiate = read('supabase/functions/payment-initiate/index.ts');
expect(initiate.includes('isAllowedSiteUrl'), 'payment-initiate must restrict return_url to allowed Topline origins.');
expect(initiate.includes('safeUrl(clean(result.checkout_url)'), 'payment-initiate must require an https checkout URL from the card gateway.');
expect(read('supabase/functions/_shared/cors.ts').includes('export function isAllowedSiteUrl'), 'cors.ts must export isAllowedSiteUrl.');
for (const file of ['src/pages/cart.tsx', 'src/pages/portal.tsx']) {
  const source = read(file);
  expect(source.includes('navigateToPaymentUrl'), `${file} must navigate to payment pages through navigateToPaymentUrl.`);
  expect(!/window\.location\.href\s*=\s*(payment|r)\.(checkout_url|return_url)/.test(source), `${file} assigns a server-supplied URL straight to window.location.href.`);
}

// Marketing consent ordering and suppression in the delivery worker.
const worker = read('supabase/functions/deliver-communications/index.ts');
expect(worker.includes('communication_suppressions') && worker.includes('"superseded"'), 'Marketing sync worker must honour newer unsubscribes and the suppression list.');

// Contact and quotation forms show the server throttle message.
for (const file of ['src/pages/contact.tsx', 'src/pages/quotation.tsx']) {
  expect(read(file).includes('QuotationRateLimitedError'), `${file} must surface the quotation rate-limit message.`);
}

// Environment template exists and carries no server secret.
const envExample = fs.existsSync(path.join(root, '.env.example')) ? read('.env.example') : '';
expect(envExample.includes('VITE_SUPABASE_URL=') && envExample.includes('VITE_SITE_URL='), '.env.example is missing or incomplete.');
expect(!/SUPABASE_SERVICE_ROLE_KEY\s*=|service_role\s*=/.test(envExample), '.env.example must not contain a server-side credential.');

if (failures.length) {
  console.error(failures.map((f) => `FAIL: ${f}`).join('\n'));
  process.exit(1);
}
console.log('Public surface and email abuse controls verified.');
