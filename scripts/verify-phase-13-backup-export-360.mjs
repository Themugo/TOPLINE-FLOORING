import fs from 'node:fs';
import path from 'node:path';
const required = [
  'supabase/migrations/20260912160000_065_backup_export_operations_360.sql',
  'supabase/functions/customer-data-export/index.ts',
  'src/pages/admin/backups.tsx',
  'docs/PHASE_13_BACKUP_EXPORT_OPERATIONS_360.md'
];
const missing = required.filter(f => !fs.existsSync(path.resolve(f)));
if (missing.length) throw new Error(`Missing Phase 13 files: ${missing.join(', ')}`);
const sql = fs.readFileSync(required[0], 'utf8');
for (const token of ['data_export_events','create_operational_data_export','payload_hash','row_counts','REVOKE ALL ON FUNCTION public.create_operational_data_export']) if (!sql.includes(token)) throw new Error(`Missing SQL contract: ${token}`);
const fn = fs.readFileSync(required[1], 'utf8');
for (const token of ["req.method !== 'POST'", "rpc('create_operational_data_export')"]) if (!fn.includes(token)) throw new Error(`Missing export function control: ${token}`);
const page = fs.readFileSync(required[2], 'utf8');
for (const token of ["functions.invoke('customer-data-export'", 'POST', 'payload_hash']) if (!page.includes(token)) throw new Error(`Missing admin export integration: ${token}`);
const versions = fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).map(f => f.slice(0,14)).filter(v => /^\d{14}$/.test(v));
if (new Set(versions).size !== versions.length) throw new Error('Duplicate migration versions detected');
console.log('Phase 13 Backup & Export Operations 360 verification passed.');
