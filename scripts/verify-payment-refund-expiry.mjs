import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const mig=path.join(root,'supabase','migrations');
for (const f of ['20260911180000_054_refunds_and_payment_reconciliation.sql','20260911190000_055_reservation_expiry_and_operations.sql']) {
  if(!fs.existsSync(path.join(mig,f))) throw new Error(`Missing ${f}`);
}
const refund=fs.readFileSync(path.join(mig,'20260911180000_054_refunds_and_payment_reconciliation.sql'),'utf8');
const expiry=fs.readFileSync(path.join(mig,'20260911190000_055_reservation_expiry_and_operations.sql'),'utf8');
const edge=fs.readFileSync(path.join(root,'supabase','functions','expire-reservations','index.ts'),'utf8');
for (const token of ['payment_refunds','create_order_refund_request','complete_order_refund','Refund exceeds refundable amount']) if(!refund.includes(token)) throw new Error(`Refund migration missing ${token}`);
for (const token of ['expire_inventory_reservations','reconcile_order_payment_totals','status=\'expired\'']) if(!expiry.includes(token)) throw new Error(`Expiry migration missing ${token}`);
if(!edge.includes("rpc('expire_inventory_reservations')")) throw new Error('Expiry edge function missing RPC call');
console.log('Payment/refund/expiry verification passed.');
