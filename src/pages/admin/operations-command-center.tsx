import { Link } from 'wouter';
import {
  ArrowRight,
  Boxes,
  Building2,
  CalendarClock,
  ClipboardList,
  FolderKanban,
  Truck,
  AlertTriangle,
  PackageCheck,
  HardHat,
  RefreshCw,
} from 'lucide-react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface Snapshot {
  lowStock: number;
  warehouses: number;
  suppliers: number;
  purchaseOrders: number;
  projects: number;
  unresolvedAlerts: number;
  upcomingSiteVisits: number;
  upcomingInstallations: number;
  pendingReceipts: number;
}

interface PipelineRow { status: string; count: number; }
interface ScheduleRow { id: string; date: string | null; status: string; label: string; href: string; }

const empty: Snapshot = {
  lowStock: 0, warehouses: 0, suppliers: 0, purchaseOrders: 0, projects: 0,
  unresolvedAlerts: 0, upcomingSiteVisits: 0, upcomingInstallations: 0, pendingReceipts: 0,
};

const friendlyStatus = (status: string) => status.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function OperationsCommandCenter() {
  const [data, setData] = useState<Snapshot>(empty);
  const [purchasePipeline, setPurchasePipeline] = useState<PipelineRow[]>([]);
  const [projectPipeline, setProjectPipeline] = useState<PipelineRow[]>([]);
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const horizon = new Date();
      horizon.setDate(horizon.getDate() + 14);
      const horizonDate = horizon.toISOString().slice(0, 10);

      const [stock, warehouses, suppliers, pos, projects, alerts, visits, installations, receipts, poPipeline, projectPipelineResult] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true).filter('stock_quantity', 'lte', 'low_stock_threshold'),
        supabase.from('warehouses').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('suppliers').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).not('status', 'in', '(cancelled,received)'),
        supabase.from('projects').select('id', { count: 'exact', head: true }).not('status', 'in', '(completed,cancelled)'),
        supabase.from('inventory_alerts').select('id', { count: 'exact', head: true }).eq('is_resolved', false),
        supabase.from('site_visits').select('id,scheduled_date,status,visit_type').gte('scheduled_date', today).lte('scheduled_date', horizonDate).not('status', 'eq', 'cancelled').order('scheduled_date').limit(6),
        supabase.from('installations').select('id,scheduled_date,status,installation_number').gte('scheduled_date', today).lte('scheduled_date', horizonDate).not('status', 'eq', 'cancelled').order('scheduled_date').limit(6),
        supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).in('status', ['ordered', 'partial', 'sent', 'pending']),
        supabase.from('purchase_orders').select('status').not('status', 'eq', 'cancelled'),
        supabase.from('projects').select('status').not('status', 'eq', 'cancelled'),
      ]);

      const results = [stock, warehouses, suppliers, pos, projects, alerts, visits, installations, receipts, poPipeline, projectPipelineResult];
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;

      const group = (rows: Array<{ status: string | null }> | null) => {
        const map = new Map<string, number>();
        (rows ?? []).forEach((r) => { if (r.status) map.set(r.status, (map.get(r.status) ?? 0) + 1); });
        return [...map.entries()].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
      };

      const visitRows = (visits.data ?? []).map((r) => ({ id: r.id, date: r.scheduled_date, status: r.status, label: r.visit_type || 'Site visit', href: '/admin/site-visits' }));
      const installationRows = (installations.data ?? []).map((r) => ({ id: r.id, date: r.scheduled_date, status: r.status, label: r.installation_number || 'Installation', href: '/admin/project-delivery' }));

      setData({
        lowStock: stock.count || 0,
        warehouses: warehouses.count || 0,
        suppliers: suppliers.count || 0,
        purchaseOrders: pos.count || 0,
        projects: projects.count || 0,
        unresolvedAlerts: alerts.count || 0,
        upcomingSiteVisits: visits.data?.length || 0,
        upcomingInstallations: installations.data?.length || 0,
        pendingReceipts: receipts.count || 0,
      });
      setPurchasePipeline(group(poPipeline.data));
      setProjectPipeline(group(projectPipelineResult.data));
      setSchedule([...visitRows, ...installationRows].sort((a, b) => (a.date || '').localeCompare(b.date || '')).slice(0, 8));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load operations data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const cards = useMemo(() => [
    ['Low-stock products', data.lowStock, Boxes, '/admin/inventory'],
    ['Active warehouses', data.warehouses, Building2, '/admin/warehouses'],
    ['Active suppliers', data.suppliers, Truck, '/admin/suppliers'],
    ['Open purchase orders', data.purchaseOrders, ClipboardList, '/admin/suppliers'],
    ['Active projects', data.projects, FolderKanban, '/admin/projects'],
    ['Unresolved stock alerts', data.unresolvedAlerts, AlertTriangle, '/admin/inventory'],
    ['Site visits · next 14 days', data.upcomingSiteVisits, CalendarClock, '/admin/site-visits'],
    ['Installations · next 14 days', data.upcomingInstallations, HardHat, '/admin/project-delivery'],
    ['Pending supplier receipts', data.pendingReceipts, PackageCheck, '/admin/suppliers'],
  ] as const, [data]);

  return (
    <AdminLayout title="Operations Command Center" subtitle="A single operational view across stock, procurement, field scheduling and project delivery" actions={
      <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
      </button>
    }>
      {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Operations data could not be loaded: {error}</div>}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map(([label, value, Icon, href]) => (
          <Link key={label} href={href} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-primary-300 hover:shadow-sm transition-all">
            <div className="flex justify-between items-center mb-5"><Icon className="w-5 h-5 text-primary-600"/><ArrowRight className="w-4 h-4 text-gray-300"/></div>
            <p className="text-sm text-gray-500">{label}</p><p className="text-3xl font-bold text-navy-900 mt-1">{loading ? '—' : value}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-start justify-between mb-5"><div><h2 className="font-semibold text-navy-900">Purchase order pipeline</h2><p className="text-sm text-gray-500 mt-1">Where supplier commitments currently sit.</p></div><Link href="/admin/suppliers" className="text-sm text-primary-700 font-medium">Open POs</Link></div>
          <div className="space-y-3">
            {loading ? <p className="text-sm text-gray-500">Loading pipeline…</p> : purchasePipeline.length === 0 ? <p className="text-sm text-gray-500">No open purchase orders.</p> : purchasePipeline.map((row) => <div key={row.status} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5"><span className="text-sm text-gray-700">{friendlyStatus(row.status)}</span><span className="font-semibold text-navy-900">{row.count}</span></div>)}
          </div>
        </section>
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-start justify-between mb-5"><div><h2 className="font-semibold text-navy-900">Project delivery pipeline</h2><p className="text-sm text-gray-500 mt-1">Current workload by project status.</p></div><Link href="/admin/projects" className="text-sm text-primary-700 font-medium">Open projects</Link></div>
          <div className="space-y-3">
            {loading ? <p className="text-sm text-gray-500">Loading pipeline…</p> : projectPipeline.length === 0 ? <p className="text-sm text-gray-500">No active projects.</p> : projectPipeline.map((row) => <div key={row.status} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5"><span className="text-sm text-gray-700">{friendlyStatus(row.status)}</span><span className="font-semibold text-navy-900">{row.count}</span></div>)}
          </div>
        </section>
      </div>

      <section className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between mb-5"><div><h2 className="font-semibold text-navy-900">Next 14 days</h2><p className="text-sm text-gray-500 mt-1">Upcoming site visits and installations that need operational attention.</p></div><Link href="/admin/site-visits" className="text-sm text-primary-700 font-medium">View schedule</Link></div>
        {loading ? <p className="text-sm text-gray-500">Loading schedule…</p> : schedule.length === 0 ? <p className="text-sm text-gray-500">No upcoming field activity in the next 14 days.</p> : <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">{schedule.map((item) => <Link key={`${item.href}-${item.id}`} href={item.href} className="rounded-lg border border-gray-200 p-4 hover:border-primary-300 hover:bg-gray-50 transition-colors"><div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{item.date || 'Unscheduled'}</span><ArrowRight className="w-3.5 h-3.5 text-gray-300"/></div><p className="mt-2 text-sm font-medium text-navy-900">{item.label}</p><p className="mt-1 text-xs text-gray-500">{friendlyStatus(item.status)}</p></Link>)}</div>}
      </section>

      <div className="mt-6 flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl p-6"><div><h2 className="font-semibold text-navy-900">Customer Portal Operations</h2><p className="text-sm text-gray-600 mt-1">Monitor portal access and customer lifecycle visibility.</p></div><Link href="/admin/customer-portal-operations" className="shrink-0 text-sm text-primary-700 font-medium">Open workspace →</Link></div><div className="mt-6 flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl p-6"><div><h2 className="font-semibold text-navy-900">Supply Chain 360</h2><p className="text-sm text-gray-600 mt-1">Control stock, procurement, warehouse receipt, project allocation and reconciliation.</p></div><Link href="/admin/supply-chain-360" className="shrink-0 text-sm text-primary-700 font-medium">Open workspace →</Link></div><div className="mt-6 flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl p-6"><div><h2 className="font-semibold text-navy-900">Inventory & Procurement 360</h2><p className="text-sm text-gray-600 mt-1">Control supplier commitments, receipts, stock pressure and reconciliation.</p></div><Link href="/admin/inventory-procurement-operations" className="shrink-0 text-sm text-primary-700 font-medium">Open workspace →</Link></div><div className="mt-6 flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl p-6"><div><h2 className="font-semibold text-navy-900">Finance Operations 360</h2><p className="text-sm text-gray-600 mt-1">Control invoice lifecycle, receivables aging and collections activity.</p></div><Link href="/admin/finance-operations" className="shrink-0 text-sm text-primary-700 font-medium">Open finance workspace →</Link></div><div className="mt-6 flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl p-6"><div><h2 className="font-semibold text-navy-900">Field Operations 360</h2><p className="text-sm text-gray-600 mt-1">Run measurements, crew, materials, progress, issues and sign-off from one field workspace.</p></div><Link href="/admin/field-operations" className="shrink-0 text-sm text-primary-700 font-medium">Open workspace →</Link></div><div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-navy-900 mb-2">Operational control loop</h2>
        <p className="text-sm text-gray-600">Stock position → reorder → supplier purchase order → warehouse receipt → project allocation → site activity → installation/completion. Existing detailed modules remain the system of record; this command center only aggregates and links them.</p>
      </div>
    </AdminLayout>
  );
}
