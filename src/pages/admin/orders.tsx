import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, ShieldCheck, Truck, CreditCard, PackageCheck } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { formatKES, formatDateTime } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { usePagination } from '@/hooks/use-pagination';
import { Pagination } from '@/components/admin/Pagination';
import { Eye, X } from 'lucide-react';
import type { Order } from '@/lib/types';
import { getOrderOperations360, reconcileOrderPayment, type OrderOperations360 } from '@/lib/order-operations';

export default function AdminOrders() {
  const { toast } = useToast();
  const { page, setPage, limit, total, totalPages, from, to, setTotal } = usePagination(20);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [order360, setOrder360] = useState<OrderOperations360 | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (search.trim()) {
      query = query.or(`customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,id.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) {
      console.error('Failed to fetch orders:', error);
    } else {
      setOrders(data || []);
      setTotal(count || 0);
    }
    setLoading(false);
  }, [from, to, search, setTotal]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const openOrder = async (order: Order) => {
    setSelectedOrder(order);
    setDetailLoading(true);
    try { setOrder360(await getOrderOperations360(order.id)); }
    catch (error) { toast({ title: 'Unable to load order operations', description: error instanceof Error ? error.message : 'Please try again', variant: 'destructive' }); setOrder360(null); }
    finally { setDetailLoading(false); }
  };

  const refreshOrder360 = async () => {
    if (!selectedOrder) return;
    setDetailLoading(true);
    try { setOrder360(await getOrderOperations360(selectedOrder.id)); }
    catch (error) { toast({ title: 'Unable to refresh order', description: error instanceof Error ? error.message : 'Please try again', variant: 'destructive' }); }
    finally { setDetailLoading(false); }
  };

  const reconcilePayment = async () => {
    if (!selectedOrder) return;
    try { await reconcileOrderPayment(selectedOrder.id); toast({ title: 'Payment totals reconciled' }); await refreshOrder360(); }
    catch (error) { toast({ title: 'Payment reconciliation unavailable', description: error instanceof Error ? error.message : 'Finance permission is required', variant: 'destructive' }); }
  };

  const updateStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.rpc('update_order_status_transaction', {
      p_order_id: orderId,
      p_status: status,
    });
    if (error) {
      toast({ title: 'Failed to update order status', variant: 'destructive' });
      return;
    }
    toast({ title: 'Order status updated' });
    fetchOrders();
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    processing: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <AdminLayout title="Orders">
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID, customer name, or email..."
            className="input pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
          <p className="text-gray-500">{search ? 'No orders match your search' : 'No orders yet'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm">{order.id.slice(0, 8).toUpperCase()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{order.customer_name}</p>
                        <p className="text-sm text-gray-500">{order.customer_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">{formatKES(order.total_amount)}</td>
                    <td className="px-6 py-4">
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 ${statusColors[order.status]}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDateTime(order.created_at)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => void openOrder(order)}
                        className="p-2 text-gray-600 hover:text-gray-900"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={total} limit={limit} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-start gap-4 mb-6">
              <div><p className="text-xs uppercase tracking-wider text-gray-500">Order operations 360</p><h2 className="font-semibold text-xl">{selectedOrder.id.slice(0, 8).toUpperCase()}</h2><p className="text-sm text-gray-500 mt-1">{selectedOrder.customer_name} · {selectedOrder.customer_phone}</p></div>
              <div className="flex items-center gap-2"><button onClick={() => void refreshOrder360()} className="p-2 rounded-lg border" title="Refresh"><RefreshCw className={`w-4 h-4 ${detailLoading ? 'animate-spin' : ''}`} /></button><button onClick={() => { setSelectedOrder(null); setOrder360(null); }} className="p-2 rounded-lg border"><X className="w-5 h-5" /></button></div>
            </div>
            {detailLoading && !order360 ? <div className="py-16 text-center text-gray-500">Loading operational snapshot…</div> : order360 ? <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                <div className="rounded-xl border p-4"><p className="text-xs text-gray-500">Order</p><p className="font-semibold mt-1">{order360.order.order_number || selectedOrder.id.slice(0,8).toUpperCase()}</p></div>
                <div className="rounded-xl border p-4"><p className="text-xs text-gray-500">Status</p><p className="font-semibold mt-1 capitalize">{order360.order.status}</p></div>
                <div className="rounded-xl border p-4"><p className="text-xs text-gray-500">Total</p><p className="font-semibold mt-1">{formatKES(order360.order.total_amount)}</p></div>
                <div className="rounded-xl border p-4"><p className="text-xs text-gray-500">Paid</p><p className="font-semibold mt-1">{order360.finance_access ? formatKES(order360.paid_amount) : 'Restricted'}</p></div>
                <div className="rounded-xl border p-4"><p className="text-xs text-gray-500">Outstanding</p><p className="font-semibold mt-1">{order360.finance_access ? formatKES(order360.outstanding_amount) : 'Restricted'}</p></div>
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <section className="rounded-xl border p-5"><h3 className="font-semibold flex items-center gap-2"><PackageCheck className="w-4 h-4" /> Items</h3><div className="mt-3 divide-y">{order360.items.map(item => <div key={item.id} className="py-2 flex justify-between gap-4 text-sm"><span>{item.product_name} × {item.quantity}</span><span>{formatKES(item.unit_price * item.quantity)}</span></div>)}</div></section>
                <section className="rounded-xl border p-5"><h3 className="font-semibold flex items-center gap-2"><Truck className="w-4 h-4" /> Fulfillment</h3><div className="mt-3 space-y-3">{order360.deliveries.length ? order360.deliveries.map(d => <div key={d.id} className="rounded-lg bg-gray-50 p-3 text-sm"><div className="flex justify-between"><span>{d.tracking_number || 'No tracking number'}</span><span className="font-medium capitalize">{d.status.replace(/_/g,' ')}</span></div><p className="text-xs text-gray-500 mt-1">{d.scheduled_date || 'Unscheduled'}{d.driver_name ? ` · ${d.driver_name}` : ''}</p></div>) : <p className="text-sm text-gray-500">No delivery record yet.</p>}</div></section>
                <section className="rounded-xl border p-5"><h3 className="font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Reservations</h3><div className="mt-3 space-y-2">{order360.inventory_access && order360.reservations.length ? order360.reservations.map(r => <div key={r.id} className="text-sm flex justify-between"><span>{r.variant_id ? 'Variant stock' : 'Product stock'} × {r.quantity}</span><span className="capitalize">{r.status}</span></div>) : <p className="text-sm text-gray-500">{order360.inventory_access ? 'No reservations.' : 'Inventory details restricted.'}</p>}</div></section>
                <section className="rounded-xl border p-5"><h3 className="font-semibold flex items-center gap-2"><CreditCard className="w-4 h-4" /> Finance</h3>{order360.finance_access ? <><div className="flex gap-2 mt-3"><button onClick={() => void reconcilePayment()} className="btn-secondary">Reconcile totals</button></div><div className="mt-4 space-y-2">{order360.payments.length ? order360.payments.map(p => <div key={p.id} className="text-sm flex justify-between"><span>{p.method} · {p.status}</span><span>{formatKES(p.amount)}</span></div>) : <p className="text-sm text-gray-500">No payment transactions.</p>}{order360.refunds.length > 0 && <p className="text-sm text-amber-700 pt-2">Refund activity: {formatKES(order360.refunded_amount)}</p>}</div></> : <p className="text-sm text-gray-500 mt-3">Payment details are restricted to finance-authorized staff.</p>}</section>
              </div>
              <div className="mt-6 rounded-xl bg-gray-50 p-4 text-sm"><p className="font-medium">Delivery address</p><p className="text-gray-600 mt-1">{order360.order.delivery_address || 'No delivery address recorded.'}</p></div>
            </> : <div className="py-12 text-center text-gray-500">No operational snapshot available.</div>}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
