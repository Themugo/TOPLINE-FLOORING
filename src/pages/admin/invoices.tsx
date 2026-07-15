import { useState } from 'react';
import { Plus, X, Trash2, Download, DollarSign, FileText } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { useInvoices, useCustomers, useSiteSettings } from '@/hooks/use-data';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime, formatKES } from '@/lib/utils';
import { generateInvoicePdf } from '@/lib/pdf';
import type { Invoice, InvoiceStatus, PaymentMethod } from '@/lib/types';

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-navy-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  partial: 'bg-yellow-100 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-navy-400',
};

const STATUS_OPTIONS: InvoiceStatus[] = ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'];

export default function AdminInvoices() {
  const { invoices, loading, createInvoice, updateInvoiceStatus } = useInvoices();
  const { customers } = useCustomers();
  const { settings } = useSiteSettings();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_id: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    billing_address: '',
    tax_rate: '16',
    due_date: '',
    notes: '',
  });

  const totalOutstanding = invoices
    .filter((inv) => !['paid', 'cancelled'].includes(inv.status))
    .reduce((sum, inv) => sum + (inv.total_amount - inv.amount_paid), 0);

  const handleCustomerPick = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setForm({
        ...form,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        billing_address: customer.address || '',
      });
    } else {
      setForm({ ...form, customer_id: '' });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_name.trim()) {
      toast({ title: 'Customer name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const invoice = await createInvoice({
        customer_id: form.customer_id || null,
        customer_name: form.customer_name,
        customer_email: form.customer_email || null,
        customer_phone: form.customer_phone || null,
        billing_address: form.billing_address || null,
        tax_rate: Number(form.tax_rate) || 16,
        due_date: form.due_date || null,
        notes: form.notes || null,
      });
      toast({ title: 'Invoice created', description: `#${invoice.invoice_number}` });
      setShowCreate(false);
      setForm({ customer_id: '', customer_name: '', customer_email: '', customer_phone: '', billing_address: '', tax_rate: '16', due_date: '', notes: '' });
      setSelected(invoice);
    } catch {
      toast({ title: 'Failed to create invoice', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = (inv: Invoice) => {
    generateInvoicePdf(inv, inv.items || [], inv.payments || [], {
      name: settings.site_info?.name || 'Topline Flooring & Waterproofing',
      tagline: settings.site_info?.tagline,
      phone: settings.contact?.phone,
      email: settings.contact?.email,
      address: settings.contact?.address,
    });
  };

  return (
    <AdminLayout title="Invoices">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-6">
          <div>
            <p className="text-sm text-navy-500">Outstanding Balance</p>
            <p className="text-2xl font-display font-bold text-navy-900">{formatKES(totalOutstanding)}</p>
          </div>
          <div>
            <p className="text-sm text-navy-500">Total Invoices</p>
            <p className="text-2xl font-display font-bold text-navy-900">{invoices.length}</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 w-fit">
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-navy-400">Loading invoices...</div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-navy-500 mb-4">No invoices yet.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">Create Your First Invoice</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Invoice #</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Customer</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Total</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Balance</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.map((inv) => {
                  const balance = inv.total_amount - inv.amount_paid;
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-mono text-navy-500">{inv.invoice_number}</td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-navy-900">{inv.customer_name}</p>
                        {inv.customer_email && <p className="text-xs text-navy-400">{inv.customer_email}</p>}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-navy-900">{formatKES(inv.total_amount)}</td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <span className={balance > 0 ? 'text-red-600' : 'text-green-600'}>{formatKES(balance)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={inv.status}
                          onChange={(e) => updateInvoiceStatus(inv.id, e.target.value)}
                          className={`text-xs font-medium px-2 py-1 rounded-full border-0 ${STATUS_STYLES[inv.status]}`}
                        >
                          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm text-navy-400">{formatDateTime(inv.created_at)}</td>
                      <td className="px-6 py-4 flex items-center gap-1">
                        <button onClick={() => setSelected(inv)} className="p-2 text-navy-500 hover:text-primary-600" title="Manage">
                          <FileText className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDownloadPdf(inv)} className="p-2 text-navy-500 hover:text-primary-600" title="Download PDF">
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg text-navy-900">New Invoice</h2>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-navy-400" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <select value={form.customer_id} onChange={(e) => handleCustomerPick(e.target.value)} className="input">
                <option value="">Select existing customer (optional)</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} - {c.email}</option>)}
              </select>
              <input required placeholder="Customer name *" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="input" />
              <input placeholder="Email" type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} className="input" />
              <input placeholder="Phone" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} className="input" />
              <input placeholder="Billing address" value={form.billing_address} onChange={(e) => setForm({ ...form, billing_address: e.target.value })} className="input" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="VAT rate %" type="number" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} className="input" />
                <input placeholder="Due date" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="input" />
              </div>
              <textarea placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input min-h-[60px]" />
              <button type="submit" disabled={saving} className="btn-primary w-full">
                {saving ? 'Creating...' : 'Create Invoice'}
              </button>
              <p className="text-xs text-navy-400 text-center">You'll add line items and record payments next.</p>
            </form>
          </div>
        </div>
      )}

      {selected && (
        <InvoiceDetail
          invoice={selected}
          onClose={() => setSelected(null)}
          onDownloadPdf={handleDownloadPdf}
        />
      )}
    </AdminLayout>
  );
}

function InvoiceDetail({
  invoice,
  onClose,
  onDownloadPdf,
}: {
  invoice: Invoice;
  onClose: () => void;
  onDownloadPdf: (inv: Invoice) => void;
}) {
  const { invoices, addInvoiceItem, removeInvoiceItem, recordPayment } = useInvoices();
  const { toast } = useToast();
  const [newItem, setNewItem] = useState({ description: '', quantity: '1', unit_price: '0' });
  const [payment, setPayment] = useState({ amount: '', method: 'cash' as PaymentMethod, reference: '' });
  const [savingItem, setSavingItem] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  // Always read the freshest copy from the hook's list (items/payments
  // update after each add), falling back to the prop for the very
  // first render before the hook has re-fetched.
  const current = invoices.find((i) => i.id === invoice.id) || invoice;
  const items = current.items || [];
  const payments = current.payments || [];
  const balance = current.total_amount - current.amount_paid;

  const handleAddItem = async () => {
    if (!newItem.description.trim()) return;
    setSavingItem(true);
    try {
      await addInvoiceItem(current.id, {
        description: newItem.description,
        quantity: Number(newItem.quantity) || 1,
        unit_price: Number(newItem.unit_price) || 0,
      }, current.tax_rate);
      setNewItem({ description: '', quantity: '1', unit_price: '0' });
    } catch {
      toast({ title: 'Failed to add item', variant: 'destructive' });
    } finally {
      setSavingItem(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeInvoiceItem(current.id, itemId, current.tax_rate);
    } catch {
      toast({ title: 'Failed to remove item', variant: 'destructive' });
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(payment.amount);
    if (!amount || amount <= 0) {
      toast({ title: 'Enter a valid payment amount', variant: 'destructive' });
      return;
    }
    setSavingPayment(true);
    try {
      await recordPayment(current.id, amount, payment.method, payment.reference || undefined);
      toast({ title: 'Payment recorded' });
      setPayment({ amount: '', method: 'cash', reference: '' });
    } catch {
      toast({ title: 'Failed to record payment', variant: 'destructive' });
    } finally {
      setSavingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-lg text-navy-900">Invoice {current.invoice_number}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-navy-400" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-6">
          <div><span className="text-navy-400">Customer:</span> <span className="font-medium">{current.customer_name}</span></div>
          <div><span className="text-navy-400">Status:</span> <span className="font-medium capitalize">{current.status}</span></div>
          {current.customer_email && <div><span className="text-navy-400">Email:</span> {current.customer_email}</div>}
          {current.due_date && <div><span className="text-navy-400">Due:</span> {new Date(current.due_date).toLocaleDateString()}</div>}
        </div>

        <div className="mb-4">
          <h3 className="font-semibold text-navy-900 mb-2">Line Items</h3>
          <div className="space-y-2 mb-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{item.description}</p>
                  <p className="text-xs text-navy-400">{item.quantity} × {formatKES(item.unit_price)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{formatKES(item.line_total)}</span>
                  <button onClick={() => handleRemoveItem(item.id)}><Trash2 className="w-4 h-4 text-red-500" /></button>
                </div>
              </div>
            ))}
            {items.length === 0 && <p className="text-xs text-navy-400">No line items yet - add products/services below.</p>}
          </div>

          <div className="grid grid-cols-4 gap-2">
            <input placeholder="Description" className="input text-sm col-span-2" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} />
            <input type="number" placeholder="Qty" className="input text-sm" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} />
            <input type="number" placeholder="Price" className="input text-sm" value={newItem.unit_price} onChange={(e) => setNewItem({ ...newItem, unit_price: e.target.value })} />
          </div>
          <button onClick={handleAddItem} disabled={savingItem} className="btn-secondary text-sm mt-2 flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add Line Item
          </button>
        </div>

        {items.length > 0 && (
          <div className="text-right text-sm space-y-1 mb-6 pb-4 border-b border-gray-100">
            <p>Subtotal: {formatKES(current.subtotal)}</p>
            <p>VAT ({current.tax_rate}%): {formatKES(current.tax_amount)}</p>
            <p className="font-semibold text-base">Total: {formatKES(current.total_amount)}</p>
            <p className="text-navy-500">Paid: {formatKES(current.amount_paid)}</p>
            <p className={`font-semibold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {balance > 0 ? `Balance Due: ${formatKES(balance)}` : 'Paid in Full'}
            </p>
          </div>
        )}

        <div className="mb-6">
          <h3 className="font-semibold text-navy-900 mb-2 flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Record Payment
          </h3>
          {payments.length > 0 && (
            <div className="space-y-1 mb-3">
              {payments.map((p) => (
                <div key={p.id} className="flex justify-between text-xs text-navy-500 bg-gray-50 rounded px-3 py-1.5">
                  <span>{new Date(p.paid_at).toLocaleDateString()} - {p.method}{p.reference ? ` (${p.reference})` : ''}</span>
                  <span className="font-medium">{formatKES(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleRecordPayment} className="grid grid-cols-3 gap-2">
            <input type="number" placeholder="Amount" className="input text-sm" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} />
            <select className="input text-sm" value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value as PaymentMethod })}>
              <option value="cash">Cash</option>
              <option value="mpesa">M-Pesa</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
            <input placeholder="Reference (optional)" className="input text-sm" value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} />
            <button type="submit" disabled={savingPayment} className="btn-primary text-sm col-span-3">
              {savingPayment ? 'Recording...' : 'Record Payment'}
            </button>
          </form>
        </div>

        <button onClick={() => onDownloadPdf(current)} className="btn-secondary w-full flex items-center justify-center gap-2">
          <Download className="w-4 h-4" /> Download PDF
        </button>
      </div>
    </div>
  );
}
