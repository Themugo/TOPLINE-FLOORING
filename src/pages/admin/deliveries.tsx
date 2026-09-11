import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { formatKES } from '@/lib/utils';
import { createOrderDelivery, dispatchDelivery, markInTransit, completeDelivery, failDelivery } from '@/lib/delivery';
import { CheckCircle2, Truck, XCircle } from 'lucide-react';

type DeliveryOrder = { id: string; order_number?: string | null; customer_name?: string | null; customer_phone?: string | null; total_amount?: number | null; status?: string | null };
type DeliveryRow = { id: string; order_id: string; tracking_number?: string | null; driver_name?: string | null; status: string; scheduled_date?: string | null; order?: DeliveryOrder | null };

export default function AdminDeliveries() {
  const [rows,setRows]=useState<DeliveryRow[]>([]); const [loading,setLoading]=useState(true); const {toast}=useToast();
  const load=useCallback(async()=>{setLoading(true); const {data,error}=await supabase.from('deliveries').select('*, order:orders(id,order_number,customer_name,customer_phone,total_amount,status)').order('created_at',{ascending:false}); if(error) toast({title:'Unable to load deliveries',description:error.message,variant:'destructive'}); setRows((data||[]) as DeliveryRow[]); setLoading(false);},[toast]);
  useEffect(()=>{void load();},[load]);
  const run=async(fn:()=>Promise<unknown>, title:string)=>{try{await fn();toast({title});await load();}catch(e){toast({title:'Delivery action failed',description:e instanceof Error?e.message:'Please try again',variant:'destructive'});}};
  const create=async(orderId:string)=>run(()=>createOrderDelivery({orderId}), 'Delivery created');
  return <AdminLayout title="Delivery Operations" subtitle="Plan, dispatch, track and complete customer deliveries from one controlled workflow.">
    <div className="grid gap-4 sm:grid-cols-4 mb-6">{['pending','dispatched','in_transit','delivered'].map(s=><div key={s} className="surface p-5"><p className="eyebrow">{s.replace('_',' ')}</p><p className="mt-2 text-2xl font-bold">{rows.filter(r=>r.status===s).length}</p></div>)}</div>
    <div className="table-shell"><div className="overflow-x-auto"><table className="w-full"><thead><tr><th>Tracking</th><th>Order</th><th>Customer</th><th>Amount</th><th>Status</th><th>Schedule</th><th>Actions</th></tr></thead><tbody>{loading?<tr><td colSpan={7} className="p-8 text-center">Loading deliveries…</td></tr>:rows.length?rows.map(r=><tr key={r.id}><td className="font-mono text-sm">{r.tracking_number||'—'}</td><td>{r.order?.order_number||r.order_id.slice(0,8)}</td><td>{r.order?.customer_name||'—'}<div className="text-xs text-muted-foreground">{r.driver_name||'No driver assigned'}</div></td><td>{formatKES(Number(r.order?.total_amount||0))}</td><td><span className="chip">{r.status}</span></td><td>{r.scheduled_date||'Unscheduled'}</td><td className="flex gap-2 py-3">{!r.tracking_number&&<button className="btn-secondary" onClick={()=>create(r.order_id)}>Create</button>}{['pending','processing'].includes(r.status)&&<button className="btn-primary" onClick={()=>run(()=>dispatchDelivery(r.id),'Dispatched')}>Dispatch</button>}{r.status==='dispatched'&&<button className="btn-secondary" onClick={()=>run(()=>markInTransit(r.id),'Marked in transit')}>In transit</button>}{['dispatched','in_transit'].includes(r.status)&&<button className="btn-primary" onClick={()=>run(()=>completeDelivery({deliveryId:r.id,recipientName:r.order?.customer_name||'Customer'}),'Delivery completed')}><CheckCircle2 className="w-4 h-4"/></button>}{!['delivered','failed','cancelled'].includes(r.status)&&<button className="btn-secondary" onClick={()=>run(()=>failDelivery(r.id,'Delivery exception recorded by operations'),'Marked failed')}><XCircle className="w-4 h-4"/></button>}</td></tr>):<tr><td colSpan={7} className="p-10 text-center text-muted-foreground">No deliveries have been created yet.</td></tr>}</tbody></table></div></div>
    <div className="mt-6 surface-soft p-5 flex gap-3"><Truck className="w-5 h-5 text-primary-600 mt-0.5"/><div><p className="font-semibold">Delivery lifecycle</p><p className="text-sm text-muted-foreground mt-1">Pending → Processing → Dispatched → In transit → Delivered. Proof of delivery is recorded at completion.</p></div></div>
  </AdminLayout>;
}
