import { Link } from 'wouter';
import { ArrowRight, Briefcase, CalendarDays, FileText, ShoppingCart, Users, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { formatKES } from '@/lib/utils';
import { getCommercialLifecycle360 } from '@/lib/lifecycle';
import { useEffect, useState } from 'react';

type Snapshot = Record<string, unknown>;
const n = (v: unknown) => Number(v || 0);

export default function SalesCommandCenter() {
  const [snapshot, setSnapshot] = useState<Snapshot>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let mounted = true; (async () => { try { setSnapshot(await getCommercialLifecycle360()); } catch (e) { if (mounted) setError(e instanceof Error ? e.message : 'Unable to load sales data'); } finally { if (mounted) setLoading(false); } })(); return () => { mounted = false; }; }, []);
  const cards: Array<[string, number, LucideIcon, string]> = [
    ['Open leads', n(snapshot.leads_open), Users, '/admin/leads'],
    ['Qualified leads', n(snapshot.leads_qualified), TrendingUp, '/admin/crm'],
    ['Open quotations', n(snapshot.quotations_open), FileText, '/admin/quotations'],
    ['Upcoming site visits', n(snapshot.site_visits_upcoming), CalendarDays, '/admin/site-visits'],
  ] as const;
  const flowLinks: Array<[string, string, LucideIcon]> = [['Leads','/admin/leads',Users],['Quotations','/admin/quotations',FileText],['Site Visits','/admin/site-visits',CalendarDays],['Projects','/admin/projects',Briefcase],['Full Lifecycle','/admin/commercial-lifecycle',ShoppingCart]];
  return <AdminLayout title="Sales Command Center" subtitle="One operational view from lead capture through customer, quotation and project handoff">
    {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Sales data could not be loaded: {error}</div>}
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">{cards.map(([label,value,Icon,href]) => <Link key={label} href={href} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-primary-300 hover:shadow-sm transition-all"><div className="flex justify-between mb-4"><Icon className="w-5 h-5 text-primary-600"/><ArrowRight className="w-4 h-4 text-gray-300"/></div><p className="text-sm text-gray-500">{label}</p><p className="text-3xl font-bold text-navy-900 mt-1">{loading ? '—' : value}</p></Link>)}</div>
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6"><h2 className="font-semibold text-navy-900 mb-5">Commercial pipeline</h2><div className="space-y-4 text-sm"><div className="flex justify-between"><span className="text-gray-500">Lead pipeline</span><strong>{loading?'—':formatKES(n(snapshot.pipeline_value))}</strong></div><div className="flex justify-between"><span className="text-gray-500">Quotation pipeline</span><strong>{loading?'—':formatKES(n(snapshot.quotation_pipeline_value))}</strong></div><div className="flex justify-between"><span className="text-gray-500">Accepted quotes</span><strong>{loading?'—':n(snapshot.quotations_accepted)}</strong></div></div></div>
      <div className="bg-white border border-gray-200 rounded-xl p-6"><h2 className="font-semibold text-navy-900 mb-5">Attention required</h2><div className="space-y-4 text-sm"><div className="flex justify-between"><span className="text-gray-500">Overdue follow-ups</span><strong className="text-red-600">{loading?'—':n(snapshot.leads_overdue_follow_up)}</strong></div><div className="flex justify-between"><span className="text-gray-500">Won leads</span><strong>{loading?'—':n(snapshot.won_leads)}</strong></div><div className="flex justify-between"><span className="text-gray-500">Lost leads</span><strong>{loading?'—':n(snapshot.lost_leads)}</strong></div></div></div>
      <div className="bg-navy-900 text-white rounded-xl p-6"><Briefcase className="w-5 h-5 mb-4"/><h2 className="font-semibold mb-2">30-day outcome</h2><div className="space-y-4 text-sm text-white/75"><div className="flex justify-between"><span>Customers</span><strong className="text-white">{loading?'—':n(snapshot.customers_created_30d)}</strong></div><div className="flex justify-between"><span>Orders</span><strong className="text-white">{loading?'—':n(snapshot.orders_created_30d)}</strong></div><div className="flex justify-between"><span>Order value</span><strong className="text-white">{loading?'—':formatKES(n(snapshot.order_value_30d))}</strong></div></div></div>
    </div>
    <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6"><h2 className="font-semibold text-navy-900 mb-2">Canonical commercial flow</h2><p className="text-sm text-gray-500 mb-5">Enquiry → qualification → site assessment → quotation → acceptance → order → project.</p><div className="flex flex-wrap gap-2">{flowLinks.map(([label,href,Icon]) => <Link key={String(label)} href={String(href)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:border-primary-300 flex items-center gap-2"><Icon className="w-4 h-4"/>{label}</Link>)}</div></div>
  </AdminLayout>;
}
