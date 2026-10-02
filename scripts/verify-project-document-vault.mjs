import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = [];
const migration = '20260930180000_project_documents_private_storage.sql';
const sql = read(`supabase/migrations/${migration}`);
const component = read('src/components/admin/ProjectDocumentManager.tsx');
const types = read('src/lib/types.ts');

for (const required of [
  'CREATE TABLE IF NOT EXISTS public.project_documents',
  'project_id uuid NOT NULL REFERENCES public.projects(id)',
  'file_name text NOT NULL',
  'storage_bucket text NOT NULL DEFAULT \'private-documents\'',
  'storage_path text NOT NULL UNIQUE',
  'file_size_bytes bigint NOT NULL',
  'ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY',
  "private.current_user_has_permission('projects','select')",
  "private.current_user_has_permission('projects','insert')",
  "private.current_user_has_permission('projects','update')",
  "private.current_user_has_permission('projects','delete')",
  'trg_topline_audit_project_documents',
  'Topline project documents read',
  'Topline project documents upload',
  'Topline project documents delete',
]) if (!sql.includes(required)) fail.push(`Migration missing: ${required}`);

for (const required of [
  "from('project_documents')",
  "from(DOCUMENT_BUCKET)\n        .upload",
  'createSignedUrl',
  "from(DOCUMENT_BUCKET).remove",
  'supabase.auth.getUser()',
]) {
  if (!component.includes(required)) fail.push(`Document component missing: ${required}`);
}
for (const forbidden of [
  'localStorage',
  'w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
]) if (component.includes(forbidden)) fail.push(`Production document component still contains forbidden fallback: ${forbidden}`);

for (const required of ['storage_path: string;', 'mime_type: string;', 'file_size_bytes: number;', 'uploaded_by: string | null;']) {
  if (!types.includes(required)) fail.push(`ProjectDocument type missing: ${required}`);
}

const manifest = read('supabase/MIGRATION_MANIFEST.md');
if (!manifest.includes(migration)) fail.push('Migration manifest missing canonical project document migration.');
const activeMigrationCount = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((file) => file.endsWith('.sql')).length;
if (!manifest.includes(`contains ${activeMigrationCount} uniquely timestamped active migrations`)) fail.push(`Migration manifest count is stale; expected ${activeMigrationCount}.`);
if (fs.existsSync(path.join(root, 'supabase/migrations/20260930190000_project_document_vault_360.sql')))
  fail.push('Redundant duplicate project document vault migration still exists.');

if (fail.length) {
  console.error('Project document vault verification FAILED.');
  fail.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log('Project document vault verification PASSED.');
console.log('- Canonical project_documents table and metadata contract present.');
console.log('- Private Storage upload/signed URL/delete flow present.');
console.log('- Staff RLS and audit trigger present.');
console.log('- Fake/localStorage document fallback removed.');
