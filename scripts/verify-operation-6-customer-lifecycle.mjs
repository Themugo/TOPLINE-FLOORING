import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const migration = path.join(root,'supabase/migrations/20260913060000_079_customer_lifecycle_360.sql');
const sql = fs.readFileSync(migration,'utf8');
const required = [
  'customer_after_sales_events','reconcile_customer_lifecycle_360','get_customer_lifecycle_360',
  'get_customer_lifecycle_operations_360','service_cases','service_case_feedback',
  'maintenance_plans','maintenance_plan_visits','customer_renewal_opportunities',
  "REVOKE ALL ON FUNCTION public.reconcile_customer_lifecycle_360() FROM PUBLIC,anon"
];
for (const x of required) if (!sql.includes(x)) throw new Error(`Operation 6 contract missing: ${x}`);
for (const f of ['src/lib/customer-lifecycle-360.ts','src/pages/admin/customer-lifecycle-360.tsx']) if (!fs.existsSync(path.join(root,f))) throw new Error(`Missing ${f}`);
const app=fs.readFileSync(path.join(root,'src/App.tsx'),'utf8');
if (!app.includes("'/admin/customer-lifecycle-360': AdminCustomerLifecycle360")) throw new Error('Operation 6 route missing');
const migrations=fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')).sort();
if (migrations.at(-1)!=='20260913060000_079_customer_lifecycle_360.sql') throw new Error('Operation 6 migration is not latest');
console.log(`Operation 6 verification passed: ${migrations.length} migrations, ${migrations.at(-1)}`);
