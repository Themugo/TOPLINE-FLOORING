import { AdminLayout } from './dashboard';
import { useOrders } from '@/hooks/use-data';
import { formatKES, formatDateTime } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { Eye, X } from 'lucide-react';
import type { Order } from '@/lib/types';

export default function AdminOrders() {
  const { orders, loading, refetch } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const updateStatus = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId);
    if (!error) refetch();
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
      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
          <p className="text-gray-500">No orders yet</p>
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
                        onClick={() => setSelectedOrder(order)}
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
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">Order {selectedOrder.id.slice(0, 8).toUpperCase()}</h2>
              <button onClick={() => setSelectedOrder(null)} className="p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-medium">{selectedOrder.customer_name}</p>
                <p className="text-sm">{selectedOrder.customer_email}</p>
                <p className="text-sm">{selectedOrder.customer_phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Items</p>
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm py-1">
                    <span>{item.product_name} x {item.quantity}</span>
                    <span>{formatKES(item.unit_price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>{formatKES(selectedOrder.total_amount)}</span>
                </div>
              </div>
              {selectedOrder.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-sm">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
