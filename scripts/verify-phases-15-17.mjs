import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const required = [
  'src/lib/lifecycle.ts',
  'src/pages/admin/site-visits.tsx',
  'supabase/migrations/20260910140000_sales_project_lifecycle.sql',
  'supabase/migrations/20260912170000_066_sales_project_lifecycle_360_hardening.sql',
  'docs/PHASES_15_17_SALES_PROJECT_LIFECYCLE.md',
];
for (const file of required) if (!fs.existsSync(path.join(root,file))) throw new Error(`Missing ${file}`);
const lifecycle = fs.readFileSync(path.join(root,'src/lib/lifecycle.ts'),'utf8');
const migration = fs.readFileSync(path.join(root,'supabase/migrations/20260910140000_sales_project_lifecycle.sql'),'utf8');
const hardening = fs.readFileSync(path.join(root,'supabase/migrations/20260912170000_066_sales_project_lifecycle_360_hardening.sql'),'utf8');
const quote = fs.readFileSync(path.join(root,'src/pages/admin/quotations.tsx'),'utf8');
const hooks = fs.readFileSync(path.join(root,'src/hooks/use-data.ts'),'utf8');
for (const token of ['convert_quotation_to_order','convert_lead_to_customer','create_site_visit','update_site_visit_status']) if (!migration.includes(token) || !lifecycle.includes(token)) throw new Error(`Missing lifecycle contract ${token}`);
for (const token of ['sales_project_lifecycle_events','pg_advisory_xact_lock','Only an accepted quotation','Assigned staff member is not active','Completed site visits cannot be reopened']) if (!hardening.includes(token)) throw new Error(`Missing lifecycle hardening control ${token}`);
if (!quote.includes("transition_quotation_status")) throw new Error('Quotation status changes are not using transactional lifecycle RPC');
if (!fs.readFileSync(path.join(root,'src/pages/admin/site-visits.tsx'),'utf8').includes('scheduledTime')) throw new Error('Site visit UI does not capture scheduled time');
if (!quote.includes('convertQuotationToOrder')) throw new Error('Quotation page is not using transactional conversion');
if (!hooks.includes('convertLeadToCustomer')) throw new Error('Lead conversion is not using transactional conversion');
console.log('Phase 15–17 source verification passed.');
