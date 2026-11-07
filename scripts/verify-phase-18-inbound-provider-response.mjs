import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const migrationName = '20261107200000_phase_18_inbound_provider_identity_hardening.sql';
const migration = read(`supabase/migrations/${migrationName}`);
const security = read('supabase/functions/_shared/security.ts');
const sms = read('supabase/functions/sms-inbound/index.ts');
const email = read('supabase/functions/email-inbound/index.ts');
const brevo = read('supabase/functions/communication-provider-webhook/index.ts');
const whatsapp = read('supabase/functions/whatsapp-webhook/index.ts');
const manifest = read('supabase/MIGRATION_MANIFEST.md');
const pkg = JSON.parse(read('package.json'));
const ci = read('.github/workflows/ci.yml');
const checks = [
  ['Phase 18 migration exists and is registered', exists(`supabase/migrations/${migrationName}`) && manifest.includes(migrationName)],
  ['Inbound RPC remains service-role only', /auth\.role\(\)[\s\S]*<> 'service_role'/.test(migration) && /REVOKE ALL ON FUNCTION public\.record_inbound_communication_worker[\s\S]*FROM PUBLIC, anon, authenticated/.test(migration) && /GRANT EXECUTE ON FUNCTION public\.record_inbound_communication_worker[\s\S]*TO service_role/.test(migration)],
  ['Inbound RPC uses empty search_path and qualified objects', /SECURITY DEFINER SET search_path = ''/.test(migration) && /public\.communication_inbound/.test(migration) && /public\.customers/.test(migration)],
  ['Stable provider message ID is mandatory', /v_provider_message_id IS NULL OR length\(v_provider_message_id\) > 255/.test(migration)],
  ['Provider, channel, sender and message inputs are bounded', /length\(v_provider\) > 80/.test(migration) && /v_channel NOT IN \('email', 'sms', 'whatsapp'\)/.test(migration) && /length\(v_sender\) > 320/.test(migration) && /length\(v_message\) > 262144/.test(migration)],
  ['Inbound payload must be a JSON object', /jsonb_typeof\(v_payload\) <> 'object'/.test(migration)],
  ['Provider retry resolves existing inbound row without duplicate side effects', /ON CONFLICT \(provider, channel, provider_message_id\) DO NOTHING[\s\S]*IF v_id IS NULL THEN[\s\S]*RETURN v_id;/.test(migration)],
  ['Customer timeline and staff notification occur only on first insert', /IF v_customer_id IS NOT NULL THEN[\s\S]*INSERT INTO public\.customer_communications[\s\S]*INSERT INTO public\.notification_events/.test(migration)],
  ['Shared bounded body reader handles declared and streamed sizes', /readBoundedBody[\s\S]*content-length[\s\S]*reader\.read\(\)[\s\S]*reader\.cancel\(\)/.test(security)],
  ['SMS inbound authenticates before bounded body parsing', sms.indexOf('constantTimeEqual(headerOrQuery') < sms.indexOf('readBoundedBody(req,65_536)') && /readBoundedBody\(req,65_536\)/.test(sms)],
  ['SMS inbound rejects missing provider identity and malformed payloads', /!sender\|\|!message\|\|!providerMessageId/.test(sms) && /Invalid JSON payload/.test(sms)],
  ['Email inbound applies 256 KiB bound and requires provider ID', /readBoundedBody\(req,262_144\)/.test(email) && /!sender\|\|!message\|\|!providerMessageId/.test(email)],
  ['Brevo provider webhook applies streamed 1 MiB bound', /readBoundedBody\(req, 1_048_576\)/.test(brevo)],
  ['WhatsApp webhook applies streamed 1 MiB bound before signature verification', /readBoundedBody\(req,1_048_576\)/.test(whatsapp) && whatsapp.indexOf('readBoundedBody') < whatsapp.indexOf('hmacSha256Hex(appSecret,rawBody)')],
  ['Dedicated Phase 18 verifier is registered in npm and CI', pkg.scripts['verify:phase-18-inbound-provider-response'] === 'node scripts/verify-phase-18-inbound-provider-response.mjs' && ci.includes('npm run verify:phase-18-inbound-provider-response')],
  ['Combined Phase 18–20 communications verification remains registered', pkg.scripts['verify:phase-18-20-communications-provider-response'] === 'node scripts/verify-phase-18-20-communications-provider-response.mjs' && ci.includes('npm run verify:phase-18-20-communications-provider-response')],
];
let failed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failed++; }
console.log(`Phase 18 inbound provider response: ${checks.length - failed}/${checks.length} passed, ${failed} failed.`);
if (failed) process.exit(1);
