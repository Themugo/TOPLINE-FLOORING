import fs from 'node:fs';
const required=['supabase/migrations/20260910160000_finance_communications_analytics.sql','src/lib/finance.ts','src/lib/communications.ts','src/pages/admin/financial-command-center.tsx'];
for(const f of required) if(!fs.existsSync(f)) throw new Error(`Missing ${f}`);
const sql=fs.readFileSync(required[0],'utf8'); for(const token of ['create_invoice_transaction','record_invoice_payment_transaction','customer_communications','log_customer_communication','get_business_analytics']) if(!sql.includes(token)) throw new Error(`Missing ${token}`);
console.log('Phase 21–23 source verification passed.');
