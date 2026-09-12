import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migration = path.join(root, 'supabase', 'migrations', '20260912050000_production_infrastructure_rls_storage.sql');
const docs = path.join(root, 'docs', 'PHASE_2_REAL_SUPABASE_PRODUCTION.md');
const manifest = path.join(root, 'supabase', 'MIGRATION_MANIFEST.md');
const storage = path.join(root, 'supabase', 'setup_storage.sql');

const required = [
  [migration, 'production infrastructure migration'],
  [docs, 'production infrastructure runbook'],
  [manifest, 'migration manifest'],
];
for (const [file, label] of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${label}: ${file}`);
}
const sql = fs.readFileSync(migration, 'utf8');
for (const token of [
  'ENABLE ROW LEVEL SECURITY',
  'Topline public read images',
  'Topline staff upload images',
  'Topline staff update images',
  'Topline staff delete images',
  "private.current_user_has_permission('media','insert')",
  "private.current_user_has_permission('catalog','insert')",
  'contact_messages_public_insert',
  'leads_public_insert',
  'quotations_public_insert',
]) {
  if (!sql.includes(token)) throw new Error(`Missing Phase 2 contract: ${token}`);
}
if (!fs.readFileSync(manifest, 'utf8').includes('20260912050000_production_infrastructure_rls_storage.sql')) throw new Error('Migration manifest is missing Phase 2 migration');
if (fs.existsSync(storage)) {
  const old = fs.readFileSync(storage, 'utf8');
  if (/allow_upload_images|anon_insert_images_bucket|anon_update_images_bucket|anon_delete_images_bucket/i.test(old)) {
    console.log('NOTE: legacy setup_storage.sql still contains permissive policies; Phase 2 migration explicitly supersedes it.');
  }
}
console.log('Phase 2 Supabase production infrastructure static verification passed.');
