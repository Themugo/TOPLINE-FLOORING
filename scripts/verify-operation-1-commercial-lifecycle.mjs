import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const must = [
  'supabase/migrations/20260913010000_074_commercial_lifecycle_360.sql',
  'src/lib/lifecycle.ts',
  'src/pages/admin/commercial-lifecycle.tsx',
  'src/pages/admin/sales-command-center.tsx',
  'src/pages/admin/quotations.tsx',
  'src/hooks/use-data.ts',
];
for (const f of must) if (!fs.existsSync(path.join(root,f))) throw new Error(`Missing ${f}`);
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const sql=read(must[0]);
for (const token of ['commercial_lifecycle_events','create_lead_transaction','update_lead_transaction','delete_lead_transaction','create_lead_from_quotation','upsert_quotation_item_transaction','remove_quotation_item_transaction','get_commercial_lifecycle_360','REVOKE INSERT, UPDATE, DELETE ON public.leads','REVOKE INSERT, UPDATE, DELETE ON public.quotation_items','REVOKE UPDATE ON public.quotations']) if (!sql.includes(token)) throw new Error(`Missing commercial control: ${token}`);
for (const token of ['createLeadTransaction','updateLeadTransaction','deleteLeadTransaction']) if (!read(must[1]).includes(token) || !read(must[5]).includes(token)) throw new Error(`Lead client contract missing: ${token}`);
for (const token of ['createLeadFromQuotation','upsertQuotationItem','removeQuotationItem']) if (!read(must[1]).includes(token) || !read(must[4]).includes(token)) throw new Error(`Quotation client contract missing: ${token}`);
if (!read(must[3]).includes('getCommercialLifecycle360')) throw new Error('Sales command center is not server-snapshot driven');
if (!read(must[4]).includes('createLeadFromQuotation') || !read(must[4]).includes('upsertQuotationItem') || !read(must[4]).includes('removeQuotationItem')) throw new Error('Quotation page still uses direct staff mutation');
const routes=read('src/App.tsx'); if (!routes.includes("'/admin/commercial-lifecycle': AdminCommercialLifecycle")) throw new Error('Commercial lifecycle route missing');
console.log('Operation 1 Commercial Lifecycle 360 verification passed.');
