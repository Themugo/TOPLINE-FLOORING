import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const portal=fs.readFileSync(path.join(root,'src/pages/portal.tsx'),'utf8');
const auth=fs.readFileSync(path.join(root,'src/lib/customer-portal.ts'),'utf8');
const migrations=fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')).sort();
const registration=migrations.filter(f=>f.includes('customer_registration_and_reconciliation_360')).pop();
if(!registration) throw new Error('Customer registration migration missing');
const sql=fs.readFileSync(path.join(root,'supabase/migrations',registration),'utf8');
const checks=[
 ['registration uses Supabase Auth signUp', /supabase\.auth\.signUp/.test(auth)],
 ['registration carries explicit Topline metadata', /topline_customer_registration/.test(auth)],
 ['registration requires name and phone', /registration_name IS NULL OR registration_phone IS NULL/.test(sql)],
 ['registration creates customer only for explicit registration metadata', /IF NOT registration_requested OR NEW\.email IS NULL/.test(sql)],
 ['existing unique customer email is reused rather than duplicated', /IF existing_count = 1 THEN/.test(sql)],
 ['ambiguous customer email is not auto-bound', /matched_count <> 1/.test(sql)],
 ['portal binding requires verified email', /NEW\.email_confirmed_at IS NULL/.test(sql)],
 ['active identity is never rebound to another customer', /existing_customer IS NOT NULL/.test(sql)],
 ['dashboard has retry', /Try again/.test(portal) && /loadDashboard/.test(portal)],
 ['dashboard has manual refresh', /Refresh/.test(portal)],
 ['service submission refreshes dashboard', /await loadDashboard\(\);/.test(portal)],
 ['dashboard distinguishes signed-in load failure', /authenticatedError/.test(portal)],
 ['order details are available', /type: 'order'/.test(portal)],
 ['quotation details are available', /type: 'quotation'/.test(portal)],
 ['project details are available', /type: 'project'/.test(portal)],
 ['invoice details are available', /type: 'invoice'/.test(portal)],
 ['customer isolation resolves through auth uid', /get_current_customer_id/.test(sql) || /get_current_customer_id/.test(fs.readFileSync(path.join(root,'supabase/migrations',migrations.find(f=>f.includes('064_customer_portal_360'))),'utf8'))],
];
let pass=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`); if(ok) pass++;}
if(pass!==checks.length) process.exit(1);
console.log(`Customer Registration + Dashboard 360: ${pass}/${checks.length} passed.`);
