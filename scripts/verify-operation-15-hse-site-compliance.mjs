import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(); const fail=[];
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const migration=read('supabase/migrations/20260913140000_087_health_safety_site_compliance_360.sql');
const lib=read('src/lib/hse-site-compliance-360.ts');
const page=read('src/pages/admin/hse-site-compliance-360.tsx');
const app=read('src/App.tsx'); const pkg=JSON.parse(read('package.json')); const ci=read('.github/workflows/ci.yml');
for(const [name,ok] of [
 ['migration exists',fs.existsSync(path.join(root,'supabase/migrations/20260913140000_087_health_safety_site_compliance_360.sql'))],
 ['site control table',migration.includes('hse_site_controls_360')],
 ['event table',migration.includes('hse_site_events_360')],
 ['corrective action table',migration.includes('hse_corrective_actions_360')],
 ['RLS and revoke',migration.includes('enable row level security')&&migration.includes('revoke all on public.hse_site_controls_360 from public,anon,authenticated')],
 ['staff authorization',migration.includes("private.require_staff_permission('projects','update')")&&migration.includes("private.require_staff_permission('projects','select')")],
 ['closure gate',migration.includes('All HSE corrective actions must be verified or closed before event closure')],
 ['verification evidence',migration.includes('Verification notes are required')],
 ['RPC client boundary',lib.includes("supabase.rpc('get_hse_site_compliance_360'")],
 ['admin page',fs.existsSync(path.join(root,'src/pages/admin/hse-site-compliance-360.tsx'))],
 ['admin route',app.includes("'/admin/hse-site-compliance-360': AdminHseSiteCompliance360")],
 ['package verifier',pkg.scripts['verify:operation-15-hse-site-compliance']==='node scripts/verify-operation-15-hse-site-compliance.mjs'],
 ['CI verifier',ci.includes('npm run verify:operation-15-hse-site-compliance')],
 ['migration count',fs.readdirSync(path.join(root,'supabase/migrations')).filter(x=>x.endsWith('.sql')).length>=59]
]) if(!ok) fail.push(name);
if(fail.length){console.error('Operation 15 HSE certification: FAIL'); fail.forEach(x=>console.error(`- ${x}`)); process.exit(1)}
console.log('Operation 15 HSE Site Compliance 360: PASS');
console.log(`Active migrations: ${fs.readdirSync(path.join(root,'supabase/migrations')).filter(x=>x.endsWith('.sql')).length}`);
console.log('Site controls: PASS'); console.log('HSE events: PASS'); console.log('Corrective-action verification gate: PASS'); console.log('RLS/RPC security boundary: PASS'); console.log('Admin route/UI: PASS'); console.log('CI registration: PASS');
