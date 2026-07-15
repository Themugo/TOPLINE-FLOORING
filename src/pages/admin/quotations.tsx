import { useState } from 'react';
import { Eye, X, Plus, Trash2, Download, ArrowRightCircle, UserPlus } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { useQuotations, useSiteSettings } from '@/hooks/use-data';
import { formatDateTime, formatKES } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { generateQuotationPdf } from '@/lib/pdf';
import { useToast } from '@/hooks/use-toast';
import type { Quotation, QuotationItem, QuotationStatus } from '@/lib/types';

const STATUS_FLOW: { value: QuotationStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  { value: 'sent', label: 'Sent', color: 'bg-blue-100 text-blue-700' },
  { value: 'negotiating', label: 'Negotiating', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-700' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
  { value: 'converted', label: 'Converted to Order', color: 'bg-primary-200 text-primary-800' },
  // Legacy values - still selectable so old records aren't stuck, but not
  // part of the new flow going forward.
  { value: 'new', label: 'New (legacy)', color: 'bg-gray-100 text-gray-500' },
  { value: 'contacted', label: 'Contacted (legacy)', color: 'bg-gray-100 text-gray-500' },
  { value: 'quoted', label: 'Quoted (legacy)', color: 'bg-gray-100 text-gray-500' },
  { value: 'won', label: 'Won (legacy)', color: 'bg-gray-100 text-gray-500' },
  { value: 'lost', label: 'Lost (legacy)', color: 'bg-gray-100 text-gray-500' },
];

const statusMeta = (status: string) => STATUS_FLOW.find((s) => s.value === status) || STATUS_FLOW[0];

export default function AdminQuotations() {
  const { quotations, loading, refetch } = useQuotations();
  const { settings } = useSiteSettings();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Quotation | null>(null);

  const updateStatus = async (id: string, status: string) => {
    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === 'sent') updates.sent_at = new Date().toISOString();
    if (['accepted', 'rejected'].includes(status)) updates.responded_at = new Date().toISOString();

    const { error } = await supabase.from('quotations').update(updates).eq('id', id);
    if (!error) {
      refetch();
      if (selected?.id === id) setSelected({ ...selected, status: status as QuotationStatus });
    } else {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    }
  };

  const handleDownloadPdf = (q: Quotation) => {
    generateQuotationPdf(q, q.items || [], {
      name: settings.site_info?.name || 'Topline Flooring & Waterproofing',
      tagline: settings.site_info?.tagline,
      phone: settings.contact?.phone,
      email: settings.contact?.email,
      address: settings.contact?.address,
    });
  };

  const handleConvertToOrder = async (q: Quotation) => {
    if (!q.items || q.items.length === 0) {
      toast({ title: 'Add line items before converting to an order', variant: 'destructive' });
      return;
    }
    if (!confirm(`Convert quotation ${q.quotation_number || ''} into a real order?`)) return;

    try {
      const { data: customer, error: custErr } = await supabase
        .from('customers')
        .insert({ name: q.name, email: q.email, phone: q.phone })
        .select()
        .single();
      if (custErr) throw custErr;

      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          customer_id: customer.id,
          customer_name: q.name,
          customer_email: q.email,
          customer_phone: q.phone,
          total_amount: q.total_amount,
          notes: `Converted from quotation ${q.quotation_number || q.id}`,
          status: 'pending',
        })
        .select()
        .single();
      if (orderErr) throw orderErr;

      const orderItems = q.items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.description,
        quantity: Math.round(item.quantity),
        unit_price: item.unit_price,
      }));
      const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
      if (itemsErr) throw itemsErr;

      await supabase.from('quotations').update({
        status: 'converted',
        converted_order_id: order.id,
        updated_at: new Date().toISOString(),
      }).eq('id', q.id);

      toast({ title: 'Converted to order', description: `Order created for ${q.name}` });
      refetch();
      setSelected(null);
    } catch {
      toast({ title: 'Failed to convert to order', variant: 'destructive' });
    }
  };

  const handleCreateLead = async (q: Quotation) => {
    try {
      const { data: lead, error } = await supabase
        .from('leads')
        .insert({
          name: q.name,
          email: q.email,
          phone: q.phone,
          company: q.company,
          source: 'website',
          status: 'new',
          estimated_value: q.total_amount || null,
          notes: q.message ? `From quotation request: ${q.message}` : `From quotation request${q.project_type ? ` (${q.project_type})` : ''}`,
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from('quotations').update({ lead_id: lead.id }).eq('id', q.id);
      toast({ title: 'Lead created', description: 'Now tracked in CRM / Leads' });
      refetch();
    } catch {
      toast({ title: 'Failed to create lead', variant: 'destructive' });
    }
  };

  return (
    <AdminLayout title="Quotations">
      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : quotations.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
          <p className="text-gray-500">No quotation requests yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Quote #</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {quotations.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-500">{q.quotation_number || '-'}</td>
                  <td className="px-6 py-4">
                    <p className="font-medium">{q.name}</p>
                    <p className="text-xs text-gray-500">{q.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm">{q.project_type || '-'}</p>
                    {q.area_size && <p className="text-xs text-gray-500">{q.area_size}</p>}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">{q.total_amount ? formatKES(q.total_amount) : '-'}</td>
                  <td className="px-6 py-4">
                    <select
                      value={q.status}
                      onChange={(e) => updateStatus(q.id, e.target.value)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 ${statusMeta(q.status).color}`}
                    >
                      {STATUS_FLOW.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDateTime(q.created_at)}</td>
                  <td className="px-6 py-4 flex items-center gap-1">
                    <button onClick={() => setSelected(q)} className="p-2 text-gray-600 hover:text-gray-900" title="View / edit">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDownloadPdf(q)} className="p-2 text-gray-600 hover:text-primary-600" title="Download PDF">
                      <Download className="w-4 h-4" />
                    </button>
                    {!q.lead_id && (
                      <button onClick={() => handleCreateLead(q)} className="p-2 text-gray-600 hover:text-primary-600" title="Create CRM Lead">
                        <UserPlus className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <QuotationDetail
          quotation={selected}
          onClose={() => setSelected(null)}
          onUpdated={refetch}
          onDownloadPdf={handleDownloadPdf}
          onConvert={handleConvertToOrder}
          onCreateLead={handleCreateLead}
        />
      )}
    </AdminLayout>
  );
}

function QuotationDetail({
  quotation,
  onClose,
  onUpdated,
  onDownloadPdf,
  onConvert,
  onCreateLead,
}: {
  quotation: Quotation;
  onClose: () => void;
  onUpdated: () => void;
  onDownloadPdf: (q: Quotation) => void;
  onConvert: (q: Quotation) => void;
  onCreateLead: (q: Quotation) => void;
}) {
  const { toast } = useToast();
  const [items, setItems] = useState<QuotationItem[]>(quotation.items || []);
  const [newItem, setNewItem] = useState({ description: '', quantity: '1', unit: 'sqm', unit_price: '0' });
  const [saving, setSaving] = useState(false);

  const recalcTotals = (list: QuotationItem[]) => {
    const subtotal = list.reduce((sum, i) => sum + i.line_total, 0);
    const taxRate = quotation.tax_rate || 16;
    const taxAmount = subtotal * (taxRate / 100);
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  };

  const persistTotals = async (list: QuotationItem[]) => {
    const { subtotal, taxAmount, total } = recalcTotals(list);
    await supabase.from('quotations').update({
      subtotal,
      tax_amount: taxAmount,
      total_amount: total,
      updated_at: new Date().toISOString(),
    }).eq('id', quotation.id);
    onUpdated();
  };

  const handleAddItem = async () => {
    if (!newItem.description.trim()) return;
    setSaving(true);
    try {
      const quantity = Number(newItem.quantity) || 0;
      const unit_price = Number(newItem.unit_price) || 0;
      const { data, error } = await supabase
        .from('quotation_items')
        .insert({
          quotation_id: quotation.id,
          description: newItem.description,
          quantity,
          unit: newItem.unit,
          unit_price,
          line_total: quantity * unit_price,
        })
        .select()
        .single();
      if (error) throw error;

      const updated = [...items, data];
      setItems(updated);
      await persistTotals(updated);
      setNewItem({ description: '', quantity: '1', unit: 'sqm', unit_price: '0' });
    } catch {
      toast({ title: 'Failed to add item', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveItem = async (id: string) => {
    const { error } = await supabase.from('quotation_items').delete().eq('id', id);
    if (error) {
      toast({ title: 'Failed to remove item', variant: 'destructive' });
      return;
    }
    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    await persistTotals(updated);
  };

  const { subtotal, taxAmount, total } = recalcTotals(items);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-lg">Quotation {quotation.quotation_number || ''}</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-6">
          <div><span className="text-gray-500">Name:</span> <span className="font-medium">{quotation.name}</span></div>
          <div><span className="text-gray-500">Email:</span> {quotation.email}</div>
          <div><span className="text-gray-500">Phone:</span> {quotation.phone}</div>
          {quotation.company && <div><span className="text-gray-500">Company:</span> {quotation.company}</div>}
          <div><span className="text-gray-500">Project:</span> {quotation.project_type || '-'}</div>
          <div><span className="text-gray-500">Area:</span> {quotation.area_size || '-'}</div>
          <div className="col-span-2"><span className="text-gray-500">Location:</span> {quotation.location || '-'}</div>
        </div>

        {quotation.message && (
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-1">Message:</p>
            <p className="bg-gray-50 p-3 rounded text-sm">{quotation.message}</p>
          </div>
        )}

        <div className="mb-4">
          <h3 className="font-semibold text-navy-900 mb-2">Quote Line Items</h3>
          <div className="space-y-2 mb-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{item.description}</p>
                  <p className="text-xs text-gray-500">{item.quantity} {item.unit} × {formatKES(item.unit_price)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{formatKES(item.line_total)}</span>
                  <button onClick={() => handleRemoveItem(item.id)}><Trash2 className="w-4 h-4 text-red-500" /></button>
                </div>
              </div>
            ))}
            {items.length === 0 && <p className="text-xs text-gray-400">No line items yet - add products/services below to build an itemized quote.</p>}
          </div>

          <div className="grid grid-cols-5 gap-2">
            <input
              placeholder="Description"
              className="input text-sm col-span-2"
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            />
            <input type="number" placeholder="Qty" className="input text-sm" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} />
            <input placeholder="Unit" className="input text-sm" value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} />
            <input type="number" placeholder="Price" className="input text-sm" value={newItem.unit_price} onChange={(e) => setNewItem({ ...newItem, unit_price: e.target.value })} />
          </div>
          <button onClick={handleAddItem} disabled={saving} className="btn-secondary text-sm mt-2 flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add Line Item
          </button>
        </div>

        {items.length > 0 && (
          <div className="text-right text-sm space-y-1 mb-6">
            <p>Subtotal: {formatKES(subtotal)}</p>
            <p>VAT ({quotation.tax_rate || 16}%): {formatKES(taxAmount)}</p>
            <p className="font-semibold text-base">Total: {formatKES(total)}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button onClick={() => onDownloadPdf({ ...quotation, items })} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Download PDF
          </button>
          {!quotation.lead_id && (
            <button onClick={() => onCreateLead(quotation)} className="btn-secondary flex items-center gap-2 text-sm">
              <UserPlus className="w-4 h-4" /> Create CRM Lead
            </button>
          )}
          {quotation.status === 'accepted' && (
            <button onClick={() => onConvert({ ...quotation, items, subtotal, tax_amount: taxAmount, total_amount: total })} className="btn-primary flex items-center gap-2 text-sm">
              <ArrowRightCircle className="w-4 h-4" /> Convert to Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
