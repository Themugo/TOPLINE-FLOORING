import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const assert=(ok,msg)=>{if(!ok) throw new Error(msg)};
const migrations=fs.readdirSync(path.join(root,'supabase/migrations')).filter(x=>x.endsWith('.sql')).sort();
const target=migrations.find(x=>x.includes('078_fulfillment_delivery_control_360'));
assert(target,'Operation 5 migration missing');
assert(target==='20260913050000_078_fulfillment_delivery_control_360.sql','Operation 5 migration timestamp/name mismatch');
const sql=read(`supabase/migrations/${target}`);
for (const fn of ['check_order_fulfillment_readiness','mark_order_ready_for_fulfillment','assign_delivery_driver','mark_delivery_picked','reschedule_order_delivery','record_delivery_exception','recover_failed_delivery','get_fulfillment_delivery_360','get_active_delivery_drivers']) assert(sql.includes(`FUNCTION public.${fn}`),`Missing ${fn}`);
for (const phrase of ['assigned_driver_user_id','ready_at','picked_at','failed_at','exception_count','fulfillment_events',"v_payment <> 'paid'",'Delivery address is required before dispatch','active staff member']) assert(sql.includes(phrase),`Missing control: ${phrase}`);
assert(sql.includes('REVOKE ALL ON FUNCTION public.mark_order_ready_for_fulfillment'), 'Mutation RPC revoke missing');
assert(sql.includes('GRANT EXECUTE ON FUNCTION public.get_fulfillment_delivery_360(integer) TO authenticated'), 'Snapshot grant missing');
const app=read('src/App.tsx'); assert(app.includes("/admin/fulfillment-delivery-360"),'Route missing');
const page=read('src/pages/admin/fulfillment-delivery-360.tsx'); assert(page.includes('getFulfillmentDelivery360')&&page.includes('assignDeliveryDriver'),'Fulfillment UI incomplete');
const lib=read('src/lib/fulfillment-delivery-360.ts'); assert(lib.includes("get_fulfillment_delivery_360")&&lib.includes("assign_delivery_driver"),'Fulfillment client contract incomplete');
const pkg=JSON.parse(read('package.json')); pkg.scripts ||= {}; // CI runner may call direct node script.
console.log(`Operation 5 verification passed: ${migrations.length} migrations, ${target}`);
