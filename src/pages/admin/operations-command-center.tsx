import { Link } from 'wouter';
import { ArrowRight, Boxes, Building2, ClipboardList, FolderKanban, Truck, AlertTriangle } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

interface OperationsSnapshot { lowStock: number; warehouses: number; suppliers: number; purchaseOrders: number; projects: number; unresolvedAlerts: number; }
const empty: OperationsSnapshot = { lowStock: 0, warehouses: 0, suppliers: 0, purchaseOrders: 0, projects: 0, unresolvedAlerts: 0 };

export default function OperationsCommandCenter() {
  const [data, setData] = useState<OperationsSnapshot>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [stock, warehouses, suppliers, pos, projects, alerts] = await Promise.all([
          supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true).filter('stock_quantity', 'lte', 'low_stock_threshold'),
          supabase.from('warehouses').select('id', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('suppliers').select('id', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).not('status', 'in', '(cancelled,closed)'),
          supabase.from('projects').select('id', { count: 'exact', head: true }).not('status', 'eq', 'completed'),
          supabase.from('inventory_alerts').select('id', { count: 'exact', head: true }).eq('is_resolved', false),
        ]);
        const firstError = [stock, warehouses, suppliers, pos, projects, alerts].find((r) => r.error)?.error;
        if (firstError) throw firstError;
        if (!mounted) return;
        setData({ lowStock: stock.count || 0, warehouses: warehouses.count || 0, suppliers: suppliers.count || 0, purchaseOrders: pos.count || 0, projects: projects.count || 0, unresolvedAlerts: alerts.count || 0 });
      } catch (err) { if (mounted) setError(err instanceof Error ? err.message : 'Unable to load operations data'); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);
  const cards = [
    ['Low-stock products', data.lowStock, Boxes, '/admin/inventory'],
    ['Active warehouses', data.warehouses, Building2, '/admin/warehouses'],
    ['Active suppliers', data.suppliers, Truck, '/admin/suppliers'],
    ['Open purchase orders', data.purchaseOrders, ClipboardList, '/admin/suppliers'],
    ['Active projects', data.projects, FolderKanban, '/admin/projects'],
    ['Unresolved stock alerts', data.unresolvedAlerts, AlertTriangle, '/admin/inventory'],
  ] as const;
  return <AdminLayout title="Operations Command Center" subtitle="Inventory, procurement, warehouses and project delivery in one operational layer">
    {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Operations data could not be loaded: {error}</div>}
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {cards.map(([label, value, Icon, href]) => <Link key={label} href={href} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-primary-300 hover:shadow-sm transition-all">
        <div className="flex justify-between items-center mb-5"><Icon className="w-5 h-5 text-primary-600"/><ArrowRight className="w-4 h-4 text-gray-300"/></div>
        <p className="text-sm text-gray-500">{label}</p><p className="text-3xl font-bold text-navy-900 mt-1">{loading ? '—' : value}</p>
      </Link>)}
    </div>
    <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-6">
      <h2 className="font-semibold text-navy-900 mb-2">Operational control loop</h2>
      <p className="text-sm text-gray-600">Stock position → reorder → supplier purchase order → warehouse receipt → project allocation → delivery/completion. The screens remain linked to the same canonical data model.</p>
    </div>
  </AdminLayout>;
}
