import { useState } from 'react';
import { Plus, X, Trash2, Building2, Pencil, ArrowLeftRight, PackageSearch } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { useWarehouses, useWarehouseStock, useStockTransfers, useProducts } from '@/hooks/use-data';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Warehouse } from '@/lib/types';

export default function AdminWarehouses() {
  const [tab, setTab] = useState<'warehouses' | 'stock' | 'transfers'>('warehouses');

  return (
    <AdminLayout title="Warehouses">
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setTab('warehouses')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'warehouses' ? 'border-primary-500 text-primary-600' : 'border-transparent text-navy-400 hover:text-navy-600'}`}
        >
          Warehouses
        </button>
        <button
          onClick={() => setTab('stock')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'stock' ? 'border-primary-500 text-primary-600' : 'border-transparent text-navy-400 hover:text-navy-600'}`}
        >
          Stock by Location
        </button>
        <button
          onClick={() => setTab('transfers')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'transfers' ? 'border-primary-500 text-primary-600' : 'border-transparent text-navy-400 hover:text-navy-600'}`}
        >
          Transfers
        </button>
      </div>

      {tab === 'warehouses' && <WarehousesTab />}
      {tab === 'stock' && <StockTab />}
      {tab === 'transfers' && <TransfersTab />}
    </AdminLayout>
  );
}

function WarehousesTab() {
  const { warehouses, loading, createWarehouse, updateWarehouse, deleteWarehouse } = useWarehouses();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', address: '', phone: '', manager_name: '', is_default: false, is_active: true });

  const resetForm = () => {
    setForm({ name: '', code: '', address: '', phone: '', manager_name: '', is_default: false, is_active: true });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateWarehouse(editing.id, form);
        toast({ title: 'Warehouse updated' });
      } else {
        await createWarehouse(form);
        toast({ title: 'Warehouse added' });
      }
      resetForm();
    } catch {
      toast({ title: 'Failed to save warehouse', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this warehouse? Stock records tied to it will also be removed.')) return;
    try {
      await deleteWarehouse(id);
      toast({ title: 'Warehouse deleted' });
    } catch {
      toast({ title: 'Failed to delete warehouse', variant: 'destructive' });
    }
  };

  return (
    <div>
      <div className="mb-4">
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Warehouse
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-navy-400">Loading warehouses...</div>
      ) : warehouses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-navy-500 mb-4">No warehouses yet.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">Add Your First Warehouse</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Code</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Manager</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Phone</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {warehouses.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-navy-900">
                      {w.name}
                      {w.is_default && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-700">Default</span>}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-navy-500">{w.code || '-'}</td>
                    <td className="px-6 py-4 text-sm text-navy-500">{w.manager_name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-navy-500">{w.phone || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${w.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-navy-500'}`}>
                        {w.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setEditing(w);
                          setForm({ name: w.name, code: w.code || '', address: w.address || '', phone: w.phone || '', manager_name: w.manager_name || '', is_default: w.is_default, is_active: w.is_active });
                          setShowForm(true);
                        }}
                        className="p-2 text-navy-500 hover:text-primary-600" title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(w.id)} className="p-2 text-navy-500 hover:text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={resetForm}>
          <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg text-navy-900">{editing ? 'Edit Warehouse' : 'Add Warehouse'}</h2>
              <button onClick={resetForm}><X className="w-5 h-5 text-navy-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input required placeholder="Warehouse name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
              <input placeholder="Code (e.g. MAIN, NRB-01)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="input" />
              <input placeholder="Manager name" value={form.manager_name} onChange={(e) => setForm({ ...form, manager_name: e.target.value })} className="input" />
              <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
              <textarea placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input min-h-[60px]" />
              <label className="flex items-center gap-2 text-sm text-navy-600">
                <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
                Default warehouse
              </label>
              <label className="flex items-center gap-2 text-sm text-navy-600">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Active
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForm} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StockTab() {
  const { warehouses } = useWarehouses();
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const { stock, loading, refetch } = useWarehouseStock(filterWarehouse || undefined);
  const { products } = useProducts();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ warehouse_id: '', product_id: '', quantity: 0, notes: '' });

  const handleSetStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.warehouse_id || !form.product_id) {
      toast({ title: 'Select a warehouse and a product', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('warehouse_stock')
        .select('quantity')
        .eq('warehouse_id', form.warehouse_id)
        .eq('product_id', form.product_id)
        .maybeSingle();
      const previous = existing?.quantity ?? 0;

      const { error: upsertError } = await supabase
        .from('warehouse_stock')
        .upsert({ warehouse_id: form.warehouse_id, product_id: form.product_id, quantity: form.quantity, updated_at: new Date().toISOString() }, { onConflict: 'warehouse_id,product_id' });
      if (upsertError) throw upsertError;

      if (previous !== form.quantity) {
        await supabase.from('inventory_movements').insert({
          product_id: form.product_id,
          warehouse_id: form.warehouse_id,
          movement_type: 'adjustment',
          quantity: Math.abs(form.quantity - previous),
          previous_stock: previous,
          new_stock: form.quantity,
          reference_type: 'warehouse_adjustment',
          notes: form.notes || 'Warehouse stock set manually',
        });
      }

      toast({ title: 'Warehouse stock updated' });
      setShowForm(false);
      setForm({ warehouse_id: '', product_id: '', quantity: 0, notes: '' });
      await refetch();
    } catch {
      toast({ title: 'Failed to update stock', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <select value={filterWarehouse} onChange={(e) => setFilterWarehouse(e.target.value)} className="input max-w-xs">
          <option value="">All warehouses</option>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Set Stock
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-navy-400">Loading stock...</div>
      ) : stock.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <PackageSearch className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-navy-500">No stock allocated to a warehouse yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Product</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">SKU</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Warehouse</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Quantity</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stock.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-navy-900">{row.product?.name || 'Unknown product'}</td>
                    <td className="px-6 py-4 text-sm text-navy-400">{row.product?.sku || '-'}</td>
                    <td className="px-6 py-4 text-sm text-navy-600">{row.warehouse?.name || '-'}</td>
                    <td className="px-6 py-4 text-navy-700">{row.quantity}</td>
                    <td className="px-6 py-4 text-sm text-navy-400">{formatDateTime(row.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg text-navy-900">Set Warehouse Stock</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-navy-400" /></button>
            </div>
            <form onSubmit={handleSetStock} className="space-y-3">
              <select required value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })} className="input">
                <option value="">Select warehouse</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <select required value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} className="input">
                <option value="">Select product</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" required min={0} placeholder="Quantity" value={form.quantity || ''} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} className="input" />
              <textarea placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input min-h-[60px]" />
              <p className="text-xs text-navy-400 bg-blue-50 rounded-lg p-3">
                This sets the exact quantity held at this location and logs an inventory movement. It does not change the product's total stock used storefront-wide - use Transfers to move stock between warehouses, or the main Inventory page to adjust total stock.
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TransfersTab() {
  const { warehouses } = useWarehouses();
  const { products } = useProducts();
  const { transfers, loading, createTransfer } = useStockTransfers();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ from_warehouse_id: '', to_warehouse_id: '', product_id: '', quantity: 1, notes: '' });

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.from_warehouse_id === form.to_warehouse_id) {
      toast({ title: 'Source and destination must differ', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const transfer = await createTransfer({
        from_warehouse_id: form.from_warehouse_id,
        to_warehouse_id: form.to_warehouse_id,
        product_id: form.product_id,
        quantity: form.quantity,
        notes: form.notes || null,
      });
      toast({ title: 'Stock transferred', description: transfer.transfer_number });
      setShowForm(false);
      setForm({ from_warehouse_id: '', to_warehouse_id: '', product_id: '', quantity: 1, notes: '' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to transfer stock';
      toast({ title: message.includes('Insufficient stock') ? 'Insufficient stock at source warehouse' : 'Failed to transfer stock', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2" disabled={warehouses.length < 2}>
          <ArrowLeftRight className="w-4 h-4" /> Transfer Stock
        </button>
        {warehouses.length < 2 && <p className="text-xs text-navy-400 mt-2">Add at least two warehouses to transfer stock between them.</p>}
      </div>

      {loading ? (
        <div className="text-center py-12 text-navy-400">Loading transfers...</div>
      ) : transfers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ArrowLeftRight className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-navy-500">No stock transfers recorded yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Transfer #</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Product</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">From</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">To</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Qty</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono text-navy-500">{t.transfer_number}</td>
                    <td className="px-6 py-4 font-medium text-navy-900">{t.product?.name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-navy-600">{t.from_warehouse?.name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-navy-600">{t.to_warehouse?.name || '-'}</td>
                    <td className="px-6 py-4 text-navy-700">{t.quantity}</td>
                    <td className="px-6 py-4 text-sm text-navy-400">{formatDateTime(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg text-navy-900">Transfer Stock</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-navy-400" /></button>
            </div>
            <form onSubmit={handleTransfer} className="space-y-3">
              <select required value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} className="input">
                <option value="">Select product</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select required value={form.from_warehouse_id} onChange={(e) => setForm({ ...form, from_warehouse_id: e.target.value })} className="input">
                <option value="">From warehouse</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <select required value={form.to_warehouse_id} onChange={(e) => setForm({ ...form, to_warehouse_id: e.target.value })} className="input">
                <option value="">To warehouse</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <input type="number" required min={1} placeholder="Quantity" value={form.quantity || ''} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} className="input" />
              <textarea placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input min-h-[60px]" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Transferring...' : 'Transfer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
