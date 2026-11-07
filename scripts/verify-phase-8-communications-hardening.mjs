import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const migration = read('supabase/migrations/20261107140000_communications_delivery_callback_hardening.sql');
const sms = read('supabase/functions/sms-delivery-report/index.ts');
const readiness = read('supabase/functions/communication-provider-readiness/index.ts');
const manifest = read('supabase/MIGRATION_MANIFEST.md');
const pkg = JSON.parse(read('package.json'));
const register = JSON.parse(read('docs/MASTER-WORKFLOW-REGISTER.json'));
const checks = [
  ['SMS callback uses SECURITY DEFINER and empty search_path', /FUNCTION public\.record_sms_delivery_report[\s\S]*SECURITY DEFINER SET search_path = ''/.test(migration)],
  ['SMS callback rejects non-service-role execution', /auth\.role\(\)[\s\S]*<> 'service_role'[\s\S]*Service role required/.test(migration)],
  ['SMS callback requires a provider message reference', /nullif\(trim\(p_provider_reference\),' '\) IS NULL/.test(migration) || /nullif\(trim\(p_provider_reference\),''\) IS NULL/.test(migration)],
  ['SMS callback rejects negative provider cost', /p_cost IS NOT NULL AND p_cost < 0/.test(migration)],
  ['SMS callback delegates to shared delivery event ledger', /record_provider_delivery_event_worker\([\s\S]*'africastalking','sms'/.test(migration)],
  ['SMS callback maps sent to supported submitted state', /ELSIF v_status = 'sent' THEN\s+v_status := 'submitted'/.test(migration)],
  ['SMS callback preserves cost metadata', /SET provider_cost = p_cost/.test(migration)],
  ['SMS callback execution revoked from public clients', /REVOKE ALL ON FUNCTION public\.record_sms_delivery_report[\s\S]*FROM PUBLIC, anon, authenticated/.test(migration)],
  ['SMS callback execution granted only to service role', /GRANT EXECUTE ON FUNCTION public\.record_sms_delivery_report[\s\S]*TO service_role/.test(migration)],
  ['SMS Edge callback enforces 64 KiB payload ceiling', /raw\.length > 65_536/.test(sms)],
  ['SMS Edge callback parses JSON safely', /JSON\.parse\(raw\)[\s\S]*Invalid JSON payload/.test(sms)],
  ['SMS Edge callback rejects non-object JSON', /Array\.isArray\(body\)/.test(sms)],
  ['SMS Edge callback parses URL-encoded provider payloads', /new URLSearchParams\(raw\)/.test(sms)],
  ['SMS Edge callback safely reconstructs multipart form parsing', /new Request\(req\.url, \{ method:"POST", headers:req\.headers, body:raw \}\)/.test(sms)],
  ['SMS Edge callback authenticates before parsing body', sms.indexOf('constantTimeEqual(headerOrQuery') < sms.indexOf('const raw = await req.text()')],
  ['WhatsApp readiness requires phone number ID', /provider: "meta_whatsapp"[\s\S]*keys: \[[^\]]*"WHATSAPP_PHONE_NUMBER_ID"/.test(readiness)],
  ['WhatsApp sender independently requires phone number ID', read('supabase/functions/deliver-communications/index.ts').includes('!whatsappAccessToken || !whatsappPhoneNumberId')],
  ['Existing email/SMS/WhatsApp provider adapters remain', ['sendEmail','sendSms','sendWhatsApp'].every(x => read('supabase/functions/deliver-communications/index.ts').includes(x))],
  ['Existing consent-driven marketing sync remains', read('supabase/functions/deliver-communications/index.ts').includes('brevo_marketing_sync_queue')],
  ['Migration manifest records Phase 8 migration', manifest.includes('20261107140000_communications_delivery_callback_hardening.sql')],
  ['Package verifier command is registered', pkg.scripts['verify:phase-8-communications-hardening'] === 'node scripts/verify-phase-8-communications-hardening.mjs'],
  ['Workflow register records Phase 8 communications', register.workflow_register.find(x => x.workflow_id === 'WF-08')?.phase0_status.includes('PHASE 8')],
  ['Workflow register advances to the Phase 19 authoritative foundation', register.foundation === 'TOPLINE-FLOORING-PHASE-19-COMPLETE-2026-11-07.zip'],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`Phase 8 communications hardening: ${checks.length - failed}/${checks.length} passed, ${failed} failed.`);
if (failed) process.exit(1);
