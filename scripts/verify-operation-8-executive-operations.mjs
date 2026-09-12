import fs from 'node:fs'; import path from 'node:path';
const root=process.cwd(); const req=[
'supabase/migrations/20260913080000_081_executive_operations_control_360.sql',
'src/lib/executive-operations-360.ts','src/pages/admin/executive-operations-360.tsx',
'docs/OPERATION_8_EXECUTIVE_OPERATIONS_CONTROL_360.md'];
for(const f of req){if(!fs.existsSync(path.join(root,f))) throw new Error(`Missing ${f}`)}
const sql=fs.readFileSync(path.join(root,req[0]),'utf8');
for(const x of ['get_executive_operations_360','reconcile_executive_operations_360','private.require_staff_permission','REVOKE ALL ON public.executive_operations_events','GRANT EXECUTE ON FUNCTION public.get_executive_operations_360(integer) TO authenticated']) if(!sql.includes(x)) throw new Error(`Missing contract: ${x}`);
const app=fs.readFileSync(path.join(root,'src/App.tsx'),'utf8'); if(!app.includes("/admin/executive-operations-360")) throw new Error('Route missing');
console.log('Operation 8 executive operations verification: PASS');
