import { useState } from 'react';
import { Plus, X, Trash2, Truck, Pencil, PackageCheck } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { useSuppliers, usePurchaseOrders, useProducts } from '@/hooks/use-data';
import { useToast } from '@/hooks/use-toast';
import { formatKES, formatDateTime } from '@/lib/utils';
import type { Supplier, PurchaseOrder, PurchaseOrderStatus } from '@/lib/types';

const PO_STATUS_STYLES: Record<PurchaseOrderStatus, string> = {
  draft: 'bg-gray-100 text-navy-600',
  sent: 'bg-blue-100 text-blue-700',
  partial: 'bg-yellow-100 text-yellow-700',
  received: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function AdminSuppliers() {
  const [tab, setTab] = useState<'suppliers' | 'purchase-orders'>('purchase-orders');

  return (
    <AdminLayout title="Suppliers & Purchase Orders">
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setTab('purchase-orders')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'purchase-orders' ? 'border-primary-500 text-primary-600' : 'border-transparent text-navy-400 hover:text-navy-600'}`}
        >
          Purchase Orders
        </button>
        <button
          onClick={() => setTab('suppliers')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'suppliers' ? 'border-primary-500 text-primary-600' : 'border-transparent text-navy-400 hover:text-navy-600'}`}
        >
          Suppliers
        </button>
      </div>

      {tab === 'suppliers' ? <SuppliersTab /> : <PurchaseOrdersTab />}
    </AdminLayout>
  );
}

function SuppliersTab() {
  const { suppliers, loading, createSupplier, updateSupplier, deleteSupplier } = useSuppliers();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', contact_person: '', email: '', phone: '', address: '', notes: '' });

  const resetForm = () => {
    setForm({ name: '', contact_person: '', email: '', phone: '', address: '', notes: '' });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateSupplier(editing.id, form);
        toast({ title: 'Supplier updated' });
      } else {
        await createSupplier({ ...form, is_active: true });
        toast({ title: 'Supplier added' });
      }
      resetForm();
    } catch {
      toast({ title: 'Failed to save supplier', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this supplier?')) return;
    try {
      await deleteSupplier(id);
      toast({ title: 'Supplier deleted' });
    } catch {
      toast({ title: 'Failed to delete supplier', variant: 'destructive' });
    }
  };

  return (
    <div>
      <div className="mb-4">
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Supplier
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-navy-400">Loading suppliers...</div>
      ) : suppliers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Truck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-navy-500 mb-4">No suppliers yet.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">Add Your First Supplier</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Contact</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Phone / Email</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-navy-900">{s.name}</td>
                    <td className="px-6 py-4 text-sm text-navy-500">{s.contact_person || '-'}</td>
                    <td className="px-6 py-4 text-sm text-navy-500">{s.phone || s.email || '-'}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => { setEditing(s); setForm({ name: s.name, contact_person: s.contact_person || '', email: s.email || '', phone: s.phone || '', address: s.address || '', notes: s.notes || '' }); setShowForm(true); }} className="p-2 text-navy-500 hover:text-primary-600" title="Edit"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(s.id)} className="p-2 text-navy-500 hover:text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
              <h2 className="font-semibold text-lg text-navy-900">{editing ? 'Edit Supplier' : 'Add Supplier'}</h2>
              <button onClick={resetForm}><X className="w-5 h-5 text-navy-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input required placeholder="Supplier name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
              <input placeholder="Contact person" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} className="input" />
              <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
              <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
              <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" />
              <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input min-h-[60px]" />
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

function PurchaseOrdersTab() {
  const { purchaseOrders, loading, createPurchaseOrder, updatePurchaseOrderStatus } = usePurchaseOrders();
  const { suppliers } = useSuppliers();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<PurchaseOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ supplier_id: '', expected_date: '', notes: '' });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const po = await createPurchaseOrder({
        supplier_id: form.supplier_id || null,
        expected_date: form.expected_date || null,
        notes: form.notes || null,
      });
      toast({ title: 'Purchase order created', description: po.po_number });
      setShowForm(false);
      setForm({ supplier_id: '', expected_date: '', notes: '' });
      setSelected(po);
    } catch {
      toast({ title: 'Failed to create purchase order', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Purchase Order
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-navy-400">Loading purchase orders...</div>
      ) : purchaseOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <PackageCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-navy-500 mb-4">No purchase orders yet.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">Create Your First PO</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">PO #</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Supplier</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Expected</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Created</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono text-navy-500">{po.po_number}</td>
                    <td className="px-6 py-4 font-medium text-navy-900">{po.supplier?.name || 'No supplier'}</td>
                    <td className="px-6 py-4">
                      <select
                        value={po.status}
                        onChange={(e) => updatePurchaseOrderStatus(po.id, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 ${PO_STATUS_STYLES[po.status]}`}
                      >
                        <option value="draft">draft</option>
                        <option value="sent">sent</option>
                        <option value="partial">partial</option>
                        <option value="received">received</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-navy-500">{po.expected_date ? new Date(po.expected_date).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4 text-sm text-navy-400">{formatDateTime(po.created_at)}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => setSelected(po)} className="text-sm text-primary-600 hover:underline font-medium">Manage</button>
                    </td>
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
              <h2 className="font-semibold text-lg text-navy-900">New Purchase Order</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-navy-400" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <select value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })} className="input">
                <option value="">Select supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input type="date" placeholder="Expected date" value={form.expected_date} onChange={(e) => setForm({ ...form, expected_date: e.target.value })} className="input" />
              <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input min-h-[60px]" />
              <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? 'Creating...' : 'Create PO'}</button>
              <p className="text-xs text-navy-400 text-center">You'll add line items next.</p>
            </form>
          </div>
        </div>
      )}

      {selected && <PurchaseOrderDetail po={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function PurchaseOrderDetail({ po, onClose }: { po: PurchaseOrder; onClose: () => void }) {
  const { purchaseOrders, addPurchaseOrderItem, removePurchaseOrderItem, receiveItem } = usePurchaseOrders();
  const { products } = useProducts();
  const { toast } = useToast();
  const [newItem, setNewItem] = useState({ product_id: '', description: '', quantity_ordered: '1', unit_cost: '0' });
  const [saving, setSaving] = useState(false);

  const current = purchaseOrders.find((p) => p.id === po.id) || po;
  const items = current.items || [];

  const handleAddItem = async () => {
    if (!newItem.description.trim()) {
      toast({ title: 'Enter a description', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await addPurchaseOrderItem(current.id, {
        product_id: newItem.product_id || null,
        description: newItem.description,
        quantity_ordered: Number(newItem.quantity_ordered) || 1,
        unit_cost: Number(newItem.unit_cost) || 0,
      });
      setNewItem({ product_id: '', description: '', quantity_ordered: '1', unit_cost: '0' });
    } catch {
      toast({ title: 'Failed to add item', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReceive = async (itemId: string, ordered: number, currentReceived: number) => {
    const input = prompt(`Quantity received (ordered: ${ordered}):`, String(ordered));
    if (input === null) return;
    const qty = Number(input);
    if (isNaN(qty) || qty < 0) {
      toast({ title: 'Enter a valid quantity', variant: 'destructive' });
      return;
    }
    try {
      await receiveItem(itemId, qty);
      if (qty > currentReceived) {
        toast({ title: 'Goods received', description: 'Stock updated automatically.' });
      }
    } catch {
      toast({ title: 'Failed to record receipt', variant: 'destructive' });
    }
  };

  const totalCost = items.reduce((sum, i) => sum + i.quantity_ordered * i.unit_cost, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-lg text-navy-900">PO {current.po_number} - {current.supplier?.name}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-navy-400" /></button>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold text-navy-900 mb-2">Line Items</h3>
          <div className="space-y-2 mb-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{item.description}</p>
                  <p className="text-xs text-navy-400">
                    Ordered: {item.quantity_ordered} · Received: {item.quantity_received} · {formatKES(item.unit_cost)}/unit
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleReceive(item.id, item.quantity_ordered, item.quantity_received)} className="text-xs font-medium text-primary-600 hover:underline">
                    Receive
                  </button>
                  <button onClick={() => removePurchaseOrderItem(item.id)}><Trash2 className="w-4 h-4 text-red-500" /></button>
                </div>
              </div>
            ))}
            {items.length === 0 && <p className="text-xs text-navy-400">No line items yet.</p>}
          </div>

          <div className="grid grid-cols-4 gap-2">
            <select className="input text-sm col-span-2" value={newItem.product_id} onChange={(e) => {
              const product = products.find(p => p.id === e.target.value);
              setNewItem({ ...newItem, product_id: e.target.value, description: product ? product.name : newItem.description });
            }}>
              <option value="">Link to product (optional)</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="number" placeholder="Qty" className="input text-sm" value={newItem.quantity_ordered} onChange={(e) => setNewItem({ ...newItem, quantity_ordered: e.target.value })} />
            <input type="number" placeholder="Unit cost" className="input text-sm" value={newItem.unit_cost} onChange={(e) => setNewItem({ ...newItem, unit_cost: e.target.value })} />
          </div>
          <input placeholder="Description" className="input text-sm mt-2" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} />
          <button onClick={handleAddItem} disabled={saving} className="btn-secondary text-sm mt-2 flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add Line Item
          </button>
        </div>

        {items.length > 0 && (
          <p className="text-right font-semibold text-navy-900 pt-3 border-t border-gray-100">
            Total Cost: {formatKES(totalCost)}
          </p>
        )}

        <p className="text-xs text-navy-400 mt-4 bg-blue-50 rounded-lg p-3">
          Marking items as received automatically increases stock and logs an inventory movement - no manual stock adjustment needed.
        </p>
      </div>
    </div>
  );
}
