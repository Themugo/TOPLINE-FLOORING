import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'supabase/migrations/20260912100000_059_production_communications_worker.sql',
  'supabase/functions/deliver-communications/index.ts',
  'supabase/functions/deliver-communications/deno.json',
  'docs/PHASE_3_REAL_PRODUCTION_EMAIL.md',
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing ${file}`);
}

const migration = fs.readFileSync(path.join(root, required[0]), 'utf8');
const fn = fs.readFileSync(path.join(root, required[1]), 'utf8');
const docs = fs.readFileSync(path.join(root, required[3]), 'utf8');

for (const token of [
  'claim_communication_outbox_worker',
  'complete_communication_delivery_worker',
  'fail_communication_delivery_worker',
  "auth.role(), '') <> 'service_role'",
  'REVOKE ALL',
]) if (!migration.includes(token)) throw new Error(`Missing worker security contract: ${token}`);

for (const token of [
  'BREVO_API_KEY',
  'BREVO_SENDER_EMAIL',
  'AT_API_KEY',
  'complete_communication_delivery_worker',
  'fail_communication_delivery_worker',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'sendWhatsApp',
]) if (!fn.includes(token)) throw new Error(`Missing provider contract: ${token}`);

for (const token of ['Supabase Auth', 'Brevo', 'cPanel', 'SPF', 'DKIM', 'DMARC', '300 email']) {
  if (!docs.includes(token)) throw new Error(`Missing launch documentation: ${token}`);
}

if (/(VITE_BREVO|VITE_AT_|BREVO_API_KEY\s*=\s*['"])/.test(fn)) throw new Error('Provider secret leaked into client-style configuration');

console.log('Phase 3 production email architecture verification passed.');
