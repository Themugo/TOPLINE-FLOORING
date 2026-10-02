import { useState, useEffect, useCallback } from 'react';
import { Search, X, Phone, Mail, MapPin, Building2, ShoppingCart, FileText, Wallet, RefreshCw } from 'lucide-react';
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (search.trim()) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,company.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) {
      setLoadError(error.message || 'Could not load customers.');
    } else {
      setCustomers(data || []);
      setTotal(count || 0);
    }
    setLoading(false);
  }, [from, to, search, setTotal]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  return (
    <AdminLayout title="Customers" subtitle="Keep customer details and their buying history easy to find." >
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers by name, phone or email..."
            className="input pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading customers...</div>
      ) : loadError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-sm font-semibold text-red-700 mb-1">Could not load customers</p>
          <p className="text-xs text-red-600 mb-3">{loadError}</p>
          <button onClick={() => void fetchCustomers()} className="btn-secondary text-xs">Retry</button>
        </div>
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
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const [o, q] = await Promise.all([
      supabase.from('orders').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false }),
      supabase.from('quotations').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false }),
    ]);
    if (o.error || q.error) {
      setLoadError(o.error?.message || q.error?.message || 'Could not load customer activity.');
    } else {
      setOrders(o.data || []);
      setQuotations(q.data || []);
    }
    setLoading(false);
  }, [customer.id]);

  const totalSpent = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total_amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="font-semibold text-lg">{customer.name}</h2>
            <p className="text-xs text-gray-500">Customer details and recent activity</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => void load()} disabled={loading} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50" title="Refresh customer activity" aria-label="Refresh customer activity">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2" aria-label="Close customer details"><X className="w-5 h-5" /></button>
          </div>
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
          <p className="text-center py-4 text-gray-500">Loading customer activity...</p>
        ) : loadError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-medium">Could not load customer activity</p>
            <p className="mt-1 text-xs">{loadError}</p>
            <button onClick={() => void load()} className="btn-secondary mt-3 text-xs">Retry</button>
          </div>
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
