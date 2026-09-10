import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'src/pages/admin/sales-command-center.tsx',
  'src/pages/admin/operations-command-center.tsx',
  'docs/PHASE_6_SALES_OPERATIONS.md',
  'docs/PHASE_7_OPERATIONS_COMMAND_CENTER.md',
  'docs/PHASE_8_PORTAL_RESILIENCE.md',
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing ${file}`);
}
const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
for (const route of ['/admin/sales', '/admin/operations']) {
  if (!app.includes(route)) throw new Error(`Missing route ${route}`);
}
const dashboard = fs.readFileSync(path.join(root, 'src/pages/admin/dashboard.tsx'), 'utf8');
if (!dashboard.includes('Topline Business Portal')) throw new Error('Portal branding not updated');
console.log('Phase 6–8 source verification passed.');
