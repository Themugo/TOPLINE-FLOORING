import { useState } from "react";
import { useListOrders, useUpdateOrder, useGetOrder } from "@/lib/api";
import type { OrderStatus } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatKES, formatDate } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Eye } from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  confirmed: "bg-sky-50 text-sky-700 border border-sky-200",
  in_progress: "bg-violet-50 text-violet-700 border border-violet-200",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border border-rose-200",
};

export default function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useListOrders(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );
  const updateOrder = useUpdateOrder();
  const { data: viewedOrderDetail } = useGetOrder(selectedOrder || 0);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    queryClient.invalidateQueries({ queryKey: ['recentOrders'] });
    queryClient.invalidateQueries({ queryKey: ['ordersByStatus'] });
  };

  const handleStatusChange = (orderId: number, status: string) => {
    updateOrder.mutate({ id: orderId, data: { status: status as OrderStatus } }, { onSuccess: invalidate });
  };

  const viewedOrder = viewedOrderDetail || orders?.find(o => o.id === selectedOrder);

  return (
    <AdminLayout>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-sans font-medium mb-1">Management</p>
          <h1 className="font-display text-3xl font-semibold text-foreground">Orders</h1>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 rounded-sm text-xs">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-sm" />)}</div>
        ) : orders && orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Order</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Customer</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Amount</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Date</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Status</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-4 px-6 font-display font-semibold text-foreground">#{String(order.id).padStart(5, "0")}</td>
                    <td className="py-4 px-6">
                      <p className="font-medium text-foreground text-sm">{order.customer_name}</p>
                      <p className="text-xs text-muted-foreground font-light">{order.customer_phone}</p>
                    </td>
                    <td className="py-4 px-6 font-display font-semibold text-primary">{formatKES(order.total_amount)}</td>
                    <td className="py-4 px-6 text-muted-foreground text-xs font-light">{formatDate(order.created_at)}</td>
                    <td className="py-4 px-6">
                      <Select value={order.status} onValueChange={val => handleStatusChange(order.id, val)}>
                        <SelectTrigger className="h-7 text-xs w-36 rounded-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-4 px-6">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-sm" onClick={() => setSelectedOrder(order.id)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center text-muted-foreground font-light text-sm">No orders found.</div>
        )}
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg rounded-sm">
          <DialogHeader>
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-sans font-medium mb-1">Order Detail</p>
            <DialogTitle className="font-display text-xl">#{viewedOrder ? String(viewedOrder.id).padStart(5, "0") : ""}</DialogTitle>
          </DialogHeader>
          {viewedOrder && (
            <div className="space-y-5 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans mb-2">Customer</p>
                  <p className="font-medium text-foreground">{viewedOrder.customer_name}</p>
                  <p className="text-muted-foreground font-light text-xs">{viewedOrder.customer_email}</p>
                  <p className="text-muted-foreground font-light text-xs">{viewedOrder.customer_phone}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans mb-2">Info</p>
                  <p className="text-muted-foreground font-light text-xs">{formatDate(viewedOrder.created_at)}</p>
                  <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-sm text-xs font-sans ${STATUS_BADGE[viewedOrder.status] ?? "bg-muted text-muted-foreground"}`}>
                    {viewedOrder.status.replace("_", " ")}
                  </span>
                </div>
              </div>
              {viewedOrder.notes && (
                <div className="space-y-1.5">
                  <p className="text-xs font-light"><span className="font-medium text-foreground">Notes: </span><span className="text-muted-foreground">{viewedOrder.notes}</span></p>
                </div>
              )}
              <div className="h-px bg-border" />
              {'items' in viewedOrder && viewedOrder.items && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans mb-3">Items</p>
                  <div className="space-y-2">
                    {viewedOrder.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-muted-foreground font-light">{item.product_name} <span className="text-muted-foreground/60">x{item.quantity}</span></span>
                        <span className="font-display font-semibold">{formatKES(item.unit_price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="h-px bg-border" />
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase tracking-widest font-sans text-muted-foreground">Total</span>
                <span className="font-display text-xl font-semibold text-primary">{formatKES(viewedOrder.total_amount)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
