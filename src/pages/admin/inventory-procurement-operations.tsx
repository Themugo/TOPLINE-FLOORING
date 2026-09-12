import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Boxes, ClipboardList, RefreshCw, Truck, Warehouse, CheckCircle2 } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { formatKES } from '@/lib/utils';
import { getInventoryProcurementOperations360, reconcileInventoryProcurement } from '@/lib/inventory-procurement-360';
import { useToast } from '@/hooks/use-toast';

type Snapshot = Record<string, unknown>;
const money = (v: unknown) => formatKES(Number(v || 0));
const count = (v: unknown) => Number(v || 0).toLocaleString();

export default function InventoryProcurementOperations() {
  const [data, setData] = useState<Snapshot>({});
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getInventoryProcurementOperations360(30));
    } catch (e) {
      toast({ title: 'Operations snapshot failed', description: e instanceof Error ? e.message : 'Unable to load inventory/procurement data', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const reconcile = async () => {
    setReconciling(true);
    try {
      const result = await reconcileInventoryProcurement();
      const discrepancies = Number(result.discrepancy_count || 0);
      const orphans = Number(result.orphan_count || 0);
      toast({
        title: discrepancies === 0 && orphans === 0 ? 'Inventory reconciliation clean' : 'Reconciliation completed',
        description: `${discrepancies} stock discrepancy(ies), ${orphans} warehouse orphan(s).`,
        variant: discrepancies === 0 && orphans === 0 ? undefined : 'destructive',
      });
    } catch (e) {
      toast({ title: 'Reconciliation failed', description: e instanceof Error ? e.message : 'Unable to reconcile inventory', variant: 'destructive' });
    } finally { setReconciling(false); }
  };

  const cards = [
    ['Active products', data.active_products, Boxes],
    ['Low-stock products', data.low_stock, AlertTriangle],
    ['Open purchase orders', data.open_purchase_orders, ClipboardList],
    ['Pending receipts', data.pending_receipts, Truck],
    ['Active warehouses', data.active_warehouses, Warehouse],
    ['Active suppliers', data.active_suppliers, Truck],
  ] as const;

  return (
    <AdminLayout title="Inventory & Procurement 360">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <p className="text-sm text-navy-500">30-day operational control across stock, warehouses and supplier commitments</p>
          <h1 className="text-2xl font-display font-bold text-navy-900">Inventory & Procurement Operations</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void reconcile()} disabled={reconciling} className="btn-secondary flex items-center gap-2">
            {reconciling ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Reconcile stock
          </button>
          <button onClick={() => void load()} disabled={loading} className="btn-secondary flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map(([label, value, Icon]) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex justify-between"><p className="text-sm text-navy-500">{label}</p><Icon className="w-4 h-4 text-navy-400" /></div>
            <p className="text-2xl font-display font-bold text-navy-900 mt-2">{loading ? '—' : count(value)}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mt-5">
        <section className="lg:col-span-2 bg-white border rounded-xl p-5">
          <h2 className="font-semibold text-navy-900">Procurement exposure</h2>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <div className="rounded-lg bg-gray-50 p-4"><p className="text-xs text-navy-500">30-day procurement value</p><p className="text-xl font-semibold text-navy-900 mt-1">{loading ? '—' : money(data.procurement_value)}</p></div>
            <div className="rounded-lg bg-gray-50 p-4"><p className="text-xs text-navy-500">30-day received value</p><p className="text-xl font-semibold text-navy-900 mt-1">{loading ? '—' : money(data.received_value)}</p></div>
            <div className="rounded-lg bg-gray-50 p-4"><p className="text-xs text-navy-500">Current stock units</p><p className="text-xl font-semibold text-navy-900 mt-1">{loading ? '—' : count(data.stock_units)}</p></div>
            <div className="rounded-lg bg-gray-50 p-4"><p className="text-xs text-navy-500">Inventory movements</p><p className="text-xl font-semibold text-navy-900 mt-1">{loading ? '—' : count(data.movement_count)}</p></div>
          </div>
        </section>

        <section className="bg-white border rounded-xl p-5">
          <h2 className="font-semibold text-navy-900">PO status</h2>
          <div className="space-y-3 mt-4">
            {Object.entries((data.status_breakdown || {}) as Record<string, unknown>).length === 0
              ? <p className="text-sm text-navy-500">No purchase orders.</p>
              : Object.entries((data.status_breakdown || {}) as Record<string, unknown>).map(([status, value]) => (
                <div key={status} className="flex justify-between text-sm"><span className="text-navy-500 capitalize">{status.replaceAll('_',' ')}</span><span className="font-semibold text-navy-900">{count(value)}</span></div>
              ))}
          </div>
        </section>
      </div>

      <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-5">
        <h2 className="font-semibold text-navy-900">Control loop</h2>
        <p className="text-sm text-navy-600 mt-1">Low stock → procurement decision → purchase order → supplier commitment → warehouse receipt → stock reconciliation → project/commerce consumption. Existing catalogue, warehouse and purchase-order tables remain the source of truth.</p>
      </div>
    </AdminLayout>
  );
}
