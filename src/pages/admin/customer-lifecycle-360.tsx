import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from './dashboard';
import { useToast } from '@/hooks/use-toast';
import { Activity, CalendarClock, RefreshCw, ShieldCheck, Star, Wrench } from 'lucide-react';
import { getCustomerLifecycleOperations360, reconcileCustomerLifecycle360 } from '@/lib/customer-lifecycle-360';

type Row = Record<string, any>;

export default function AdminCustomerLifecycle360() {
  const [data, setData] = useState<{ metrics: Record<string, number>; customers: Row[] }>({ metrics: {}, customers: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await getCustomerLifecycleOperations360()); }
    catch (e) { toast({ title: 'Unable to load customer lifecycle', description: e instanceof Error ? e.message : 'Please try again', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const reconcile = async () => {
    setBusy(true);
    try {
      const result = await reconcileCustomerLifecycle360();
      toast({ title: 'Customer lifecycle reconciled', description: `${result.warranty_cases_checked || 0} warranty cases checked and ${result.maintenance_visits_marked_missed || 0} missed visits updated.` });
      await load();
    } catch (e) { toast({ title: 'Reconciliation failed', description: e instanceof Error ? e.message : 'Please try again', variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const cards = [
    ['Open service', 'open_service_cases', Wrench], ['Overdue service', 'overdue_service_cases', Activity],
    ['Active warranties', 'active_warranties', ShieldCheck], ['Low feedback', 'low_feedback', Star],
    ['Maintenance due', 'maintenance_due_30_days', CalendarClock], ['Maintenance overdue', 'maintenance_overdue', CalendarClock],
    ['Renewals due', 'renewals_due_14_days', RefreshCw], ['Renewals overdue', 'renewals_overdue', RefreshCw],
  ] as const;

  return <AdminLayout title="Customer Lifecycle 360" subtitle="One after-sales control loop from warranty and service through maintenance, satisfaction and renewal.">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6"><div><p className="eyebrow">Customer retention control</p><p className="text-sm text-muted-foreground">Reconcile SLA, warranty, missed maintenance and renewal state before acting on customer risk.</p></div><button className="btn-secondary" onClick={()=>void reconcile()} disabled={busy}><RefreshCw className="w-4 h-4 mr-2"/>{busy?'Reconciling…':'Reconcile lifecycle'}</button></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">{cards.map(([label,key,Icon])=><div className="surface p-5" key={key}><div className="flex items-center justify-between"><p className="eyebrow">{label}</p><Icon className="w-4 h-4 opacity-50"/></div><p className="text-2xl font-bold mt-2">{data.metrics[key] ?? 0}</p></div>)}</div>
    <div className="table-shell overflow-hidden"><div className="p-4 border-b"><p className="font-semibold">Customer after-sales risk</p><p className="text-sm text-muted-foreground">Customers are ranked by unresolved service, maintenance, renewal and satisfaction risk.</p></div><div className="overflow-x-auto"><table className="w-full"><thead><tr><th>Customer</th><th>Service</th><th>Maintenance</th><th>Renewal</th><th>Low feedback</th><th>Risk</th></tr></thead><tbody>{loading?<tr><td colSpan={6} className="p-8 text-center">Loading…</td></tr>:data.customers.map(c=><tr key={c.id}><td><div className="font-medium">{c.name}</div><div className="text-xs text-muted-foreground">{c.phone||c.email||''}</div></td><td>{c.open_service_cases||0}{c.overdue_service_cases>0&&<span className="text-xs ml-2">({c.overdue_service_cases} overdue)</span>}</td><td>{c.overdue_maintenance||0} overdue</td><td>{c.overdue_renewals||0} overdue</td><td>{c.low_feedback||0}</td><td><span className="chip">{c.risk_score||0}</span></td></tr>)}{!loading&&!data.customers.length&&<tr><td colSpan={6} className="p-10 text-center text-muted-foreground">No active after-sales customer workload.</td></tr>}</tbody></table></div></div>
  </AdminLayout>;
}
