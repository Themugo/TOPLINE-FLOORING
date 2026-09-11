import { Link } from 'wouter';
import { ArrowRight, Briefcase, FileText, ShoppingCart, Users, TrendingUp } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { formatKES } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface SalesSnapshot {
  openLeads: number;
  qualifiedLeads: number;
  openQuotes: number;
  pendingOrders: number;
  orderValue: number;
  outstanding: number;
}

const emptySnapshot: SalesSnapshot = { openLeads: 0, qualifiedLeads: 0, openQuotes: 0, pendingOrders: 0, orderValue: 0, outstanding: 0 };

export default function SalesCommandCenter() {
  const [snapshot, setSnapshot] = useState<SalesSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [leads, qualified, quotes, pendingOrders, orders, invoices] = await Promise.all([
          supabase.from('leads').select('id', { count: 'exact', head: true }).not('status', 'in', '(won,lost)'),
          supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'qualified'),
          supabase.from('quotations').select('id', { count: 'exact', head: true }).not('status', 'in', '(accepted,rejected,expired)'),
          supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('orders').select('total_amount').not('status', 'eq', 'cancelled'),
          supabase.from('invoices').select('total_amount, amount_paid').not('status', 'in', '(paid,cancelled)'),
        ]);
        const firstError = [leads, qualified, quotes, pendingOrders, orders, invoices].find((r) => r.error)?.error;
        if (firstError) throw firstError;
        const orderValue = (orders.data || []).reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
        const outstanding = (invoices.data || []).reduce((sum, row) => sum + Math.max(0, Number(row.total_amount || 0) - Number(row.amount_paid || 0)), 0);
        if (!mounted) return;
        setSnapshot({
          openLeads: leads.count || 0,
          qualifiedLeads: qualified.count || 0,
          openQuotes: quotes.count || 0,
          pendingOrders: pendingOrders.count || 0,
          orderValue,
          outstanding,
        });
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Unable to load sales data');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const cards = [
    { label: 'Open leads', value: snapshot.openLeads, icon: Users, href: '/admin/leads' },
    { label: 'Qualified leads', value: snapshot.qualifiedLeads, icon: TrendingUp, href: '/admin/crm' },
    { label: 'Open quotations', value: snapshot.openQuotes, icon: FileText, href: '/admin/quotations' },
    { label: 'Pending orders', value: snapshot.pendingOrders, icon: ShoppingCart, href: '/admin/orders' },
  ];

  return (
    <AdminLayout title="Sales Command Center" subtitle="One operational view from lead capture through order fulfilment">
      {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Sales data could not be loaded: {error}</div>}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-primary-300 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-4"><card.icon className="w-5 h-5 text-primary-600" /><ArrowRight className="w-4 h-4 text-gray-300" /></div>
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-3xl font-bold text-navy-900 mt-1">{loading ? '—' : card.value}</p>
          </Link>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5"><Briefcase className="w-5 h-5 text-primary-600" /><h2 className="font-semibold text-navy-900">Commercial position</h2></div>
          <div className="space-y-4">
            <div className="flex justify-between"><span className="text-sm text-gray-500">Order value in system</span><strong>{loading ? '—' : formatKES(snapshot.orderValue)}</strong></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Outstanding invoices</span><strong className="text-red-600">{loading ? '—' : formatKES(snapshot.outstanding)}</strong></div>
          </div>
        </div>
        <div className="bg-navy-900 text-white rounded-xl p-6">
          <h2 className="font-semibold mb-2">Recommended workflow</h2>
          <p className="text-sm text-white/70 mb-5">Capture → qualify → quote → negotiate → win → order → invoice → collect.</p>
          <div className="flex flex-wrap gap-2">
            {['CRM', 'Quotations', 'Orders', 'Invoices'].map((label, i) => <span key={label} className="px-3 py-1.5 rounded-full bg-white/10 text-xs">{i + 1}. {label}</span>)}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
