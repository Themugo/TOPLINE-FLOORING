import fs from 'node:fs';
import path from 'node:path';

const required = [
  'supabase/migrations/20260912160000_065_backup_export_operations_360.sql',
  'supabase/migrations/20260914102545_admin_control_plane_privileged_operations_360.sql',
  'supabase/migrations/20261107180000_phase13_export_integrity_and_audit_access_hardening.sql',
  'supabase/functions/customer-data-export/index.ts',
  'src/pages/admin/backups.tsx',
  'docs/PHASE_13_BACKUP_EXPORT_OPERATIONS_360.md',
];
const missing = required.filter((file) => !fs.existsSync(path.resolve(file)));
if (missing.length) throw new Error(`Missing Phase 13 files: ${missing.join(', ')}`);

const migration = fs.readFileSync(required[2], 'utf8');
for (const token of [
  'data_export_events',
  "private.require_staff_permission('system', 'read')",
  "pg_catalog.sha256(convert_to((payload -> 'tables')::text, 'UTF8'))",
  "'hash_algorithm', 'SHA-256'",
  "'hash_scope', 'payload.tables'",
  'REVOKE ALL ON TABLE public.data_export_events FROM PUBLIC, anon, authenticated',
  "USING (private.current_user_has_permission('system', 'read'))",
  'REVOKE ALL ON FUNCTION public.create_operational_data_export() FROM PUBLIC, anon',
]) if (!migration.includes(token)) throw new Error(`Missing Phase 13 hardening contract: ${token}`);
if (/\bmd5\s*\(/i.test(migration)) throw new Error('Weak MD5 digest remains in the Phase 13 effective migration.');

const fn = fs.readFileSync(required[3], 'utf8');
for (const token of ["req.method !== 'POST'", "rpc('create_operational_data_export')"]) {
  if (!fn.includes(token)) throw new Error(`Missing export function control: ${token}`);
}
const page = fs.readFileSync(required[4], 'utf8');
for (const token of ["functions.invoke('customer-data-export'", 'POST', 'payload_hash']) {
  if (!page.includes(token)) throw new Error(`Missing admin export integration: ${token}`);
}
const versions = fs.readdirSync('supabase/migrations').filter((file) => file.endsWith('.sql')).map((file) => file.slice(0, 14)).filter((version) => /^\d{14}$/.test(version));
if (new Set(versions).size !== versions.length) throw new Error('Duplicate migration versions detected');
console.log('Phase 13 Backup & Export Operations 360 verification passed.');
