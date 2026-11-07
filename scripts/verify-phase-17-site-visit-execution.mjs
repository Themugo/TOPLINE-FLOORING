import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const migrationName = '20261107190000_phase_17_site_visit_execution_integrity.sql';
const migration = read(`supabase/migrations/${migrationName}`);
const page = read('src/pages/admin/site-visits.tsx');
const lifecycle = read('src/lib/lifecycle.ts');
const manifest = read('supabase/MIGRATION_MANIFEST.md');
const pkg = JSON.parse(read('package.json'));
const ci = read('.github/workflows/ci.yml');
const grouped = read('scripts/verify-phases-15-17.mjs');
const checks = [
  ['Phase 17 migration exists and is registered', exists(`supabase/migrations/${migrationName}`) && manifest.includes(migrationName)],
  ['Scheduling requires project insert permission (not OR permission bypass)', /IF NOT private\.current_user_has_permission\('projects','insert'\)/.test(migration) && !/current_user_has_permission\('projects','insert'\)\s+OR\s+private\.current_user_has_permission\('quotations','update'\)/.test(migration)],
  ['Past date and same-day past time are rejected', /p_scheduled_date < current_date[\s\S]*p_scheduled_time < localtime/.test(migration)],
  ['Quotation is locked and verified', /WHERE id=p_quotation_id FOR KEY SHARE/.test(migration)],
  ['Customer must match quotation and linked project', /v_customer_id IS DISTINCT FROM v_quotation\.customer_id/.test(migration) && /v_customer_id IS DISTINCT FROM v_project\.customer_id/.test(migration)],
  ['Linked project is derived from canonical quotation relationship', /WHERE quotation_id=p_quotation_id ORDER BY created_at DESC,id DESC LIMIT 1 FOR KEY SHARE/.test(migration)],
  ['Assigned staff must be active', /staff_profiles WHERE user_id=p_assigned_to AND is_active=true/.test(migration)],
  ['Visit type and notes have bounded input lengths', /length\(trim\(p_visit_type\)\) > 80/.test(migration) && /length\(p_visit_notes\) > 4000/.test(migration)],
  ['Status update requires project update permission', /IF NOT private\.current_user_has_permission\('projects','update'\)/.test(migration)],
  ['Status RPC cannot mark a visit rescheduled without changing appointment time', /p_status NOT IN \('scheduled','completed','cancelled'\)/.test(migration)],
  ['Completed and cancelled visits cannot be reopened', /v_old IN \('completed','cancelled'\) AND p_status <> v_old/.test(migration)],
  ['Status events are recorded transactionally', /INSERT INTO public\.sales_project_lifecycle_events[\s\S]*'site_visit_status_changed'/.test(migration)],
  ['Privileged RPCs are authenticated-only', /REVOKE ALL ON FUNCTION public\.create_site_visit\(uuid,uuid,date,time,text,uuid,text\) FROM PUBLIC, anon/.test(migration) && /GRANT EXECUTE ON FUNCTION public\.create_site_visit\(uuid,uuid,date,time,text,uuid,text\) TO authenticated/.test(migration)],
  ['Admin page loads only required site visit columns', /select\('id,quotation_id,customer_id,project_id,scheduled_date,scheduled_time,visit_type,assigned_to,status,visit_notes'\)/.test(page)],
  ['Admin page loads active staff for assignment', /from\('staff_profiles'\)[\s\S]*eq\('is_active', true\)/.test(page) && /assignedTo: assignedTo \|\| null/.test(page)],
  ['Admin page surfaces read failures with retry', /loadError \?[\s\S]*role="alert"[\s\S]*Try again/.test(page)],
  ['Admin page does not expose false reschedule status action', !/setStatus\(v\.id,'rescheduled'\)/.test(page)],
  ['Dedicated Phase 17 verifier is registered in npm and CI', pkg.scripts['verify:phase-17-site-visit-execution'] === 'node scripts/verify-phase-17-site-visit-execution.mjs' && ci.includes('npm run verify:phase-17-site-visit-execution')],
  ['Combined Phase 15–17 lifecycle verifier remains in place', grouped.includes('create_site_visit') && grouped.includes('update_site_visit_status')],
];
let failed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failed++; }
console.log(`Phase 17 site-visit execution: ${checks.length - failed}/${checks.length} passed, ${failed} failed.`);
if (failed) process.exit(1);
