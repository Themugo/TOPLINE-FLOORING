import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const migrationPath = 'supabase/migrations/20261107120100_phase_16_quotation_order_project_integrity.sql';
const migration = fs.readFileSync(path.join(root, migrationPath), 'utf8');
const lifecycle = fs.readFileSync(path.join(root, 'src/lib/lifecycle.ts'), 'utf8');
const quotePage = fs.readFileSync(path.join(root, 'src/pages/admin/quotations.tsx'), 'utf8');
const grouped = fs.readFileSync(path.join(root, 'scripts/verify-phases-15-17.mjs'), 'utf8');
const checks = [
  ['Phase 16 migration exists and replaces canonical conversion RPC', /CREATE OR REPLACE FUNCTION public\.convert_quotation_to_order/.test(migration)],
  ['Quotation row is locked for conversion serialization', /WHERE id = p_quotation_id\s+FOR UPDATE/.test(migration)],
  ['All quotation, order and project permissions are required', /current_user_has_permission\('quotations','update'\)[\s\S]*?current_user_has_permission\('orders','insert'\)[\s\S]*?current_user_has_permission\('projects','insert'\)/.test(migration)],
  ['Only accepted or won quotations can convert', /v_q\.status NOT IN \('accepted','won'\)/.test(migration)],
  ['Missing customer email fails closed', /v_email := lower\(trim\(coalesce\(v_q\.email,''\)\)\)[\s\S]*?IF v_email = '' THEN/.test(migration)],
  ['Normalized email conversion is serialized', /pg_advisory_xact_lock\(hashtextextended\(v_email, 66017\)\)/.test(migration)],
  ['Existing conversion validates order and project linkage', /conversion links are incomplete or inconsistent/.test(migration)],
  ['Order lines are copied from quotation items in stable order', /FROM public\.quotation_items[\s\S]*?ORDER BY display_order,id[\s\S]*?INSERT INTO public\.order_items/.test(migration)],
  ['Project is linked to quotation, order and customer', /title,slug,client_name,customer_id,quotation_id,order_id/.test(migration)],
  ['Quotation is marked converted with canonical order/customer IDs', /status='converted', converted_order_id=v_order\.id,[\s\S]*?customer_id=v_customer\.id/.test(migration)],
  ['Lead is updated consistently when linked', /converted_quotation_id=v_q\.id,outcome='won'/.test(migration)],
  ['Lifecycle audit event records conversion', /'quotation_converted',v_q\.lead_id,v_q\.id,v_customer\.id,v_order\.id,v_project\.id/.test(migration)],
  ['RPC is revoked from PUBLIC and anon and granted to authenticated', /REVOKE ALL ON FUNCTION public\.convert_quotation_to_order\(uuid,text\) FROM PUBLIC, anon[\s\S]*?GRANT EXECUTE ON FUNCTION public\.convert_quotation_to_order\(uuid,text\) TO authenticated/.test(migration)],
  ['Frontend wrapper uses canonical RPC', /callLifecycle\('convert_quotation_to_order'/.test(lifecycle)],
  ['Admin quotation page invokes lifecycle conversion', /convertQuotationToOrder/.test(quotePage)],
  ['Combined Phase 15–17 verifier remains present', /convert_quotation_to_order/.test(grouped)],
];
let failed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failed++; }
console.log(`Phase 16 quotation/order/project: ${checks.length - failed}/${checks.length} passed, ${failed} failed.`);
if (failed) process.exit(1);
