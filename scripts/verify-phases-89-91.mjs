import fs from 'node:fs';import path from 'node:path';
const root=process.cwd(), mig=path.join(root,'supabase','migrations','20260913000000_073_customer_renewal_orchestration_360.sql');
const files=[mig,path.join(root,'src/lib/customer-renewal-operations-360.ts'),path.join(root,'src/pages/admin/customer-renewals.tsx'),path.join(root,'src/App.tsx'),path.join(root,'package.json')];
for(const f of files)if(!fs.existsSync(f))throw new Error(`Missing ${path.relative(root,f)}`);
const sql=fs.readFileSync(mig,'utf8');for(const x of ['customer_renewal_opportunities','customer_renewal_events','refresh_customer_renewal_opportunities_360','transition_customer_renewal_360','get_customer_renewal_operations_360','get_customer_renewal_history_360','private.require_staff_permission','REVOKE ALL ON FUNCTION'])if(!sql.includes(x))throw new Error(`Missing contract: ${x}`);
const mfs=fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>/^\d{14}_.*\.sql$/.test(f)).sort(), ts=mfs.map(f=>f.slice(0,14));if(new Set(ts).size!==ts.length)throw new Error('Duplicate migration timestamps');for(let i=1;i<ts.length;i++)if(ts[i]<=ts[i-1])throw new Error(`Ordering failure ${mfs[i-1]} -> ${mfs[i]}`);
if(!fs.readFileSync(path.join(root,'src/App.tsx'),'utf8').includes("'/admin/customer-renewals'"))throw new Error('Admin route missing');
const pkg=fs.readFileSync(path.join(root,'package.json'),'utf8');if(!pkg.includes('verify:phases-89-91'))throw new Error('package script missing');console.log(`PASS: Phases 89-91 static gate (${mfs.length} migrations)`);
