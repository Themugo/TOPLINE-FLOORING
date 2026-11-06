import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationDir = path.join(root,'supabase','migrations');
const migration = path.join(migrationDir,'20260912230000_072_maintenance_retention_360.sql');
const lib = path.join(root,'src','lib','maintenance-operations-360.ts');
const page = path.join(root,'src','pages','admin','maintenance-plans.tsx');
const app = path.join(root,'src','App.tsx');
const pkg = path.join(root,'package.json');
for (const f of [migration,lib,page,app,pkg]) if (!fs.existsSync(f)) throw new Error(`Missing ${path.relative(root,f)}`);
const sql=fs.readFileSync(migration,'utf8');
for (const token of ['maintenance_plans','maintenance_plan_visits','create_maintenance_plan_360','schedule_maintenance_visit_360','complete_maintenance_visit_360','transition_maintenance_plan_360','get_maintenance_operations_360','get_customer_maintenance_plans_360','private.require_staff_permission','REVOKE ALL ON FUNCTION']) if (!sql.includes(token)) throw new Error(`Missing SQL contract: ${token}`);
const files=fs.readdirSync(migrationDir).filter(f=>/^\d{14}_.*\.sql$/.test(f)).sort();
const ts=files.map(f=>f.slice(0,14)); if(new Set(ts).size!==ts.length) throw new Error('Duplicate migration timestamps');
for(let i=1;i<ts.length;i++) if(ts[i]<=ts[i-1]) throw new Error(`Migration ordering failure: ${files[i-1]} -> ${files[i]}`);
if (!fs.readFileSync(pkg,'utf8').includes('verify:phases-86-88')) throw new Error('package.json missing verifier');
const appText=fs.readFileSync(app,'utf8'); if(!appText.includes("/admin/maintenance-plans")) throw new Error('Admin route missing');
console.log(`PASS: Phases 86-88 static gate (${files.length} migrations)`);
