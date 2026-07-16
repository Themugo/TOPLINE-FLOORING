import { useState, useEffect, useCallback } from 'react';
import { Search, X, Phone, Mail, MapPin, Building2, ShoppingCart, FileText, Wallet } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { formatDateTime, formatKES } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { usePagination } from '@/hooks/use-pagination';
import { Pagination } from '@/components/admin/Pagination';
import type { Customer, Order, Quotation } from '@/lib/types';

export default function AdminCustomers() {
  const { page, setPage, limit, total, totalPages, from, to, setTotal } = usePagination(20);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (search.trim()) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,company.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (!error) {
      setCustomers(data || []);
      setTotal(count || 0);
    }
    setLoading(false);
  }, [from, to, search, setTotal]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  return (
    <AdminLayout title="Customers">
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, or company..."
            className="input pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : customers.length === 0 ? (
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
              {customers.map((customer) => (
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
          <Pagination page={page} total={total} limit={limit} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {selected && <CustomerDetail customer={selected} onClose={() => setSelected(null)} />}
    </AdminLayout>
  );
}

function CustomerDetail({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [o, q] = await Promise.all([
        supabase.from('orders').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false }),
        supabase.from('quotations').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false }),
      ]);
      setOrders(o.data || []);
      setQuotations(q.data || []);
      setLoading(false);
    }
    load();
  }, [customer.id]);

  const totalSpent = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total_amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-semibold text-lg">{customer.name}</h2>
          <button onClick={onClose} className="p-2"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /><span>{customer.email}</span></div>
          <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /><span>{customer.phone}</span></div>
          {customer.company && <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-400" /><span>{customer.company}</span></div>}
          {customer.address && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" /><span>{customer.address}</span></div>}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <ShoppingCart className="w-5 h-5 mx-auto text-primary-600 mb-1" />
            <p className="text-lg font-bold">{orders.length}</p>
            <p className="text-xs text-gray-500">Orders</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <Wallet className="w-5 h-5 mx-auto text-primary-600 mb-1" />
            <p className="text-lg font-bold">{formatKES(totalSpent)}</p>
            <p className="text-xs text-gray-500">Total Spent</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <FileText className="w-5 h-5 mx-auto text-primary-600 mb-1" />
            <p className="text-lg font-bold">{quotations.length}</p>
            <p className="text-xs text-gray-500">Quotations</p>
          </div>
        </div>

        {loading ? (
          <p className="text-center py-4 text-gray-500">Loading...</p>
        ) : (
          <div className="space-y-4">
            {orders.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Recent Orders</h3>
                {orders.slice(0, 5).map((o) => (
                  <div key={o.id} className="flex justify-between text-sm py-1 border-b">
                    <span className="font-mono">{o.id.slice(0, 8).toUpperCase()}</span>
                    <span>{formatKES(o.total_amount)}</span>
                    <span className="text-gray-500">{formatDateTime(o.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
