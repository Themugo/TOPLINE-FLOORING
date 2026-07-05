import { useGetDashboardStats, useGetRecentOrders, useGetOrdersByStatus, useUpdateOrder, getListOrdersQueryKey, getGetDashboardStatsQueryKey, getGetRecentOrdersQueryKey, getGetOrdersByStatusQueryKey } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatKES, formatDate } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { TrendingUp, ShoppingBag, Clock, CheckCircle2, Users, Package } from "lucide-react";
import { Link } from "wouter";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-sky-50 text-sky-700 border-sky-200",
  in_progress: "bg-violet-50 text-violet-700 border-violet-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: recentOrders, isLoading: ordersLoading } = useGetRecentOrders();
  const { data: byStatus } = useGetOrdersByStatus();
  const updateOrder = useUpdateOrder();
  const queryClient = useQueryClient();

  const handleStatusChange = (orderId: number, status: string) => {
    updateOrder.mutate({ id: orderId, data: { status: status as "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRecentOrdersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetOrdersByStatusQueryKey() });
      }
    });
  };

  const statCards = [
    { label: "Total Orders", value: stats?.totalOrders ?? 0, icon: ShoppingBag, accent: "border-l-sky-400" },
    { label: "Pending", value: stats?.pendingOrders ?? 0, icon: Clock, accent: "border-l-amber-400" },
    { label: "Completed", value: stats?.completedOrders ?? 0, icon: CheckCircle2, accent: "border-l-emerald-400" },
    { label: "Total Revenue", value: formatKES(stats?.totalRevenue ?? 0), icon: TrendingUp, accent: "border-l-primary" },
    { label: "Products", value: stats?.totalProducts ?? 0, icon: Package, accent: "border-l-violet-400" },
    { label: "Customers", value: stats?.totalCustomers ?? 0, icon: Users, accent: "border-l-indigo-400" },
  ];

  return (
    <AdminLayout>
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-sans font-medium mb-1">Overview</p>
        <h1 className="font-display text-3xl font-semibold text-foreground">Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {statCards.map(card => (
          <div key={card.label} className={`bg-card border border-border border-l-4 ${card.accent} rounded-sm p-5`}>
            {statsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-20 rounded-sm" />
                <Skeleton className="h-8 w-16 rounded-sm" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans">{card.label}</span>
                  <card.icon className="h-3.5 w-3.5 text-muted-foreground/50" />
                </div>
                <p className="font-display text-2xl font-semibold text-foreground">{card.value}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {byStatus && byStatus.length > 0 && (
        <div className="bg-card border border-border rounded-sm p-6 mb-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-sans mb-4">Orders by Status</p>
          <div className="flex flex-wrap gap-2">
            {byStatus.map(s => (
              <div key={s.status} className={`inline-flex items-center gap-1.5 px-3 py-1 border rounded-sm text-xs font-sans ${STATUS_BADGE[s.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                <span className="capitalize">{s.status.replace("_", " ")}</span>
                <span className="font-bold">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-sans">Recent Orders</p>
          <Link href="/admin/orders" className="text-xs text-primary hover:underline font-sans">View all</Link>
        </div>
        {ordersLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-sm" />)}
          </div>
        ) : recentOrders && recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Order</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Customer</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Amount</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Date</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentOrders.map(order => (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-display font-semibold text-foreground text-sm">#{String(order.id).padStart(5, "0")}</td>
                    <td className="py-4 px-6">
                      <p className="font-medium text-foreground text-sm">{order.customer_name}</p>
                      <p className="text-xs text-muted-foreground font-light">{order.customer_phone}</p>
                    </td>
                    <td className="py-4 px-6 font-display font-semibold text-primary text-sm">{formatKES(order.total_amount)}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center text-muted-foreground font-light text-sm">No orders yet.</div>
        )}
      </div>
    </AdminLayout>
  );
}
