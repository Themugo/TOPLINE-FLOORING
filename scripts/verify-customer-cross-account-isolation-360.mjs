import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20261002130000_customer_registration_and_reconciliation_360.sql'),'utf8');
const portal=fs.readFileSync(path.join(root,'src/pages/portal.tsx'),'utf8');
const checks=[
 ['portal identity comes only from auth.uid', /get_current_customer_id\(\)/.test(migration)],
 ['customer payload is filtered by bound customer id', /FROM public\.customers c WHERE c\.id=cid/.test(migration)],
 ['quotations are filtered by bound customer id or exact bound email', /q\.customer_id=cid OR \(q\.customer_id IS NULL AND lower\(q\.email\)=lower\(/.test(migration)],
 ['orders are filtered by bound customer id or exact bound email', /o\.customer_id=cid OR \(o\.customer_id IS NULL AND lower\(o\.customer_email\)=lower\(/.test(migration)],
 ['projects are filtered by bound customer id', /FROM public\.projects p WHERE p\.customer_id=cid/.test(migration)],
 ['invoices are filtered by bound customer id', /FROM public\.invoices i WHERE i\.customer_id=cid/.test(migration)],
 ['service cases are filtered by bound customer id', /FROM public\.service_cases s WHERE s\.customer_id=cid/.test(migration)],
 ['site visits are filtered by bound customer id', /FROM public\.site_visits v WHERE v\.customer_id=cid/.test(migration)],
 ['installations are filtered through customer-owned project/order', /WHERE p\.customer_id=cid OR o\.customer_id=cid/.test(migration)],
 ['customer cannot select another customer id from dashboard', !/customerId.*selectedRecord|customer_id.*selectedRecord/.test(portal)],
 ['service submission uses current dashboard customer only', /data\?\.customer\.id/.test(portal)],
 ['cross-account direct table access is not needed by portal', !/supabase\.from\(['"](customers|orders|quotations|projects|invoices|service_cases)['"]\)/.test(portal)],
];
let pass=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`); if(ok) pass++;}
console.log(`Customer cross-account isolation: ${pass}/${checks.length} passed.`);
if(pass!==checks.length) process.exit(1);
