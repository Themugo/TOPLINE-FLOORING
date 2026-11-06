import { useState, useEffect } from 'react';
import { describeDbError, errorMessage } from '@/lib/db';
import { AlertTriangle, Package, TrendingDown, History } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/utils';
import type { InventoryAlert, InventoryMovement } from '@/lib/types';
import { resolveInventoryAlert } from '@/lib/admin-operations';
import { useWarehouses } from '@/hooks/use-data';

interface InventoryProduct {
  id: string;
  name: string;
  sku: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  variants?: Array<{ id: string; variant_name: string; stock_quantity: number; low_stock_threshold: number; is_active: boolean }>;
}
type InventoryAlertWithVariant = InventoryAlert & { variant?: { variant_name?: string } | null };

export default function AdminInventory() {
  const [alerts, setAlerts] = useState<InventoryAlertWithVariant[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const { toast } = useToast();
  const { warehouses } = useWarehouses();
  const [countWarehouseId, setCountWarehouseId] = useState('');
  const [adjustmentForm, setAdjustmentForm] = useState({ product_id: '', warehouse_id: '', quantity: 0, type: 'in' as 'in' | 'out' | 'adjustment', notes: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [alertsRes, movementsRes, productsRes] = await Promise.all([
        supabase.from('inventory_alerts').select('*, product:products(id, name, sku), variant:product_variants(variant_name)').eq('is_resolved', false).order('created_at', { ascending: false }),
        supabase.from('inventory_movements').select('*, product:products(name), variant:product_variants(variant_name)').order('created_at', { ascending: false }).limit(50),
        supabase.from('products').select('id, name, sku, stock_quantity, low_stock_threshold, variants:product_variants(id, variant_name, stock_quantity, low_stock_threshold, is_active)').order('name'),
      ]);
      const failed = [alertsRes, movementsRes, productsRes].find((result) => result.error);
      if (failed?.error) throw failed.error;
      setAlerts(alertsRes.data || []);
      setMovements(movementsRes.data || []);
      setProducts((productsRes.data || []) as InventoryProduct[]);
    } catch (err) {
      setLoadError(errorMessage(err, 'Inventory data could not be loaded. Please retry.'));
      toast({ title: 'Inventory could not be loaded', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const [countDrafts, setCountDrafts] = useState<Record<string, string>>({});
  const [countSavingId, setCountSavingId] = useState<string | null>(null);

  // Quick "this is what is actually on the shelf" entry: sets the counted quantity through the same audited
  // inventory movement as the adjustment form, so staff can bring many products up to date in one pass.
  const saveCount = async (productId: string) => {
    const counted = Number(countDrafts[productId]);
    if (!Number.isInteger(counted) || counted < 0 || !(countDrafts[productId] ?? '').trim()) {
      toast({ title: 'Enter a whole counted quantity (zero is allowed)', variant: 'destructive' });
      return;
    }
    setCountSavingId(productId);
    try {
      const { error } = await supabase.rpc('adjust_product_stock', {
        p_product_id: productId, p_quantity: counted, p_movement_type: 'adjustment',
        p_notes: countWarehouseId ? 'Warehouse stock count' : 'Global stock count',
        p_reference_type: 'stock_count', p_reference_id: null, p_warehouse_id: countWarehouseId || null,
      });
      if (error) throw error;
      toast({ title: 'Stock count saved' });
      setCountDrafts((d) => Object.fromEntries(Object.entries(d).filter(([id]) => id !== productId)));
      await fetchData();
    } catch (err) {
      toast({ title: 'Could not save count', description: errorMessage(err), variant: 'destructive' });
    } finally { setCountSavingId(null); }
  };

  const handleAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find(p => p.id === adjustmentForm.product_id);
    if (product?.variants?.some((variant) => variant.is_active)) {
      toast({ title: 'Select a non-variant product', description: 'Adjust stock for variant products from Product Variants.', variant: 'destructive' });
      return;
    }
    if (!product || !Number.isInteger(adjustmentForm.quantity) || adjustmentForm.quantity < 0 ||
      (adjustmentForm.type !== 'adjustment' && adjustmentForm.quantity === 0)) {
      toast({ title: 'Select a product and enter a valid whole quantity', description: 'Stock in/out must be greater than zero. An exact adjustment may be zero.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc('adjust_product_stock', {
        p_product_id: adjustmentForm.product_id,
        p_quantity: adjustmentForm.quantity,
        p_movement_type: adjustmentForm.type,
        p_notes: adjustmentForm.notes || null,
        p_reference_type: 'manual_adjustment',
        p_reference_id: null,
        p_warehouse_id: adjustmentForm.warehouse_id || null,
      });
      if (error) throw error;
      toast({ title: 'Stock adjustment recorded' });
      setShowAdjustment(false);
      setAdjustmentForm({ product_id: '', warehouse_id: '', quantity: 0, type: 'in', notes: '' });
      await fetchData();
    } catch (err) {
      toast({ title: 'Failed to record adjustment', description: errorMessage(err), variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const resolveAlert = async (id: string) => {
    try {
      await resolveInventoryAlert(id);
      await fetchData();
    } catch (err) {
      toast({ title: 'Failed to resolve alert', description: describeDbError(err as { message?: string; code?: string }), variant: 'destructive' });
    }
  };

  const lowStockProducts = products.filter((product) => {
    const activeVariants = product.variants?.filter((variant) => variant.is_active) ?? [];
    return activeVariants.length
      ? activeVariants.some((variant) => variant.stock_quantity <= variant.low_stock_threshold)
      : product.stock_quantity <= product.low_stock_threshold;
  });

  if (loading) return <AdminLayout title="Inventory"><div className="text-center py-12 text-gray-600">Loading inventory...</div></AdminLayout>;

  return (
    <AdminLayout title="Inventory" subtitle="See stock levels, handle low-stock alerts and record stock changes safely.">
      {loadError && (
        <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">Inventory data is incomplete</p>
          <p className="mt-1">{loadError}</p>
          <button type="button" onClick={() => void fetchData()} className="mt-3 font-semibold underline">Retry loading inventory</button>
        </div>
      )}
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700">Total Products</span>
            <Package className="w-4 h-4 text-navy-300" />
          </div>
          <p className="text-2xl font-bold text-navy-900">{products.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700">Low Stock</span>
            <TrendingDown className="w-4 h-4 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">{lowStockProducts.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700">Active Alerts</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600">{alerts.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700">Recent Movements</span>
            <History className="w-4 h-4 text-navy-300" />
          </div>
          <p className="text-2xl font-bold text-navy-900">{movements.length}</p>
        </div>
      </div>

      <div className="mb-6">
        <button onClick={() => setShowAdjustment(true)} className="btn-primary">Record Stock Adjustment</button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <h2 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Low Stock Alerts
          </h2>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                <div>
                  <p className="font-medium text-navy-900">{alert.product?.name}{alert.variant?.variant_name ? ` · ${alert.variant.variant_name}` : ''}</p>
                  <p className="text-sm text-gray-600">Stock: {alert.current_stock} / Threshold: {alert.threshold}</p>
                </div>
                <button onClick={() => resolveAlert(alert.id)} className="text-sm text-red-600 hover:underline font-medium">Resolve</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock Overview */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b bg-gray-50 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-navy-900">Stock Overview</h2>
            <p className="text-xs text-gray-600 mt-1">Choose a warehouse to count one location; leave blank to set the global product total.</p>
          </div>
          <select aria-label="Stock count location" value={countWarehouseId} onChange={(e) => setCountWarehouseId(e.target.value)} className="input max-w-xs">
            <option value="">Global product total</option>
            {warehouses.filter((warehouse) => warehouse.is_active).map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
          </select>
        </div>
        {products.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-12">No products yet - add products first to track their stock here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase">Product</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase">SKU</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase">Stock</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase">Threshold</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase">Set counted stock</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((product) => {
                  const activeVariants = product.variants?.filter((variant) => variant.is_active) ?? [];
                  const displayedStock = activeVariants.length
                    ? activeVariants.reduce((sum, variant) => sum + variant.stock_quantity, 0)
                    : product.stock_quantity;
                  const displayedThreshold = activeVariants.length
                    ? activeVariants.reduce((sum, variant) => sum + variant.low_stock_threshold, 0)
                    : product.low_stock_threshold;
                  const isLow = activeVariants.length
                    ? activeVariants.some((variant) => variant.stock_quantity <= variant.low_stock_threshold)
                    : product.stock_quantity <= product.low_stock_threshold;
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-navy-900">{product.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{product.sku || '-'}</td>
                      <td className="px-6 py-4 text-navy-700">{displayedStock}{activeVariants.length > 0 && <span className="block text-xs text-gray-600">Across {activeVariants.length} active variants</span>}</td>
                      <td className="px-6 py-4 text-gray-700">{displayedThreshold}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded font-medium ${displayedStock <= 0 ? 'bg-gray-200 text-gray-700' : isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {displayedStock <= 0 ? 'No stock recorded' : isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {activeVariants.length > 0 ? (
                          <span className="text-xs text-gray-600">Count each option in Product Variants</span>
                        ) : (
                          <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); void saveCount(product.id); }}>
                            <input type="number" min="0" step="1" inputMode="numeric" aria-label={`Counted stock for ${product.name}`} className="input w-24" value={countDrafts[product.id] ?? ''} onChange={(e) => setCountDrafts((d) => ({ ...d, [product.id]: e.target.value }))} placeholder={String(product.stock_quantity)} />
                            <button type="submit" disabled={countSavingId === product.id || !(countDrafts[product.id] ?? '').trim()} className="btn-secondary px-3 py-1.5 text-sm">{countSavingId === product.id ? 'Saving…' : 'Save'}</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Movements */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-navy-900">Recent Movements</h2>
        </div>
        {movements.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-12">No stock movements recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase">Product</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase">Qty</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase">Stock</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-600 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {movements.slice(0, 20).map((mov) => (
                  <tr key={mov.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-700">{formatDateTime(mov.created_at)}</td>
                    <td className="px-6 py-4 font-medium text-navy-900">{mov.product?.name}{mov.variant?.variant_name ? <span className="block text-xs font-normal text-gray-600">{mov.variant.variant_name}</span> : null}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        mov.movement_type === 'in' ? 'bg-green-100 text-green-700' :
                        mov.movement_type === 'out' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {mov.movement_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-navy-700">{mov.movement_type === 'out' ? '-' : '+'}{mov.quantity}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{mov.previous_stock} → {mov.new_stock}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{mov.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjustment Modal */}
      {showAdjustment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowAdjustment(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold text-lg text-navy-900 mb-4">Record Stock Adjustment</h2>
            <form onSubmit={handleAdjustment} className="space-y-4">
              <select required value={adjustmentForm.product_id} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, product_id: e.target.value })} className="input">
                <option value="">Select Product</option>
                {products.filter((p) => !p.variants?.some((variant) => variant.is_active)).map((p) => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock_quantity})</option>)}
              </select>
              <select aria-label="Adjustment warehouse" value={adjustmentForm.warehouse_id} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, warehouse_id: e.target.value })} className="input">
                <option value="">Global product stock (no warehouse)</option>
                {warehouses.filter((warehouse) => warehouse.is_active).map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
              </select>
              <select value={adjustmentForm.type} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, type: e.target.value as 'in' | 'out' | 'adjustment' })} className="input">
                <option value="in">Stock In (Add)</option>
                <option value="out">Stock Out (Remove)</option>
                <option value="adjustment">Adjustment (Set exact; zero allowed)</option>
              </select>
              <input type="number" required min={adjustmentForm.type === 'adjustment' ? 0 : 1} step="1" placeholder={adjustmentForm.type === 'adjustment' ? "Exact stock quantity" : "Quantity"} value={adjustmentForm.quantity || (adjustmentForm.type === 'adjustment' ? '0' : '')} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, quantity: e.target.value === '' ? 0 : Number(e.target.value) })} className="input" />
              <textarea placeholder="Notes (optional)" value={adjustmentForm.notes} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, notes: e.target.value })} className="input min-h-[60px]" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAdjustment(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
