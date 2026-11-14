import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { formatKES } from '@/lib/utils';
import { dispatchDelivery, markInTransit, completeDelivery, failDelivery } from '@/lib/delivery';
import { assignDeliveryDriver, getActiveDeliveryDrivers, markOrderReadyForFulfillment } from '@/lib/fulfillment-delivery-360';
import { CheckCircle2, Truck, XCircle } from 'lucide-react';

type DeliveryOrder = { id: string; order_number?: string | null; customer_name?: string | null; customer_phone?: string | null; total_amount?: number | null; status?: string | null };
type Driver = { user_id: string; display_name: string; phone: string | null };
type DeliveryRow = { id: string; order_id: string; assigned_driver_user_id?: string | null; tracking_number?: string | null; driver_name?: string | null; status: string; scheduled_date?: string | null; order?: DeliveryOrder | null };

export default function AdminDeliveries() {
  const [rows,setRows]=useState<DeliveryRow[]>([]); const [awaiting,setAwaiting]=useState<DeliveryOrder[]>([]); const [drivers,setDrivers]=useState<Driver[]>([]); const [loading,setLoading]=useState(true); const {toast}=useToast();
  const load=useCallback(async()=>{setLoading(true); const {data,error}=await supabase.from('deliveries').select('*, order:orders(id,order_number,customer_name,customer_phone,total_amount,status)').order('created_at',{ascending:false}); if(error) toast({title:'Unable to load deliveries',description:error.message,variant:'destructive'}); const list=(data||[]) as DeliveryRow[]; setRows(list);
    // Paid orders that have no delivery yet: without this list there is no way to start the delivery workflow.
    const {data:paid}=await supabase.from('orders').select('id,order_number,customer_name,customer_phone,total_amount,status').eq('payment_status','paid').in('status',['pending','confirmed','processing']).order('created_at',{ascending:false}).limit(100);
    const withDelivery=new Set(list.filter(r=>!['cancelled'].includes(r.status)).map(r=>r.order_id));
    setAwaiting(((paid||[]) as DeliveryOrder[]).filter(o=>!withDelivery.has(o.id)));
    try{setDrivers(await getActiveDeliveryDrivers());}catch{setDrivers([]);}
    setLoading(false);},[toast]);
  useEffect(()=>{void load();},[load]);
  const run=async(fn:()=>Promise<unknown>, title:string)=>{try{await fn();toast({title});await load();}catch(e){toast({title:'Delivery action failed',description:e instanceof Error?e.message:'Please try again',variant:'destructive'});}};
  const markReady=async(orderId:string)=>run(()=>markOrderReadyForFulfillment(orderId), 'Order marked ready — delivery created');
  const assign=async(deliveryId:string,driverId:string)=>{ if(driverId) await run(()=>assignDeliveryDriver(deliveryId,driverId),'Driver assigned'); };
  const fail=(r:DeliveryRow)=>{ const reason=window.prompt('Why did this delivery fail? (shown in the audit trail)'); if(reason&&reason.trim()) void run(()=>failDelivery(r.id,reason.trim()),'Marked failed'); };
  const complete=(r:DeliveryRow)=>{ const who=window.prompt('Who received the delivery?',r.order?.customer_name||''); if(who&&who.trim()) void run(()=>completeDelivery({deliveryId:r.id,recipientName:who.trim()}),'Delivery completed'); };
  return <AdminLayout title="Delivery Operations" subtitle="Plan, dispatch, track and complete customer deliveries from one controlled workflow.">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-6">{['pending','dispatched','in_transit','delivered'].map(s=><div key={s} className="surface p-5"><p className="eyebrow">{s.replace('_',' ')}</p><p className="mt-2 text-2xl font-bold">{rows.filter(r=>r.status===s).length}</p></div>)}</div>
    {awaiting.length>0&&<div className="surface p-5 mb-6"><p className="font-semibold">Paid orders awaiting fulfilment ({awaiting.length})</p><p className="text-sm text-muted-foreground mb-3">Mark an order ready to create its delivery, then assign a driver and dispatch.</p><div className="space-y-2">{awaiting.map(o=><div key={o.id} className="flex flex-wrap items-center justify-between gap-3 border-b pb-2 text-sm"><span><span className="font-mono">{o.order_number||o.id.slice(0,8)}</span> · {o.customer_name||'—'} · {formatKES(Number(o.total_amount||0))}</span><button className="btn-primary" onClick={()=>markReady(o.id)}>Mark ready</button></div>)}</div></div>}
    <div className="table-shell"><div className="overflow-x-auto"><table className="w-full"><thead><tr><th>Tracking</th><th>Order</th><th>Customer</th><th>Amount</th><th>Status</th><th>Schedule</th><th>Actions</th></tr></thead><tbody>{loading?<tr><td colSpan={7} className="p-8 text-center">Loading deliveries…</td></tr>:rows.length?rows.map(r=><tr key={r.id}><td className="font-mono text-sm">{r.tracking_number||'—'}</td><td>{r.order?.order_number||r.order_id.slice(0,8)}</td><td>{r.order?.customer_name||'—'}<div className="text-xs text-muted-foreground">{r.driver_name||'No driver assigned'}</div></td><td>{formatKES(Number(r.order?.total_amount||0))}</td><td><span className="chip">{r.status}</span></td><td>{r.scheduled_date||'Unscheduled'}</td><td className="flex gap-2 py-3">{['pending','processing'].includes(r.status)&&<select className="input h-9 text-sm" value={r.assigned_driver_user_id||''} onChange={e=>void assign(r.id,e.target.value)} aria-label="Assign driver"><option value="">{drivers.length?'Assign driver…':'No active drivers'}</option>{drivers.map(d=><option key={d.user_id} value={d.user_id}>{d.display_name}</option>)}</select>}{['pending','processing'].includes(r.status)&&<button className="btn-primary disabled:opacity-50" disabled={!r.assigned_driver_user_id} title={r.assigned_driver_user_id?'':'Assign a driver before dispatch'} onClick={()=>run(()=>dispatchDelivery(r.id),'Dispatched')}>Dispatch</button>}{r.status==='dispatched'&&<button className="btn-secondary" onClick={()=>run(()=>markInTransit(r.id),'Marked in transit')}>In transit</button>}{['dispatched','in_transit'].includes(r.status)&&<button className="btn-primary" onClick={()=>complete(r)} aria-label="Complete delivery"><CheckCircle2 className="w-4 h-4"/></button>}{!['delivered','failed','cancelled'].includes(r.status)&&<button className="btn-secondary" onClick={()=>fail(r)} aria-label="Mark failed"><XCircle className="w-4 h-4"/></button>}</td></tr>):<tr><td colSpan={7} className="p-10 text-center text-muted-foreground">No deliveries have been created yet.</td></tr>}</tbody></table></div></div>
    <div className="mt-6 surface-soft p-5 flex gap-3"><Truck className="w-5 h-5 text-primary-600 mt-0.5"/><div><p className="font-semibold">Delivery lifecycle</p><p className="text-sm text-muted-foreground mt-1">Pending → Processing → Dispatched → In transit → Delivered. Proof of delivery is recorded at completion.</p></div></div>
  </AdminLayout>;
}
