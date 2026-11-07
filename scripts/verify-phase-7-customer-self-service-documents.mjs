import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const migrationName = '20261107130000_customer_document_access_hardening.sql';
const migration = read(`supabase/migrations/${migrationName}`);
const portal = read('src/pages/portal.tsx');
const service = read('src/lib/customer-self-service.ts');
const types = read('src/types/database.ts');
const manifest = read('supabase/MIGRATION_MANIFEST.md');
const register = read('docs/MASTER-WORKFLOW-REGISTER.json');
const checks = [
  ['customer project-document RLS is read-only', /CREATE POLICY project_documents_customer_select ON public\.project_documents\s+FOR SELECT TO authenticated/.test(migration) && !/project_documents_customer_(?:insert|update|delete)/.test(migration)],
  ['customer ownership helper uses SECURITY DEFINER and fixed search_path', /FUNCTION private\.customer_owns_project\(p_project_id uuid\)[\s\S]*SECURITY DEFINER[\s\S]*SET search_path = ''/.test(migration)],
  ['customer metadata is scoped through the ownership helper', /USING \(private\.customer_owns_project\(project_id\)\)/.test(migration)],
  ['customer Storage reads require a registered metadata row', /EXISTS \([\s\S]*FROM public\.project_documents pd[\s\S]*pd\.storage_path = storage\.objects\.name/.test(migration)],
  ['staff projects.select access is retained', /private\.current_user_has_permission\('projects', 'select'\)/.test(migration)],
  ['customer Storage UPDATE USING checks current ownership', /USING \([\s\S]*cpa\.is_active = true[\s\S]*split_part\(name, '\/', 1\) = cpa\.customer_id::text/.test(migration)],
  ['customer Storage UPDATE WITH CHECK checks destination ownership', /WITH CHECK \([\s\S]*private\.current_user_has_permission\('media', 'update'\)[\s\S]*cpa\.is_active = true[\s\S]*split_part\(name, '\/', 1\) = cpa\.customer_id::text/.test(migration)],
  ['customer project document RPC is security definer with empty search path', /FUNCTION public\.get_customer_project_documents\(\)[\s\S]*SECURITY DEFINER[\s\S]*SET search_path = ''/.test(migration)],
  ['RPC returns only documents joined to customer-owned projects', /JOIN public\.projects p ON p\.id = pd\.project_id[\s\S]*WHERE p\.customer_id = v_customer_id/.test(migration)],
  ['RPC is unavailable to anon and public', /REVOKE ALL ON FUNCTION public\.get_customer_project_documents\(\) FROM PUBLIC, anon/.test(migration)],
  ['RPC is granted to authenticated users', /GRANT EXECUTE ON FUNCTION public\.get_customer_project_documents\(\) TO authenticated/.test(migration)],
  ['portal calls customer project document RPC', service.includes("rpc('get_customer_project_documents')")],
  ['portal creates short-lived signed links from private bucket', service.includes("from('private-documents')") && service.includes('createSignedUrl') && /createSignedUrl\([\s\S]*storagePath[\s\S]*, 60/.test(service)],
  ['portal validates project namespace before signing', /storagePath\.startsWith\('projects\/'\)/.test(service)],
  ['portal presents project documents with open action', portal.includes('Project documents') && portal.includes('openProjectDocument')],
  ['portal does not expose public URLs for project documents', !/getPublicUrl/.test(service)],
  ['generated database RPC type is present', types.includes('get_customer_project_documents:')],
  ['migration manifest lists new migration', manifest.includes(migrationName)],
  ['migration manifest count is current', manifest.includes(`contains ${fs.readdirSync(path.join(root, 'supabase/migrations')).filter((name) => name.endsWith('.sql')).length} uniquely timestamped active migrations`)],
  ['workflow register advances to the Phase 19 authoritative foundation', JSON.parse(register).foundation === 'TOPLINE-FLOORING-PHASE-19-COMPLETE-2026-11-07.zip'],
  ['workflow register records Phase 7 scope', JSON.parse(register).workflow_register.find(x => x.workflow_id === 'WF-07')?.phase0_status.includes('PHASE 7 CUSTOMER DOCUMENT SELF-SERVICE CONTRACT RETAINED')],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`Phase 7 verification: ${checks.length - failed}/${checks.length} passed, ${failed} failed.`);
if (failed) process.exit(1);
