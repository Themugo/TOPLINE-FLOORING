import fs from 'node:fs';
const r = fs.readFileSync('supabase/migrations/20261103140000_customer_quotation_response.sql','utf8');
for (const n of ['respond_to_customer_quotation', "SET search_path = ''", 'get_current_customer_id()', "'quoted', 'sent', 'negotiating'", 'valid_until < current_date', 'FOR UPDATE', 'REVOKE ALL ON FUNCTION public.respond_to_customer_quotation(uuid, text, text) FROM PUBLIC, anon']) if (!r.includes(n)) throw new Error('Quotation response migration missing: ' + n);
const d = fs.readFileSync('supabase/migrations/20261103141000_customer_portal_hide_drafts.sql','utf8');
if (!d.includes("q.status <> 'draft'") || !d.includes("i.status <> 'draft'")) throw new Error('portal must hide drafts');
const p = fs.readFileSync('src/pages/portal.tsx','utf8');
for (const n of ['respondToCustomerQuotation', 'Accept quotation', 'Request changes', 'Decline']) if (!p.includes(n)) throw new Error('portal missing: ' + n);
console.log('verify-pass15-portal-business: OK');
