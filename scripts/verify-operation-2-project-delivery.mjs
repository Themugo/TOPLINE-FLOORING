import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'supabase/migrations/20260913020000_075_project_delivery_360.sql',
  'src/lib/project-delivery-360.ts',
  'src/pages/admin/project-delivery-360.tsx',
  'docs/OPERATION_2_PROJECT_DELIVERY_360.md',
];
for (const file of required) if (!fs.existsSync(path.join(root,file))) throw new Error(`Missing ${file}`);
const sql = fs.readFileSync(path.join(root,required[0]),'utf8');
for (const token of ['project_delivery_events','project_quality_inspections','record_project_quality_inspection','update_project_delivery_status','reconcile_project_delivery_360','get_project_delivery_360','complete_project_with_signoff']) {
  if (!sql.includes(token)) throw new Error(`Missing SQL contract: ${token}`);
}
if (!/SECURITY DEFINER SET search_path=public,private/.test(sql)) throw new Error('Missing secure search_path contract');
if (!/REVOKE INSERT, UPDATE, DELETE ON public\.project_delivery_events, public\.project_quality_inspections FROM authenticated/.test(sql)) throw new Error('Missing execution-table mutation revoke');
const app = fs.readFileSync(path.join(root,'src/App.tsx'),'utf8');
if (!app.includes("'/admin/project-delivery-360'")) throw new Error('Project Delivery 360 route missing');
const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
if (!pkg.scripts['verify:operation-2-project-delivery']) throw new Error('Package verifier script missing');
const migrations = fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')).sort();
const names = migrations.map(f=>f.slice(0,14));
if (new Set(names).size !== names.length) throw new Error('Duplicate migration timestamps');
for (let i=1;i<names.length;i++) if (names[i] <= names[i-1]) throw new Error(`Migration ordering failure: ${migrations[i-1]} -> ${migrations[i]}`);
console.log(`Operation 2 verification passed: ${migrations.length} migrations; Project Delivery 360 contracts present.`);
