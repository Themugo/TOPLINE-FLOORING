import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

const migrationName = '20260930180000_project_documents_private_storage.sql';
const migrationPath = path.join('supabase', 'migrations', migrationName);
check(fs.existsSync(path.join(root, migrationPath)), 'Missing project_documents migration');

if (fs.existsSync(path.join(root, migrationPath))) {
  const sql = read(migrationPath);
  for (const token of [
    'CREATE TABLE IF NOT EXISTS public.project_documents',
    'REFERENCES public.projects(id) ON DELETE CASCADE',
    "storage_bucket = 'private-documents'",
    'project_documents_path_scoped_chk',
    'ENABLE ROW LEVEL SECURITY',
    'uploaded_by = (SELECT auth.uid())',
    'trg_topline_audit_project_documents',
    'private.audit_log_change()',
    'REVOKE ALL ON public.project_documents FROM anon',
    "split_part(name, '/', 1) = 'projects'",
  ]) check(sql.includes(token), `Migration missing: ${token}`);
  for (const action of ['select', 'insert', 'update', 'delete'])
    check(sql.includes(`current_user_has_permission('projects','${action}')`), `Migration missing projects/${action} permission gate`);
  check(!/INSERT\s+INTO\s+storage\.buckets/i.test(sql), 'Must not create a second storage bucket');
  check(!/DROP\s+POLICY[^;]*Topline private documents/i.test(sql), 'Must not drop existing private-documents policies');
}

const manifest = read('supabase/MIGRATION_MANIFEST.md');
check(manifest.includes(migrationName), 'Migration manifest does not list project_documents migration');

const cmp = read('src/components/admin/ProjectDocumentManager.tsx');
for (const banned of ['localStorage', 'w3.org', 'SAMPLE_PROJECT_DOCUMENTS', 'dummy.pdf', 'Date.now()'])
  check(!cmp.includes(banned), `ProjectDocumentManager still contains fake-data marker: ${banned}`);
for (const required of [".from('project_documents')", "'private-documents'", 'createSignedUrl', '.upload(', '.remove([', 'projects/${project.id}/'])
  check(cmp.includes(required), `ProjectDocumentManager missing: ${required}`);
check(!cmp.includes('getPublicUrl'), 'Private documents must never use public URLs');

if (failures.length) {
  console.error('Project documents verification FAILED.');
  failures.forEach((f) => console.error(`- ${f}`));
  process.exit(1);
}
console.log('Project documents static verification PASSED.');
