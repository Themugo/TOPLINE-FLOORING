import { useGetDashboardStats, useGetRecentOrders, useGetOrdersByStatus, useUpdateOrder, getListOrdersQueryKey, getGetDashboardStatsQueryKey, getGetRecentOrdersQueryKey, getGetOrdersByStatusQueryKey } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatKES, formatDate } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { TrendingUp, ShoppingBag, Clock, CheckCircle2, Users, Package, FileText, MessageSquare, AlertTriangle, Activity, Star } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";

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

  const handleStatusChange = (orderId: string, status: string) => {
    updateOrder.mutate({ id: orderId as unknown as number, data: { status: status as "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRecentOrdersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetOrdersByStatusQueryKey() });
      }
    });
  };

  const [extraStats, setExtraStats] = useState({ totalQuotations: 0, newEnquiries: 0, activeAlerts: 0, lowStockItems: 0 });
  const [recentQuotations, setRecentQuotations] = useState<any[]>([]);
  const [recentEnquiries, setRecentEnquiries] = useState<any[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<any[]>([]);
  const [popularProducts, setPopularProducts] = useState<{ name: string; qty: number }[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [extraLoading, setExtraLoading] = useState(true);

  useEffect(() => {
    const sb = supabase;
    if (!sb) {
      setExtraLoading(false);
      return;
    }
    const fetchExtraData = async () => {
      setExtraLoading(true);
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const iso = thirtyDaysAgo.toISOString();

        const [quotCount, enqCount, alertCount, products, quotData, enqData, alertData, itemsData, logsData] = await Promise.all([
          sb.from('quotations').select('*', { count: 'exact', head: true }),
          (sb as any).from('contact_messages').select('*', { count: 'exact', head: true }).gte('created_at', iso),
          sb.from('inventory_alerts').select('*', { count: 'exact', head: true }).eq('is_resolved', false),
          sb.from('products').select('id, name, stock_quantity, low_stock_threshold'),
          sb.from('quotations').select('*').order('created_at', { ascending: false }).limit(5),
          (sb as any).from('contact_messages').select('*').order('created_at', { ascending: false }).limit(5),
          sb.from('inventory_alerts').select('*, product:products(id, name)').eq('is_resolved', false).order('created_at', { ascending: false }),
          sb.from('order_items').select('product_name, quantity'),
          sb.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(10),
        ]);

        const lowStock = (products.data ?? []).filter(
          (p: any) => p.stock_quantity != null && p.low_stock_threshold != null && p.stock_quantity <= p.low_stock_threshold
        );

        setExtraStats({
          totalQuotations: quotCount.count ?? 0,
          newEnquiries: enqCount.count ?? 0,
          activeAlerts: alertCount.count ?? 0,
          lowStockItems: lowStock.length,
        });

        setRecentQuotations(quotData.data ?? []);
        setRecentEnquiries(enqData.data ?? []);
        setInventoryAlerts(alertData.data ?? []);

        const map = new Map<string, number>();
        (itemsData.data ?? []).forEach((item: any) => {
          map.set(item.product_name, (map.get(item.product_name) ?? 0) + item.quantity);
        });
        setPopularProducts(
          Array.from(map.entries())
            .map(([name, qty]) => ({ name, qty }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5)
        );

        setActivityLogs(logsData.data ?? []);
      } catch (err) {
        console.error('Failed to fetch extra dashboard data:', err);
      } finally {
        setExtraLoading(false);
      }
    };
    fetchExtraData();
  }, []);

  const statCards = [
    { label: "Total Orders", value: stats?.totalOrders ?? 0, icon: ShoppingBag, accent: "border-l-sky-400" },
    { label: "Pending", value: stats?.pendingOrders ?? 0, icon: Clock, accent: "border-l-amber-400" },
    { label: "Completed", value: stats?.completedOrders ?? 0, icon: CheckCircle2, accent: "border-l-emerald-400" },
    { label: "Total Revenue", value: formatKES(stats?.totalRevenue ?? 0), icon: TrendingUp, accent: "border-l-primary" },
    { label: "Products", value: stats?.totalProducts ?? 0, icon: Package, accent: "border-l-violet-400" },
    { label: "Customers", value: stats?.totalCustomers ?? 0, icon: Users, accent: "border-l-indigo-400" },
    { label: "Total Quotations", value: extraStats.totalQuotations, icon: FileText, accent: "border-l-teal-400" },
    { label: "New Enquiries (30d)", value: extraStats.newEnquiries, icon: MessageSquare, accent: "border-l-orange-400" },
    { label: "Active Alerts", value: extraStats.activeAlerts, icon: AlertTriangle, accent: "border-l-rose-400" },
    { label: "Low Stock Items", value: extraStats.lowStockItems, icon: AlertTriangle, accent: "border-l-yellow-400" },
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
            {statsLoading || extraLoading ? (
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

      <div className="bg-card border border-border rounded-sm mb-8">
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

      <div className="bg-card border border-border rounded-sm mb-8">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-sans">Recent Quotations</p>
          <Link href="/admin/quotations" className="text-xs text-primary hover:underline font-sans">View all</Link>
        </div>
        {extraLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-sm" />)}
          </div>
        ) : recentQuotations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Name</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Email</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Status</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentQuotations.map((q: any) => (
                  <tr key={q.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-medium text-foreground text-sm">{q.name}</td>
                    <td className="py-4 px-6 text-muted-foreground text-xs">{q.email}</td>
                    <td className="py-4 px-6">
                      <Badge variant="outline" className="text-xs rounded-sm capitalize">
                        {q.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-muted-foreground text-xs font-light">{formatDate(q.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center text-muted-foreground font-light text-sm">No quotations yet.</div>
        )}
      </div>

      <div className="bg-card border border-border rounded-sm mb-8">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-sans">Recent Contact Enquiries</p>
        </div>
        {extraLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-sm" />)}
          </div>
        ) : recentEnquiries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Name</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Subject</th>
                  <th className="text-left py-3 px-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-sans font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentEnquiries.map((e: any) => (
                  <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-medium text-foreground text-sm">{e.name}</td>
                    <td className="py-4 px-6 text-muted-foreground text-xs">{e.subject}</td>
                    <td className="py-4 px-6 text-muted-foreground text-xs font-light">{formatDate(e.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center text-muted-foreground font-light text-sm">No enquiries yet.</div>
        )}
      </div>

      <div className="bg-card border border-border rounded-sm mb-8">
        <div className="px-6 py-4 border-b border-border">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-sans">Inventory Alerts</p>
        </div>
        {extraLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-sm" />)}
          </div>
        ) : inventoryAlerts.length > 0 ? (
          <div className="divide-y divide-border">
            {inventoryAlerts.map((alert: any) => (
              <div key={alert.id} className="px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{alert.product?.name ?? 'Unknown Product'}</p>
                    <p className="text-xs text-muted-foreground">{alert.alert_type} &mdash; Current: {alert.current_quantity ?? alert.current_stock} / Threshold: {alert.threshold}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs rounded-sm bg-rose-50 text-rose-700 border-rose-200 shrink-0 ml-2">Unresolved</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 text-center text-muted-foreground font-light text-sm">No inventory alerts.</div>
        )}
      </div>

      <div className="bg-card border border-border rounded-sm mb-8">
        <div className="px-6 py-4 border-b border-border">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-sans">Popular Products</p>
        </div>
        {extraLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-sm" />
                <Skeleton className="h-4 flex-1 rounded-sm" />
                <Skeleton className="h-4 w-12 rounded-sm" />
              </div>
            ))}
          </div>
        ) : popularProducts.length > 0 ? (
          <div className="divide-y divide-border">
            {popularProducts.map((p, i) => (
              <div key={p.name} className="px-6 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-sans font-bold text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <Star className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-sans font-semibold text-muted-foreground">{p.qty} sold</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 text-center text-muted-foreground font-light text-sm">No sales data yet.</div>
        )}
      </div>

      <div className="bg-card border border-border rounded-sm">
        <div className="px-6 py-4 border-b border-border">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-sans">Activity Log</p>
        </div>
        {extraLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-sm" />)}
          </div>
        ) : activityLogs.length > 0 ? (
          <div className="divide-y divide-border">
            {activityLogs.map((log: any) => (
              <div key={log.id} className="px-6 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                <Activity className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">
                    {log.action}{log.entity_type ? ` \u2014 ${log.entity_type}${log.entity_id ? ` #${log.entity_id}` : ''}` : ''}
                  </p>
                  {log.details && (
                    <p className="text-xs text-muted-foreground truncate">{typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground font-light shrink-0">{formatDate(log.created_at)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 text-center text-muted-foreground font-light text-sm">No activity recorded.</div>
        )}
      </div>
    </AdminLayout>
  );
}
