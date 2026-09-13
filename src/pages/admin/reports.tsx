import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, FileText, Package, BarChart3, PieChart, Calendar, Download, AlertTriangle, Wallet } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AdminLayout } from '@/pages/admin/dashboard';
import { supabase } from '@/lib/supabase';
import { formatKES } from '@/lib/utils';

export default function AdminReports() {
  return (
    <AdminLayout title="Reports & Analytics">
      <ReportsContent />
    </AdminLayout>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, change, icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{title}</span>
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center text-white`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span>{Math.abs(change)}% vs previous period</span>
        </div>
      )}
    </div>
  );
}

interface ActivityLogRow { id: string; action: string; entity_type: string | null; details: Record<string, unknown> | null; created_at: string; }
interface TopProductRow { name: string; quantity: number; revenue: number; }
interface TrendPoint { date: string; revenue: number; }

const QUOTE_STAGES = ['draft', 'sent', 'negotiating', 'accepted', 'rejected', 'converted'];

// recharts' Formatter<ValueType, NameType> generic is awkward to satisfy
// inline (ValueType includes arrays/undefined); this is a values-only
// currency formatter for the revenue trend tooltip.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tooltipFormatter = (value: any) => formatKES(Number(value) || 0);

function ReportsContent() {
  const [dateRange, setDateRange] = useState('30');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    previousRevenue: 0,
    totalOrders: 0,
    totalQuotations: 0,
    newCustomers: 0,
    pendingOrders: 0,
    lowStockCount: 0,
    inventoryValuation: 0,
    outstandingBalance: 0,
    conversionRate: 0,
    avgOrderValue: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityLogRow[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<{ status: string; count: number }[]>([]);
  const [quotesByStage, setQuotesByStage] = useState<{ status: string; count: number }[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductRow[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<TrendPoint[]>([]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_reporting_operational_intelligence_360', {
        p_days: parseInt(dateRange, 10),
      });
      if (error) throw error;

      const report = (data ?? {}) as {
        metrics?: Record<string, number>;
        orders_by_status?: { status: string; count: number }[];
        quotes_by_status?: { status: string; count: number }[];
        top_products?: TopProductRow[];
        revenue_trend?: { date: string; revenue: number }[];
        recent_activity?: ActivityLogRow[];
      };
      const metrics = report.metrics ?? {};

      setStats({
        totalRevenue: Number(metrics.total_revenue ?? 0),
        previousRevenue: Number(metrics.previous_revenue ?? 0),
        totalOrders: Number(metrics.total_orders ?? 0),
        totalQuotations: Number(metrics.total_quotations ?? 0),
        newCustomers: Number(metrics.new_customers ?? 0),
        pendingOrders: Number(metrics.pending_orders ?? 0),
        lowStockCount: Number(metrics.low_stock_count ?? 0),
        inventoryValuation: Number(metrics.inventory_valuation ?? 0),
        outstandingBalance: Number(metrics.outstanding_balance ?? 0),
        conversionRate: Number(metrics.conversion_rate ?? 0),
        avgOrderValue: Number(metrics.avg_order_value ?? 0),
      });
      setOrdersByStatus(report.orders_by_status ?? []);
      setQuotesByStage((report.quotes_by_status ?? []).filter(({ status }) => QUOTE_STAGES.includes(status)));
      setTopProducts(report.top_products ?? []);
      setRecentActivity(report.recent_activity ?? []);
      setRevenueTrend((report.revenue_trend ?? []).map((point) => ({
        date: new Date(`${point.date}T00:00:00`).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
        revenue: Number(point.revenue ?? 0),
      })));
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const revenueChange = stats.previousRevenue > 0
    ? Math.round(((stats.totalRevenue - stats.previousRevenue) / stats.previousRevenue) * 100)
    : undefined;

  const handleExport = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Date Range', `Last ${dateRange} days`],
      ['Total Revenue', stats.totalRevenue],
      ['Total Orders', stats.totalOrders],
      ['Quotations', stats.totalQuotations],
      ['Quote Conversion Rate', `${stats.conversionRate}%`],
      ['New Customers', stats.newCustomers],
      ['Pending Orders', stats.pendingOrders],
      ['Low Stock Products', stats.lowStockCount],
      ['Inventory Valuation', stats.inventoryValuation],
      ['Outstanding Invoice Balance', stats.outstandingBalance],
      ['Avg Order Value', stats.avgOrderValue],
      [],
      ['Top Products', 'Qty Sold', 'Revenue'],
      ...topProducts.map((p) => [p.name, p.quantity, p.revenue]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `business-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Report (CSV)
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading statistics...</div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Revenue" value={formatKES(stats.totalRevenue)} change={revenueChange} icon={<DollarSign className="w-5 h-5" />} color="bg-green-500" />
            <StatCard title="Orders" value={stats.totalOrders} icon={<ShoppingCart className="w-5 h-5" />} color="bg-blue-500" />
            <StatCard title="Quotations" value={stats.totalQuotations} icon={<FileText className="w-5 h-5" />} color="bg-purple-500" />
            <StatCard title="New Customers" value={stats.newCustomers} icon={<Users className="w-5 h-5" />} color="bg-indigo-500" />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Pending Orders" value={stats.pendingOrders} icon={<ShoppingCart className="w-5 h-5" />} color="bg-yellow-500" />
            <StatCard title="Low Stock Items" value={stats.lowStockCount} icon={<AlertTriangle className="w-5 h-5" />} color="bg-red-500" />
            <StatCard title="Quote Conversion" value={`${stats.conversionRate}%`} icon={<TrendingUp className="w-5 h-5" />} color="bg-pink-500" />
            <StatCard title="Avg Order Value" value={formatKES(stats.avgOrderValue)} icon={<BarChart3 className="w-5 h-5" />} color="bg-orange-500" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <StatCard title="Inventory Valuation" value={formatKES(stats.inventoryValuation)} icon={<Package className="w-5 h-5" />} color="bg-teal-500" />
            <StatCard title="Outstanding Invoices" value={formatKES(stats.outstandingBalance)} icon={<Wallet className="w-5 h-5" />} color="bg-cyan-600" />
          </div>

          {/* Revenue Trend */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-500" />
              Revenue Trend
            </h3>
            {revenueTrend.every((p) => p.revenue === 0) ? (
              <p className="text-gray-500 text-sm">No revenue in this period yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={tooltipFormatter} />
                  <Line type="monotone" dataKey="revenue" stroke="#c9971f" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary-500" />
                Orders by Status
              </h3>
              {ordersByStatus.length === 0 ? (
                <p className="text-gray-500 text-sm">No orders in this period</p>
              ) : (
                <div className="space-y-3">
                  {ordersByStatus.map(({ status, count }) => {
                    const total = ordersByStatus.reduce((sum, s) => sum + s.count, 0);
                    const percentage = Math.round((count / total) * 100);
                    return (
                      <div key={status} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 capitalize">{status.replace('_', ' ')}</span>
                          <span className="font-medium">{count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              status === 'completed' ? 'bg-green-500' :
                              status === 'pending' ? 'bg-yellow-500' :
                              status === 'cancelled' ? 'bg-red-500' :
                              'bg-blue-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-500" />
                Quote Pipeline
              </h3>
              {quotesByStage.length === 0 ? (
                <p className="text-gray-500 text-sm">No quotations in this period</p>
              ) : (
                <div className="space-y-3">
                  {quotesByStage.map(({ status, count }) => {
                    const total = quotesByStage.reduce((sum, s) => sum + s.count, 0);
                    const percentage = Math.round((count / total) * 100);
                    return (
                      <div key={status} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 capitalize">{status}</span>
                          <span className="font-medium">{count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              status === 'converted' ? 'bg-green-500' :
                              status === 'accepted' ? 'bg-teal-500' :
                              status === 'rejected' ? 'bg-red-500' :
                              'bg-primary-400'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-500" />
              Top Products by Revenue
            </h3>
            {topProducts.length === 0 ? (
              <p className="text-gray-500 text-sm">No product sales in this period</p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div key={product.name} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.quantity} sold</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{formatKES(product.revenue)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
            {recentActivity.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 capitalize">{activity.action} {activity.entity_type}</p>
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
