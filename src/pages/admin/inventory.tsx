import { useState, useEffect } from 'react';
import { AlertTriangle, Package, TrendingDown, History } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/utils';
import type { InventoryAlert, InventoryMovement } from '@/lib/types';

interface InventoryProduct {
  id: string;
  name: string;
  sku: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
}

export default function AdminInventory() {
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const { toast } = useToast();
  const [adjustmentForm, setAdjustmentForm] = useState({ product_id: '', quantity: 0, type: 'in' as 'in' | 'out' | 'adjustment', notes: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [alertsRes, movementsRes, productsRes] = await Promise.all([
      supabase.from('inventory_alerts').select('*, product:products(id, name, sku)').eq('is_resolved', false).order('created_at', { ascending: false }),
      supabase.from('inventory_movements').select('*, product:products(name)').order('created_at', { ascending: false }).limit(50),
      supabase.from('products').select('id, name, sku, stock_quantity, low_stock_threshold').order('name'),
    ]);
    setAlerts(alertsRes.data || []);
    setMovements(movementsRes.data || []);
    setProducts(productsRes.data || []);
    setLoading(false);
  };

  const handleAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find(p => p.id === adjustmentForm.product_id);
    if (!product) {
      toast({ title: 'Select a product', variant: 'destructive' });
      return;
    }

    const newStock = adjustmentForm.type === 'adjustment'
      ? adjustmentForm.quantity
      : product.stock_quantity + (adjustmentForm.type === 'in' ? adjustmentForm.quantity : -adjustmentForm.quantity);

    if (newStock < 0) {
      toast({ title: 'Stock cannot go below zero', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error: movementError } = await supabase.from('inventory_movements').insert({
        product_id: adjustmentForm.product_id,
        movement_type: adjustmentForm.type,
        quantity: adjustmentForm.quantity,
        previous_stock: product.stock_quantity,
        new_stock: newStock,
        notes: adjustmentForm.notes || null,
      });
      if (movementError) throw movementError;

      const { error: productError } = await supabase.from('products').update({ stock_quantity: newStock }).eq('id', adjustmentForm.product_id);
      if (productError) throw productError;

      if (newStock <= product.low_stock_threshold) {
        await supabase.from('inventory_alerts').insert({
          product_id: product.id,
          alert_type: 'low_stock',
          threshold: product.low_stock_threshold,
          current_stock: newStock,
        });
      }

      toast({ title: 'Stock adjustment recorded' });
      setShowAdjustment(false);
      setAdjustmentForm({ product_id: '', quantity: 0, type: 'in', notes: '' });
      await fetchData();
    } catch {
      toast({ title: 'Failed to record adjustment', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const resolveAlert = async (id: string) => {
    try {
      const { error } = await supabase.from('inventory_alerts').update({ is_resolved: true, resolved_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch {
      toast({ title: 'Failed to resolve alert', variant: 'destructive' });
    }
  };

  const lowStockProducts = products.filter(p => p.stock_quantity <= p.low_stock_threshold);

  if (loading) return <AdminLayout title="Inventory"><div className="text-center py-12 text-navy-400">Loading inventory...</div></AdminLayout>;

  return (
    <AdminLayout title="Inventory Management">
      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-navy-500">Total Products</span>
            <Package className="w-4 h-4 text-navy-300" />
          </div>
          <p className="text-2xl font-bold text-navy-900">{products.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-navy-500">Low Stock</span>
            <TrendingDown className="w-4 h-4 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">{lowStockProducts.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-navy-500">Active Alerts</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600">{alerts.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-navy-500">Recent Movements</span>
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
          <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Low Stock Alerts
          </h3>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                <div>
                  <p className="font-medium text-navy-900">{alert.product?.name}</p>
                  <p className="text-sm text-navy-400">Stock: {alert.current_stock} / Threshold: {alert.threshold}</p>
                </div>
                <button onClick={() => resolveAlert(alert.id)} className="text-sm text-red-600 hover:underline font-medium">Resolve</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock Overview */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="font-semibold text-navy-900">Stock Overview</h3>
        </div>
        {products.length === 0 ? (
          <p className="text-navy-400 text-sm text-center py-12">No products yet - add products first to track their stock here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Product</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">SKU</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Stock</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Threshold</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((product) => {
                  const isLow = product.stock_quantity <= product.low_stock_threshold;
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-navy-900">{product.name}</td>
                      <td className="px-6 py-4 text-sm text-navy-400">{product.sku || '-'}</td>
                      <td className="px-6 py-4 text-navy-700">{product.stock_quantity}</td>
                      <td className="px-6 py-4 text-navy-500">{product.low_stock_threshold}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded font-medium ${isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {isLow ? 'Low Stock' : 'In Stock'}
                        </span>
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
          <h3 className="font-semibold text-navy-900">Recent Movements</h3>
        </div>
        {movements.length === 0 ? (
          <p className="text-navy-400 text-sm text-center py-12">No stock movements recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Product</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Qty</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Stock</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {movements.slice(0, 20).map((mov) => (
                  <tr key={mov.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-navy-500">{formatDateTime(mov.created_at)}</td>
                    <td className="px-6 py-4 font-medium text-navy-900">{mov.product?.name}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        mov.movement_type === 'in' ? 'bg-green-100 text-green-700' :
                        mov.movement_type === 'out' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {mov.movement_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-navy-700">{mov.movement_type === 'out' ? '-' : '+'}{mov.quantity}</td>
                    <td className="px-6 py-4 text-sm text-navy-500">{mov.previous_stock} → {mov.new_stock}</td>
                    <td className="px-6 py-4 text-sm text-navy-400">{mov.notes || '-'}</td>
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
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock_quantity})</option>)}
              </select>
              <select value={adjustmentForm.type} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, type: e.target.value as 'in' | 'out' | 'adjustment' })} className="input">
                <option value="in">Stock In (Add)</option>
                <option value="out">Stock Out (Remove)</option>
                <option value="adjustment">Adjustment (Set exact)</option>
              </select>
              <input type="number" required min={1} placeholder="Quantity" value={adjustmentForm.quantity || ''} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, quantity: parseInt(e.target.value) || 0 })} className="input" />
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
