import { Link } from 'wouter';
import {
  Briefcase,
  ChevronRight,
  ExternalLink,
  FileText,
  FolderKanban,
  Globe,
  Package,
  ShoppingCart,
  Wrench,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatKES } from '@/lib/utils';
import { AdminLayout } from '@/components/admin/AdminLayout';

export function DashboardPage() {
  return (
    <AdminLayout
      title="Dashboard"
      subtitle="A simple view of what needs attention today"
    >
      <DashboardContent />
    </AdminLayout>
  );
}

export { AdminLayout };

interface RecentOrder {
  id: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

function DashboardContent() {
  const [stats, setStats] = useState([
    { label: 'Orders', value: '0', helper: 'All orders', href: '/admin/orders', icon: ShoppingCart },
    { label: 'Open enquiries', value: '0', helper: 'Customers waiting', href: '/admin/sales', icon: Briefcase },
    { label: 'Active projects', value: '0', helper: 'Work in progress', href: '/admin/projects', icon: FolderKanban },
    { label: 'Outstanding', value: formatKES(0), helper: 'Invoices not fully paid', href: '/admin/invoices', icon: FileText },
  ]);
  const [attention, setAttention] = useState<Array<{label:string; value:string; helper:string; href:string; tone:'amber'|'blue'|'green'}>>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true);
      try {
        const [ordersRes, leadsRes, projectsRes, invoicesRes, pendingOrdersRes] = await Promise.all([
          supabase.from('orders').select('id', { count: 'exact', head: true }),
          supabase.from('leads').select('id', { count: 'exact', head: true }).not('status', 'in', '(won,lost)'),
          supabase.from('projects').select('id', { count: 'exact', head: true }).not('status', 'in', '(completed,cancelled)'),
          supabase.from('invoices').select('total_amount, amount_paid').not('status', 'in', '(paid,cancelled)'),
          supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        ]);

        const outstanding = (invoicesRes.data || []).reduce((sum, inv) => sum + Math.max(0, Number(inv.total_amount || 0) - Number(inv.amount_paid || 0)), 0);
        setStats([
          { label: 'Orders', value: String(ordersRes.count || 0), helper: 'All orders', href: '/admin/orders', icon: ShoppingCart },
          { label: 'Open enquiries', value: String(leadsRes.count || 0), helper: 'Customers waiting', href: '/admin/sales', icon: Briefcase },
          { label: 'Active projects', value: String(projectsRes.count || 0), helper: 'Work in progress', href: '/admin/projects', icon: FolderKanban },
          { label: 'Outstanding', value: formatKES(outstanding), helper: 'Invoices not fully paid', href: '/admin/invoices', icon: FileText },
        ]);

        const nextAttention: Array<{label:string; value:string; helper:string; href:string; tone:'amber'|'blue'|'green'}> = [];
        if ((leadsRes.count || 0) > 0) nextAttention.push({ label: 'Customer enquiries need attention', value: String(leadsRes.count), helper: 'Open enquiries', href: '/admin/sales', tone: 'blue' });
        if ((pendingOrdersRes.count || 0) > 0) nextAttention.push({ label: 'Orders are waiting', value: String(pendingOrdersRes.count), helper: 'Pending orders', href: '/admin/orders', tone: 'amber' });
        if (outstanding > 0) nextAttention.push({ label: 'Payments are outstanding', value: formatKES(outstanding), helper: 'Open invoices', href: '/admin/invoices', tone: 'amber' });
        if (nextAttention.length === 0) nextAttention.push({ label: 'Nothing urgent right now', value: 'All clear', helper: 'Your main work areas are up to date', href: '/admin', tone: 'green' });
        setAttention(nextAttention.slice(0, 3));

        const { data: recentOrdersData } = await supabase
          .from('orders')
          .select('id, customer_name, total_amount, status, created_at')
          .order('created_at', { ascending: false })
          .limit(5);
        setRecentOrders(recentOrdersData || []);
      } catch (err) {
        console.error('Failed to load admin dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    void fetchDashboard();
  }, []);

  const statusClass = (status: string) => {
    if (status === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (status === 'cancelled') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white border border-gray-200 p-5 lg:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-600">Business workspace</p>
            <h2 className="mt-1 text-xl lg:text-2xl font-bold text-navy-950">What would you like to manage?</h2>
            <p className="mt-1 text-sm text-gray-500">Use the simple areas below. Technical system controls are kept separately under System Administration.</p>
          </div>
          <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-navy-900 text-white text-sm font-semibold hover:bg-navy-800 transition-colors">
            <Globe className="w-4 h-4" /> View website <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <div><h2 className="text-base font-semibold text-navy-950">Today at a glance</h2><p className="text-xs text-gray-500 mt-0.5">The numbers that matter for day-to-day business.</p></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return <Link key={stat.label} href={stat.href} className="group bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:border-primary-200 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-3"><div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center"><Icon className="w-5 h-5" /></div><ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-600 mt-1" /></div>
              <p className="mt-4 text-2xl font-bold text-navy-950">{loading ? <span className="inline-block h-7 w-16 bg-gray-100 rounded animate-pulse" /> : stat.value}</p>
              <p className="text-sm font-medium text-navy-800 mt-1">{stat.label}</p><p className="text-xs text-gray-500 mt-0.5">{stat.helper}</p>
            </Link>;
          })}
        </div>
      </section>

      <section>
        <div className="mb-3"><h2 className="text-base font-semibold text-navy-950">Needs attention</h2><p className="text-xs text-gray-500 mt-0.5">Start here when something needs action.</p></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {attention.map((item) => <Link key={item.label} href={item.href} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-primary-200 hover:shadow-sm transition-all">
            <div className={`w-2 h-2 rounded-full mb-3 ${item.tone === 'amber' ? 'bg-amber-500' : item.tone === 'blue' ? 'bg-primary-500' : 'bg-emerald-500'}`} />
            <p className="text-sm font-semibold text-navy-900">{item.label}</p><p className="text-xl font-bold text-navy-950 mt-2">{item.value}</p><p className="text-xs text-gray-500 mt-1">{item.helper}</p>
          </Link>)}
        </div>
      </section>

      <section>
        <div className="mb-3"><h2 className="text-base font-semibold text-navy-950">Quick actions</h2><p className="text-xs text-gray-500 mt-0.5">Common tasks without hunting through the menu.</p></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['/admin/products', 'Add product', Package],
            ['/admin/services', 'Add service', Wrench],
            ['/admin/quotations', 'Create quotation', FileText],
            ['/admin/projects', 'Open projects', FolderKanban],
          ].map(([href, label, Icon]) => <Link key={String(href)} href={String(href)} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 hover:border-primary-200 hover:bg-primary-50/30 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-gray-100 text-navy-700 flex items-center justify-center"><Icon className="w-4 h-4" /></div><span className="text-sm font-semibold text-navy-800">{String(label)}</span>
          </Link>)}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"><div><h2 className="font-semibold text-navy-950">Recent orders</h2><p className="text-xs text-gray-500 mt-0.5">The latest customer orders.</p></div><Link href="/admin/orders" className="text-xs font-semibold text-primary-700 hover:text-primary-800">View all</Link></div>
        {loading ? <div className="p-5 text-sm text-gray-500">Loading orders...</div> : recentOrders.length === 0 ? <div className="p-8 text-center"><p className="text-sm font-medium text-navy-800">No orders yet</p><p className="text-xs text-gray-500 mt-1">New customer orders will appear here.</p></div> : <div className="divide-y divide-gray-100">
          {recentOrders.map((order) => <Link key={order.id} href="/admin/orders" className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
            <div className="min-w-0"><p className="text-sm font-medium text-navy-900 truncate">{order.customer_name || 'Customer'}</p><p className="text-xs text-gray-500 mt-0.5">{new Date(order.created_at).toLocaleDateString()}</p></div>
            <div className="flex items-center gap-3 flex-shrink-0"><span className="text-sm font-semibold text-navy-900">{formatKES(order.total_amount || 0)}</span><span className={`text-[11px] px-2 py-1 rounded-full border font-medium capitalize ${statusClass(order.status)}`}>{order.status}</span></div>
          </Link>)}
        </div>}
      </section>

      <details className="bg-white border border-gray-200 rounded-xl">
        <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between text-sm font-semibold text-navy-900">System administration <span className="text-xs font-normal text-gray-500">For technical support and platform maintenance</span></summary>
        <div className="px-5 pb-5 text-sm text-gray-500">System Health, Audit Logs, Backups, Identity & Access, Automation, Reliability, Business Continuity and Data Governance remain available from the sidebar under <strong>System Administration</strong>. These controls are intentionally not part of the day-to-day business workspace.</div>
      </details>
    </div>
  );
}

