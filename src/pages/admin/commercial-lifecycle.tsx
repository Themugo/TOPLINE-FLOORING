import { useEffect, useState } from 'react';
import { ArrowRight, Briefcase, CalendarDays, FileText, Users, WalletCards } from 'lucide-react';
import { Link } from 'wouter';
import { AdminLayout } from './dashboard';
import { getCommercialLifecycle360 } from '@/lib/lifecycle';
import { formatKES } from '@/lib/utils';

type Snapshot = Record<string, unknown>;
const n = (v: unknown) => Number(v || 0);

export default function CommercialLifecycle() {
  const [data, setData] = useState<Snapshot>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try { setData(await getCommercialLifecycle360()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load commercial lifecycle'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const cards = [
    ['Open leads', n(data.leads_open), Users, '/admin/leads'],
    ['Qualified leads', n(data.leads_qualified), Briefcase, '/admin/crm'],
    ['Open quotations', n(data.quotations_open), FileText, '/admin/quotations'],
    ['Upcoming site visits', n(data.site_visits_upcoming), CalendarDays, '/admin/site-visits'],
  ] as const;

  return <AdminLayout title="Commercial Lifecycle 360" subtitle="One operational view from enquiry through customer, quotation, sale and project handoff">
    {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      {cards.map(([label, value, Icon, href]) => <Link key={label} href={href} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-primary-300 hover:shadow-sm transition-all">
        <div className="flex justify-between mb-4"><Icon className="w-5 h-5 text-primary-600"/><ArrowRight className="w-4 h-4 text-gray-300"/></div>
        <p className="text-sm text-gray-500">{label}</p><p className="text-3xl font-bold text-navy-900 mt-1">{loading ? '—' : value}</p>
      </Link>)}
    </div>
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6"><h2 className="font-semibold text-navy-900 mb-4">Pipeline</h2><div className="space-y-3 text-sm">
        <div className="flex justify-between"><span className="text-gray-500">Lead pipeline</span><strong>{loading ? '—' : formatKES(n(data.pipeline_value))}</strong></div>
        <div className="flex justify-between"><span className="text-gray-500">Quotation pipeline</span><strong>{loading ? '—' : formatKES(n(data.quotation_pipeline_value))}</strong></div>
        <div className="flex justify-between"><span className="text-gray-500">Overdue follow-ups</span><strong className="text-red-600">{loading ? '—' : n(data.leads_overdue_follow_up)}</strong></div>
      </div></div>
      <div className="bg-white border border-gray-200 rounded-xl p-6"><h2 className="font-semibold text-navy-900 mb-4">Conversion position</h2><div className="space-y-3 text-sm">
        <div className="flex justify-between"><span className="text-gray-500">Accepted quotes</span><strong>{loading ? '—' : n(data.quotations_accepted)}</strong></div>
        <div className="flex justify-between"><span className="text-gray-500">Won leads</span><strong>{loading ? '—' : n(data.won_leads)}</strong></div>
        <div className="flex justify-between"><span className="text-gray-500">Lost leads</span><strong>{loading ? '—' : n(data.lost_leads)}</strong></div>
      </div></div>
      <div className="bg-navy-900 text-white rounded-xl p-6"><WalletCards className="w-5 h-5 mb-4"/><h2 className="font-semibold mb-2">30-day handoff</h2><div className="space-y-3 text-sm text-white/75">
        <div className="flex justify-between"><span>New customers</span><strong className="text-white">{loading ? '—' : n(data.customers_created_30d)}</strong></div>
        <div className="flex justify-between"><span>Orders created</span><strong className="text-white">{loading ? '—' : n(data.orders_created_30d)}</strong></div>
        <div className="flex justify-between"><span>Order value</span><strong className="text-white">{loading ? '—' : formatKES(n(data.order_value_30d))}</strong></div>
      </div></div>
    </div>
    <div className="mt-6 flex flex-wrap gap-3 text-sm">
      {['Leads','Quotations','Site Visits','Projects'].map((label, i) => <Link key={label} href={['/admin/leads','/admin/quotations','/admin/site-visits','/admin/projects'][i]} className="px-4 py-2 rounded-lg border border-gray-200 bg-white hover:border-primary-300">{i+1}. {label}</Link>)}
    </div>
  </AdminLayout>;
}
