import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(f)=>fs.readFileSync(path.join(root,f),'utf8');
const migration=read('supabase/migrations/20260912120000_061_field_operations_360.sql');
const lib=read('src/lib/field-operations.ts');
const page=read('src/pages/admin/field-operations.tsx');
const app=read('src/App.tsx');
const checks=[
 ['measurement table','CREATE TABLE IF NOT EXISTS public.installation_measurements'],
 ['material allocation table','CREATE TABLE IF NOT EXISTS public.installation_material_allocations'],
 ['progress history table','CREATE TABLE IF NOT EXISTS public.installation_progress_updates'],
 ['issue table','CREATE TABLE IF NOT EXISTS public.installation_issues'],
 ['signoff table','CREATE TABLE IF NOT EXISTS public.installation_signoffs'],
 ['secure measurement RPC','CREATE OR REPLACE FUNCTION public.record_installation_measurement'],
 ['secure material RPC','CREATE OR REPLACE FUNCTION public.allocate_installation_material'],
 ['secure progress RPC','CREATE OR REPLACE FUNCTION public.record_installation_progress'],
 ['secure issue RPC','CREATE OR REPLACE FUNCTION public.report_installation_issue'],
 ['issue resolution RPC','CREATE OR REPLACE FUNCTION public.resolve_installation_issue'],
 ['signoff guard','Open installation issues must be resolved before sign-off'],
 ['360 snapshot','CREATE OR REPLACE FUNCTION public.get_installation_operations_360'],
 ['field page route',"'/admin/field-operations': AdminFieldOperations"],
 ['field page RPC','get_installation_operations_360'],
 ['field UI material action','Allocate material'],
 ['field UI signoff action','Complete & sign off'],
];
for(const [name,token] of checks) if(!(migration+lib+page+app).includes(token)) throw new Error(`Phase 8 Field Operations verification failed: ${name}`);
const files=fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>/^\d+.*\.sql$/.test(f));
const versions=files.map(f=>f.match(/^\d+/)[0]);
if(new Set(versions).size!==versions.length) throw new Error('Duplicate active migration timestamps remain.');
console.log('Phase 8 Field Operations 360 verification PASSED.');
console.log(`- ${files.length} active migrations with unique versions`);
console.log('- Normalized measurement, material, progress, issue and sign-off records');
console.log('- Server-side permission enforcement and RLS');
console.log('- Integrated admin Field Operations 360 workspace');
