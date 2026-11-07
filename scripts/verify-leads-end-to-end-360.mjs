import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const hook = read('src/hooks/use-data.ts');
const list = read('src/components/leads/LeadList.tsx');
const form = read('src/components/leads/LeadForm.tsx');
const page = read('src/pages/admin/leads.tsx');
const crm = read('src/pages/admin/crm.tsx');
const schema = read('supabase/migrations/20260910000000_topline_canonical_schema.sql');
const lifecycle = read('supabase/migrations/20260913010000_074_commercial_lifecycle_360.sql');
const publicIntake = read('supabase/migrations/20261020110000_guest_to_registered_continuity_360.sql');
const rls = read('supabase/migrations/20261016090000_public_write_surface_and_email_abuse_controls_360.sql');
let checks = 0;
function check(name, fn) { fn(); checks++; console.log(`PASS ${name}`); }

check('Canonical lead schema is name/company/status, not UI aliases', () => {
  assert.match(schema, /CREATE TABLE public\.leads\s*\([\s\S]*?\bname text NOT NULL[\s\S]*?\bcompany text[\s\S]*?\bstatus text NOT NULL/);
  assert.doesNotMatch(schema.match(/CREATE TABLE public\.leads\s*\(([\s\S]*?)\n\);/)?.[1] || '', /customer_name|company_name|lead_stage/);
});
check('Data hook normalizes canonical database rows into legacy Leads-list aliases', () => {
  assert.match(hook, /function normalizeLeadRecord/);
  assert.match(hook, /customer_name:\s*name/);
  assert.match(hook, /company_name:\s*company/);
  assert.match(hook, /lead_stage:\s*status === 'negotiating' \? 'negotiation' : status/);
});
check('Lead search is null-safe and cannot throw on missing display aliases', () => {
  assert.match(list, /\(lead\.customer_name \|\| lead\.name \|\| ''\)\.toLowerCase\(\)/);
  assert.match(list, /\(lead\.company_name \|\| lead\.company \|\| ''\)/);
});
check('Lead creation maps form aliases to canonical RPC parameters', () => {
  assert.match(hook, /lead\.name \|\| lead\.customer_name/);
  assert.match(hook, /lead\.company \?\? lead\.company_name/);
  assert.match(hook, /lead\.status \?\? \(lead\.lead_stage === 'negotiation' \? 'negotiating' : lead\.lead_stage\)/);
});
check('Lead update maps alias fields and canonicalizes negotiating status', () => {
  assert.match(hook, /normalizedUpdates\.name \?\?= normalizedUpdates\.customer_name/);
  assert.match(hook, /normalizedUpdates\.company \?\?= normalizedUpdates\.company_name/);
  assert.match(hook, /normalizedUpdates\.status \?\?=/);
});
check('UI stage choices match database lifecycle values', () => {
  assert.match(form, /'negotiating'/);
  assert.doesNotMatch(form, /'negotiation', 'won'/);
  assert.match(list, /negotiating: 'bg-orange/);
});
check('Lead page surfaces database errors and supports retry', () => {
  assert.match(page, /const \{ leads, loading, error, refetch/);
  assert.match(page, /Leads could not be loaded/);
  assert.match(page, /onClick=\{\(\) => void refetch\(\)\}/);
});
check('CRM pipeline also surfaces load failures instead of empty pipeline', () => {
  assert.match(crm, /const \{ leads, loading, error, refetch/);
  assert.match(crm, /CRM leads could not be loaded/);
});
check('Lead creation remains server-authorized and validates canonical status', () => {
  assert.match(lifecycle, /current_user_has_permission\('leads','insert'\)/);
  assert.match(lifecycle, /p_status NOT IN \('new','contacted','qualified','proposal','negotiating','won','lost','on_hold'\)/);
});
check('Lead update/delete remain server-authorized and conversion history protected', () => {
  assert.match(lifecycle, /current_user_has_permission\('leads','update'\)/);
  assert.match(lifecycle, /current_user_has_permission\('leads','delete'\)/);
  assert.match(lifecycle, /Converted leads cannot be deleted/);
});
check('Public enquiry RPC creates linked lead and quotation atomically', () => {
  assert.match(publicIntake, /INSERT INTO public\.leads\(name,company,email,phone,source,status/);
  assert.match(publicIntake, /INSERT INTO public\.quotations\([\s\S]*?lead_id,customer_id/);
  assert.match(publicIntake, /UPDATE public\.leads SET converted_quotation_id=v_quotation_id/);
});
check('Public direct table inserts remain revoked; public intake uses RPC', () => {
  assert.match(rls, /DROP POLICY IF EXISTS leads_public_insert ON public\.leads/);
  assert.match(rls, /REVOKE INSERT ON public\.quotations, public\.leads, public\.contact_messages FROM anon/);
  assert.match(publicIntake, /CREATE OR REPLACE FUNCTION public\.submit_quotation_request/);
});
check('Lead route retains explicit staff permission mapping', () => {
  const permissions = read('src/lib/admin-permissions.ts');
  assert.match(permissions, /'\/admin\/leads': \{ resource: 'leads', action: 'select' \}/);
});

console.log(`\n${checks}/${checks} Phase 19 Leads end-to-end static checks passed.`);
