import fs from 'node:fs';
const m = fs.readFileSync('supabase/migrations/20261103160000_enquiry_alert_site_settings_fallback.sql','utf8');
for (const n of ["setting_key = 'contact'", 'queue_quotation_intake_emails', 'REVOKE ALL ON FUNCTION public.queue_quotation_intake_emails()']) if (!m.includes(n)) throw new Error('Alert fallback migration missing: ' + n);
const sc = fs.readFileSync('src/pages/admin/site-control.tsx','utf8');
for (const n of ['JsonConfigField', 'quotation_admin_email']) if (!sc.includes(n)) throw new Error('Site control missing: ' + n);
if (/value=\{JSON\.stringify\(item\.public_config/.test(sc)) throw new Error('JSON config boxes must keep a draft so they can be typed into');
// every env var the Edge Functions read must be documented
const doc = fs.readFileSync('docs/CONFIGURATION-CHECKLIST.md','utf8');
const used = new Set();
for (const dir of fs.readdirSync('supabase/functions')) {
  const d = 'supabase/functions/' + dir; if (!fs.statSync(d).isDirectory()) continue;
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.ts'))) for (const mm of fs.readFileSync(d + '/' + f, 'utf8').matchAll(/Deno\.env\.get\("([A-Z_0-9]+)"/g)) used.add(mm[1]);
}
for (const k of used) if (!doc.includes('`' + k + '`')) throw new Error('Undocumented environment variable: ' + k);
const toml = fs.readFileSync('supabase/config.toml','utf8');
if (!toml.includes('https://www.toplineflooringandwaterproofing.co.ke/portal')) throw new Error('www redirect URL missing');
console.log('verify-pass18-registration-email-config: OK');
