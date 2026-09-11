import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const required=[
 'supabase/migrations/20260911130000_045_installation_workforce.sql',
 'supabase/migrations/20260911140000_046_project_cost_ledger.sql',
 'supabase/migrations/20260911150000_047_warranty_after_sales.sql',
 'src/lib/field-operations.ts','src/lib/project-costs.ts','src/lib/service-cases.ts',
 'src/pages/admin/installation-workforce.tsx','src/pages/admin/project-profitability.tsx','src/pages/admin/service-cases.tsx'
];
for(const f of required) if(!fs.existsSync(path.join(root,f))) throw new Error(`Missing ${f}`);
const migrations=fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>/^202\d+_.+\.sql$/.test(f)).sort();
if(migrations.length<17) throw new Error(`Expected at least 17 active migrations, found ${migrations.length}`);
const all=required.filter(f=>f.endsWith('.sql')).map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
for(const marker of ['installation_assignments','project_cost_entries','service_cases','assign_installation_staff','add_project_cost_entry','create_service_case']) if(!all.includes(marker)) throw new Error(`Missing contract marker ${marker}`);
const app=fs.readFileSync(path.join(root,'src/App.tsx'),'utf8');
for(const route of ['/admin/installation-workforce','/admin/project-profitability','/admin/service-cases']) if(!app.includes(route)) throw new Error(`Missing route ${route}`);
const nav=fs.readFileSync(path.join(root,'src/pages/admin/dashboard.tsx'),'utf8');
for(const route of ['/admin/installation-workforce','/admin/project-profitability','/admin/service-cases']) if(!nav.includes(route)) throw new Error(`Missing navigation ${route}`);
console.log('Phase 45–47 source verification passed.');
console.log(`Active migrations: ${migrations.length}`);
