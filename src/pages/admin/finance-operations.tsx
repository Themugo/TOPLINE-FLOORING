import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle2, Clock3, Receipt, WalletCards } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { formatKES } from '@/lib/utils';
import { getFinanceOperations360, refreshInvoiceLifecycleStatuses } from '@/lib/finance-operations';
import { useToast } from '@/hooks/use-toast';

type Snapshot = Record<string, unknown>;
const money = (v: unknown) => formatKES(Number(v || 0));
const count = (v: unknown) => Number(v || 0).toLocaleString();

export default function FinanceOperations() {
  const [data, setData] = useState<Snapshot>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();
  const load = useCallback(async () => { setLoading(true); try { setData(await getFinanceOperations360(30)); } catch (e) { toast({ title: 'Finance snapshot failed', description: e instanceof Error ? e.message : 'Unable to load finance data', variant: 'destructive' }); } finally { setLoading(false); } }, [toast]);
  useEffect(() => { void load(); }, [load]);
  const refresh = async () => { setRefreshing(true); try { const r = await refreshInvoiceLifecycleStatuses(); toast({ title: 'Invoice lifecycle refreshed', description: `${Number(r.updated_count || 0)} invoice(s) updated.` }); await load(); } catch (e) { toast({ title: 'Refresh failed', description: e instanceof Error ? e.message : 'Unable to refresh', variant: 'destructive' }); } finally { setRefreshing(false); } };
  const aging = (data.aging || {}) as Record<string, unknown>;
  const cards = [
    ['Invoiced', money(data.invoiced), Receipt], ['Collected', money(data.collected), WalletCards], ['Outstanding', money(data.outstanding), Clock3], ['Overdue', money(data.overdue_value), AlertTriangle],
  ];
  return <AdminLayout title="Finance Operations 360">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6"><div><p className="text-sm text-navy-500">30-day billing and collections control</p><h1 className="text-2xl font-display font-bold text-navy-900">Finance Operations</h1></div><button onClick={() => void refresh()} disabled={refreshing} className="btn-secondary flex items-center gap-2 w-fit"><RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh lifecycle</button></div>
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{cards.map(([label,value,Icon]) => <div key={label as string} className="bg-white border rounded-xl p-5"><div className="flex justify-between"><p className="text-sm text-navy-500">{label as string}</p><Icon className="w-4 h-4 text-navy-400" /></div><p className="text-2xl font-display font-bold text-navy-900 mt-2">{loading ? '—' : value as string}</p></div>)}</div>
    <div className="grid lg:grid-cols-3 gap-5 mt-5"><section className="lg:col-span-2 bg-white border rounded-xl p-5"><h2 className="font-semibold text-navy-900">Invoice pipeline</h2><div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">{[['Draft',data.draft_count],['Sent',data.sent_count],['Partial',data.partial_count],['Paid',data.paid_count],['Overdue',data.overdue_count],['Cancelled',data.cancelled_count]].map(([l,v])=><div key={l as string} className="rounded-lg bg-gray-50 p-4"><p className="text-xs text-navy-500">{l as string}</p><p className="text-xl font-semibold text-navy-900 mt-1">{loading?'—':count(v)}</p></div>)}</div></section><section className="bg-white border rounded-xl p-5"><h2 className="font-semibold text-navy-900">Receivables aging</h2><div className="space-y-3 mt-4">{[['Current',aging.current],['1–30 days',aging['1_30']],['31–60 days',aging['31_60']],['61+ days',aging['61_plus']]].map(([l,v])=><div key={l as string} className="flex justify-between text-sm"><span className="text-navy-500">{l as string}</span><span className="font-semibold">{loading?'—':money(v)}</span></div>)}</div></section></div>
    <div className="mt-5 bg-white border rounded-xl p-5"><h2 className="font-semibold text-navy-900">Collection activity</h2><p className="text-sm text-navy-500 mt-1">{loading ? '—' : count(data.payment_count)} payments recorded in the selected period.</p></div>
  </AdminLayout>;
}
