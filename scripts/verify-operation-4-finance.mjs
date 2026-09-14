import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd(); const fail=[];
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const mig=fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')).sort();
if(!mig.includes('20260913040000_077_finance_control_360.sql')) fail.push('Operation 4 migration is missing.');
const m=read('supabase/migrations/20260913040000_077_finance_control_360.sql');
for(const x of ['finance_control_events','record_invoice_payment_transaction','reconcile_finance_control_360','get_finance_control_360','payment_refunds','payment_transactions','invoice_events']) if(!m.includes(x)) fail.push(`Finance contract missing: ${x}`);
if(!m.includes("require_staff_permission('finance','update')")) fail.push('Finance mutation does not require finance update permission.');
if(!m.includes("require_staff_permission('reports','select')")) fail.push('Finance snapshot does not require reports read permission.');
if(!m.includes('REVOKE EXECUTE ON FUNCTION public.reconcile_finance_control_360')) fail.push('Reconciliation RPC public execute not revoked.');
if(!read('src/lib/finance-control-360.ts').includes("get_finance_control_360")) fail.push('Finance control client is missing snapshot RPC.');
if(!read('src/pages/admin/finance-operations.tsx').includes('Reconcile finance')) fail.push('Finance operations UI missing reconciliation action.');
const ci=read('.github/workflows/ci.yml'); if(!ci.includes('npm run verify:operation-4-finance')) fail.push('CI missing Operation 4 verifier.');
const pkg=JSON.parse(read('package.json')); if(!pkg.scripts?.['verify:operation-4-finance']) fail.push('package.json missing Operation 4 verifier script.');
if(fail.length){console.error('Operation 4 Finance 360 FAILED'); fail.forEach(x=>console.error('- '+x)); process.exit(1);}
console.log('Operation 4 Finance 360 PASSED'); console.log(`- Active migrations: ${mig.length}`); console.log('- Payment, invoice, refund and reconciliation controls present');
