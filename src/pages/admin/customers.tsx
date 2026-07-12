import { useState, useEffect } from 'react';
import { Search, X, Phone, Mail, MapPin, Building2, ShoppingCart, FileText, Wallet } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { useCustomers } from '@/hooks/use-data';
import { formatDateTime, formatKES } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Customer, Order, Quotation, Invoice } from '@/lib/types';

export default function AdminCustomers() {
  const { customers, loading } = useCustomers();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout title="Customers">
      <div className="mb-6 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, phone, or company..."
          className="input pl-9"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
          <p className="text-gray-500">{search ? 'No customers match your search' : 'No customers yet'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((customer) => (
                <tr
                  key={customer.id}
                  onClick={() => setSelected(customer)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <p className="font-medium">{customer.name}</p>
                    {customer.company && <p className="text-xs text-gray-500">{customer.company}</p>}
                  </td>
                  <td className="px-6 py-4 text-sm">{customer.email}</td>
                  <td className="px-6 py-4 text-sm">{customer.phone}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDateTime(customer.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <CustomerDetail customer={selected} onClose={() => setSelected(null)} />}
    </AdminLayout>
  );
}

function CustomerDetail({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      const [ordersRes, quotesRes, invoicesRes] = await Promise.all([
        supabase.from('orders').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false }),
        supabase.from('quotations').select('*').eq('email', customer.email).order('created_at', { ascending: false }),
        supabase.from('invoices').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false }),
      ]);
      setOrders(ordersRes.data || []);
      setQuotations(quotesRes.data || []);
      setInvoices(invoicesRes.data || []);
      setLoading(false);
    }
    fetchHistory();
  }, [customer.id, customer.email]);

  const totalSpent = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const outstandingBalance = invoices
    .filter((inv) => !['paid', 'cancelled'].includes(inv.status))
    .reduce((sum, inv) => sum + (inv.total_amount - inv.amount_paid), 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-end z-50" onClick={onClose}>
      <div className="bg-white w-full max-w-lg h-full overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-xl text-navy-900">{customer.name}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="space-y-2 text-sm text-gray-600 mb-6">
          {customer.company && <p className="flex items-center gap-2"><Building2 className="w-4 h-4" />{customer.company}</p>}
          <p className="flex items-center gap-2"><Phone className="w-4 h-4" />{customer.phone}</p>
          <p className="flex items-center gap-2"><Mail className="w-4 h-4" />{customer.email}</p>
          {customer.address && <p className="flex items-center gap-2"><MapPin className="w-4 h-4" />{customer.address}{customer.city ? `, ${customer.city}` : ''}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Total Spent</p>
            <p className="text-lg font-bold text-navy-900">{formatKES(totalSpent)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Outstanding</p>
            <p className={`text-lg font-bold ${outstandingBalance > 0 ? 'text-red-600' : 'text-navy-900'}`}>{formatKES(outstandingBalance)}</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading history...</div>
        ) : (
          <>
            <Section icon={<ShoppingCart className="w-4 h-4" />} title={`Orders (${orders.length})`}>
              {orders.length === 0 ? <EmptyRow text="No orders yet" /> : orders.map((o) => (
                <HistoryRow key={o.id} left={formatKES(o.total_amount)} right={o.status} date={o.created_at} />
              ))}
            </Section>

            <Section icon={<FileText className="w-4 h-4" />} title={`Quotations (${quotations.length})`}>
              {quotations.length === 0 ? <EmptyRow text="No quotations yet" /> : quotations.map((q) => (
                <HistoryRow key={q.id} left={q.quotation_number || q.project_type || 'Quote'} right={q.status} date={q.created_at} />
              ))}
            </Section>

            <Section icon={<Wallet className="w-4 h-4" />} title={`Invoices (${invoices.length})`}>
              {invoices.length === 0 ? <EmptyRow text="No invoices yet" /> : invoices.map((inv) => (
                <HistoryRow key={inv.id} left={`${inv.invoice_number} - ${formatKES(inv.total_amount)}`} right={inv.status} date={inv.created_at} />
              ))}
            </Section>

            {customer.notes && (
              <div className="mt-6">
                <h3 className="font-semibold text-navy-900 mb-2 text-sm">Notes</h3>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{customer.notes}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="font-semibold text-navy-900 mb-2 text-sm flex items-center gap-2">{icon} {title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function HistoryRow({ left, right, date }: { left: string; right: string; date: string }) {
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
      <div>
        <p className="font-medium text-navy-900">{left}</p>
        <p className="text-xs text-gray-400">{formatDateTime(date)}</p>
      </div>
      <span className="text-xs font-medium px-2 py-1 rounded-full bg-white border border-gray-200 capitalize">{right}</span>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="text-xs text-gray-400">{text}</p>;
}
