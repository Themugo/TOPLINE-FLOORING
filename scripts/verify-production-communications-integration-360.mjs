import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = (m) => { console.error(`FAIL: ${m}`); process.exitCode = 1; };
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const mustContain = (file, text, label) => {
  const body = read(file);
  if (!body.includes(text)) fail(`${label}: missing ${text}`);
};

const migrationDir = path.join(root,'supabase','migrations');
const migrations = fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql'));
if (!migrations.some((f) => f.startsWith('20260913190000_098_production_communications_integration_hardening_360'))) fail('migration 098 missing');

mustContain('supabase/config.toml','major_version = 17','Supabase config');
mustContain('supabase/config.toml','[functions.deliver-communications]','delivery worker config');
mustContain('supabase/config.toml','[functions.whatsapp-webhook]','WhatsApp webhook config');

mustContain('supabase/functions/deliver-communications/index.ts','x-topline-worker-secret','worker authentication');
mustContain('supabase/functions/deliver-communications/index.ts','Idempotency-Key','Brevo idempotency');
mustContain('supabase/functions/deliver-communications/index.ts','record_communication_delivery_attempt_worker','attempt audit');
mustContain('supabase/functions/deliver-communications/index.ts','mark_communication_delivery_uncertain_worker','ambiguous provider outcome boundary');

mustContain('supabase/functions/communication-provider-webhook/index.ts','message-id','Brevo message correlation');
mustContain('supabase/functions/communication-provider-webhook/index.ts','constantTimeEqual','webhook secret comparison');
mustContain('supabase/functions/sms-delivery-report/index.ts','constantTimeEqual','SMS callback secret comparison');
mustContain('supabase/functions/sms-inbound/index.ts','constantTimeEqual','SMS inbound secret comparison');
mustContain('supabase/functions/email-inbound/index.ts','constantTimeEqual','email inbound secret comparison');
mustContain('supabase/functions/whatsapp-webhook/index.ts','x-hub-signature-256','WhatsApp signature validation');
mustContain('supabase/functions/whatsapp-webhook/index.ts','hmacSha256Hex','WhatsApp HMAC verification');

const migration = read('supabase/migrations/20260913190000_098_production_communications_integration_hardening_360.sql');
for (const needle of [
  'communication_delivery_attempts',
  'record_communication_delivery_attempt_worker',
  'mark_communication_delivery_uncertain_worker',
  'REVOKE ALL ON FUNCTION public.record_communication_delivery_attempt_worker',
  'REVOKE ALL ON FUNCTION public.mark_communication_delivery_uncertain_worker',
  'p_event_type',
  "'request','accepted'",
]) {
  if (!migration.includes(needle)) fail(`migration 098: missing ${needle}`);
}

for (const file of [
  'supabase/functions/deliver-communications/index.ts',
  'supabase/functions/communication-provider-webhook/index.ts',
  'supabase/functions/sms-delivery-report/index.ts',
  'supabase/functions/sms-inbound/index.ts',
  'supabase/functions/email-inbound/index.ts',
  'supabase/functions/whatsapp-webhook/index.ts',
]) {
  const body = read(file);
  if (body.includes('SUPABASE_SERVICE_ROLE_KEY') && body.includes('VITE_')) fail(`${file}: suspicious browser-exposed service-role naming`);
}

if (!process.exitCode) console.log(`Production Communications Integration 360 static verification PASSED (${migrations.length} migrations)`);
