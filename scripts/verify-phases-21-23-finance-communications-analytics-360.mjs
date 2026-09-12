import fs from 'node:fs';
const migration='supabase/migrations/20260912190000_068_finance_communications_analytics_360_hardening.sql';
const finance='src/lib/finance.ts';
const hooks='src/hooks/use-data.ts';
for(const f of [migration,finance,hooks]) if(!fs.existsSync(f)) throw new Error(`Missing ${f}`);
const sql=fs.readFileSync(migration,'utf8');
for(const token of [
  'remove_invoice_item_transaction','delete_draft_invoice_transaction','get_finance_communications_analytics_360',
  "REVOKE INSERT, UPDATE, DELETE ON public.invoices FROM authenticated",
  "REVOKE INSERT, UPDATE, DELETE ON public.invoice_items FROM authenticated",
  "REVOKE INSERT, UPDATE, DELETE ON public.payments FROM authenticated",
  "REVOKE INSERT, UPDATE, DELETE ON public.customer_communications FROM authenticated",
  "GRANT EXECUTE ON FUNCTION public.remove_invoice_item_transaction(uuid,uuid) TO authenticated",
  "GRANT EXECUTE ON FUNCTION public.delete_draft_invoice_transaction(uuid) TO authenticated"
]) if(!sql.includes(token)) throw new Error(`Missing hardening control: ${token}`);
const h=fs.readFileSync(hooks,'utf8');
for(const token of ['removeInvoiceItemTransaction','deleteDraftInvoiceTransaction']) if(!h.includes(token)) throw new Error(`Hook still bypasses RPC: ${token}`);
const financeSrc=fs.readFileSync(finance,'utf8');
for(const token of ['remove_invoice_item_transaction','delete_draft_invoice_transaction']) if(!financeSrc.includes(token)) throw new Error(`Missing finance client RPC: ${token}`);
console.log('Phases 21–23 Finance, Communications & Analytics 360 hardening verification passed.');
