import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, BarChart3, CheckCircle2, DollarSign, Package, RefreshCw, Truck, Users, Wrench } from 'lucide-react';
import { Link } from 'wouter';
import { AdminLayout } from './dashboard';
import { getExecutiveOperations360, reconcileExecutiveOperations360, type ExecutiveSnapshot } from '@/lib/executive-operations-360';
import { formatKES } from '@/lib/utils';

const cards = [
  ['Customers', 'customers', Users, '/admin/customers'],
  ['Open leads', 'open_leads', Users, '/admin/leads'],
  ['Open quotes', 'quotes_open', BarChart3, '/admin/quotations'],
  ['Active orders', 'orders_active', Package, '/admin/orders'],
  ['Active projects', 'projects_active', Wrench, '/admin/projects'],
  ['Low stock', 'low_stock', Package, '/admin/supply-chain-360'],
  ['Pending deliveries', 'pending_deliveries', Truck, '/admin/fulfillment-delivery-360'],
  ['Open service cases', 'unresolved_service_cases', Wrench, '/admin/customer-lifecycle-360'],
  ['Outstanding invoices', 'invoice_outstanding', DollarSign, '/admin/finance-operations'],
];

export default function ExecutiveOperations360() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<ExecutiveSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); setMessage(null); try { setData(await getExecutiveOperations360(days)); } catch (e) { setMessage(e instanceof Error ? e.message : 'Unable to load control centre'); } finally { setLoading(false); } }, [days]);
  useEffect(() => { void load(); }, [load]);
  const reconcile = async () => { setLoading(true); setMessage(null); try { await reconcileExecutiveOperations360(); await load(); setMessage('Executive reconciliation completed.'); } catch (e) { setMessage(e instanceof Error ? e.message : 'Reconciliation failed'); setLoading(false); } };
  const m = data?.metrics ?? {};
  return <AdminLayout title="Executive Operations 360" subtitle="Company-wide operational control across sales, delivery, supply chain, finance and customer lifecycle" actions={<div className="flex gap-2"><select value={days} onChange={e => setDays(Number(e.target.value))} className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select><button onClick={() => void reconcile()} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Reconcile</button></div>}>
    {message && <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700">{message}</div>}
    <div className="grid sm:grid-cols-3 gap-4 mb-6"><div className="rounded-xl border border-red-200 bg-red-50 p-5"><p className="text-xs uppercase tracking-wide text-red-700 font-semibold">Critical</p><p className="text-3xl font-bold text-red-900 mt-1">{loading ? '—' : data?.priorities.critical ?? 0}</p></div><div className="rounded-xl border border-amber-200 bg-amber-50 p-5"><p className="text-xs uppercase tracking-wide text-amber-700 font-semibold">High</p><p className="text-3xl font-bold text-amber-900 mt-1">{loading ? '—' : data?.priorities.high ?? 0}</p></div><div className="rounded-xl border border-gray-200 bg-gray-50 p-5"><p className="text-xs uppercase tracking-wide text-gray-600 font-semibold">Medium</p><p className="text-3xl font-bold text-gray-900 mt-1">{loading ? '—' : data?.priorities.medium ?? 0}</p></div></div>
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{cards.map(([label,key,Icon,href]) => <Link key={key as string} href={href as string} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-primary-300 hover:shadow-sm transition-all"><div className="flex justify-between"><Icon className="w-5 h-5 text-primary-600"/><ArrowRight className="w-4 h-4 text-gray-300"/></div><p className="text-sm text-gray-500 mt-5">{label as string}</p><p className="text-3xl font-bold text-navy-900 mt-1">{loading ? '—' : key === 'invoice_outstanding' ? formatKES(Number(m[key as string] ?? 0)) : Number(m[key as string] ?? 0).toLocaleString()}</p></Link>)}</div>
    <section className="mt-6 bg-white border border-gray-200 rounded-xl p-6"><div className="flex items-start justify-between mb-5"><div><h2 className="font-semibold text-navy-900">Exception queue</h2><p className="text-sm text-gray-500 mt-1">Cross-operation issues requiring management attention.</p></div><AlertTriangle className="w-5 h-5 text-amber-500" /></div>{loading ? <p className="text-sm text-gray-500">Loading exceptions…</p> : data?.exceptions.length ? <div className="space-y-3">{data.exceptions.map((x,i)=><div key={`${x.domain}-${x.label}-${i}`} className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"><div className="min-w-0"><div className="flex gap-2 items-center"><span className="text-xs font-semibold uppercase text-gray-400">{x.priority}</span><span className="text-xs text-gray-400">{x.domain}</span></div><p className="text-sm font-medium text-gray-800 mt-1">{x.label}</p></div><span className="font-bold text-navy-900">{x.count}</span></div>)}</div> : <div className="flex items-center gap-2 text-sm text-green-700"><CheckCircle2 className="w-4 h-4"/>No current exceptions detected.</div>}</section>
    <section className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-6"><h2 className="font-semibold text-navy-900">Control-plane principle</h2><p className="text-sm text-gray-600 mt-2">This workspace does not become a second system of record. It reads canonical operational data through a protected server-side snapshot and links managers back to the responsible operation for action.</p></section>
  </AdminLayout>;
}
