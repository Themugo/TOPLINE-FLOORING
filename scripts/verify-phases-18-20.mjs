import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const required = [
  'supabase/migrations/20260910150000_project_delivery_field_operations.sql',
  'src/pages/admin/project-delivery.tsx',
  'src/lib/lifecycle.ts',
];
for (const file of required) if (!fs.existsSync(path.join(root,file))) throw new Error(`Missing ${file}`);
const sql = fs.readFileSync(path.join(root, required[0]), 'utf8');
for (const token of ['project_tasks','project_material_allocations','project_issues','project_signoffs','update_project_progress','allocate_project_material','complete_project_with_signoff']) if (!sql.includes(token)) throw new Error(`Missing delivery contract: ${token}`);
const app = fs.readFileSync(path.join(root,'src/App.tsx'),'utf8');
if (!app.includes("'/admin/project-delivery': AdminProjectDelivery")) throw new Error('Project delivery route missing');
const nav = fs.readFileSync(path.join(root,'src/pages/admin/dashboard.tsx'),'utf8');
if (!nav.includes("/admin/project-delivery")) throw new Error('Project delivery navigation missing');
console.log('Phase 18-20 source verification passed.');
