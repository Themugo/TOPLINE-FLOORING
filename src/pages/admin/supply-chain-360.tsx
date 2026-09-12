import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Boxes, CheckCircle2, ClipboardList, RefreshCw, Warehouse, Wrench } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { getSupplyChain360, reconcileSupplyChain360 } from '@/lib/supply-chain-360';
import { useToast } from '@/hooks/use-toast';

const n=(v:unknown)=>Number(v||0).toLocaleString();
const money=(v:unknown)=>new Intl.NumberFormat('en-KE',{style:'currency',currency:'KES',maximumFractionDigits:0}).format(Number(v||0));
export default function AdminSupplyChain360(){
 const [data,setData]=useState<Record<string,unknown>>({}); const [loading,setLoading]=useState(true); const [busy,setBusy]=useState(false); const {toast}=useToast();
 const load=useCallback(async()=>{setLoading(true);try{setData(await getSupplyChain360(30));}catch(e){toast({title:'Supply chain snapshot failed',description:e instanceof Error?e.message:'Unable to load supply chain',variant:'destructive'});}finally{setLoading(false);}},[toast]);
 useEffect(()=>{void load()},[load]);
 const reconcile=async()=>{setBusy(true);try{const r=await reconcileSupplyChain360();const d=Number(r.discrepancy_count||0);toast({title:d===0?'Supply chain reconciliation clean':'Reconciliation completed',description:`${d} discrepancy record(s) found.`,variant:d===0?undefined:'destructive'});await load();}catch(e){toast({title:'Reconciliation failed',description:e instanceof Error?e.message:'Unable to reconcile',variant:'destructive'});}finally{setBusy(false)}};
 const cards=[['Stock units',data.stock_units,Boxes],['Warehouse units',data.warehouse_stock_units,Warehouse],['Low-stock products',data.low_stock,AlertTriangle],['Open POs',data.open_purchase_orders,ClipboardList],['Pending receipts',data.pending_receipts,Wrench],['Active allocations',data.active_allocations,CheckCircle2]] as const;
 return <AdminLayout title="Supply Chain 360" subtitle="One control loop from stock demand through procurement, warehouse receipt, project allocation and reconciliation.">
  <div className="flex justify-end gap-2 mb-5"><button className="btn-secondary flex items-center gap-2" onClick={()=>void load()} disabled={loading}><RefreshCw className={loading?'w-4 h-4 animate-spin':'w-4 h-4'}/>Refresh</button><button className="btn-primary flex items-center gap-2" onClick={()=>void reconcile()} disabled={busy}><CheckCircle2 className="w-4 h-4"/>{busy?'Reconciling…':'Reconcile supply chain'}</button></div>
  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{cards.map(([label,value,Icon])=><div className="surface p-5" key={label}><div className="flex justify-between"><p className="eyebrow">{label}</p><Icon className="w-4 h-4"/></div><p className="text-2xl font-bold mt-2">{loading?'—':n(value)}</p></div>)}</div>
  <div className="grid lg:grid-cols-2 gap-5 mt-5"><section className="surface p-5"><h2 className="font-bold">Procurement exposure</h2><div className="grid sm:grid-cols-2 gap-3 mt-4"><div className="surface-muted p-4"><p className="eyebrow">30-day procurement</p><p className="text-xl font-bold mt-1">{loading?'—':money(data.procurement_value)}</p></div><div className="surface-muted p-4"><p className="eyebrow">30-day received</p><p className="text-xl font-bold mt-1">{loading?'—':money(data.received_value)}</p></div></div></section><section className="surface p-5"><h2 className="font-bold">Control loop</h2><p className="text-sm text-muted-foreground mt-2">Low stock → procurement → supplier → purchase order → warehouse receipt → stock → project allocation → installation issue/return → reconciliation.</p><p className="text-sm text-muted-foreground mt-4">Recent supply-chain events: <strong>{loading?'—':n(data.events)}</strong></p></section></div>
 </AdminLayout>;
}
