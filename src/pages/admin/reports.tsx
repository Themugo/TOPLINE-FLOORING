import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, FileText, Package, AlertTriangle, BarChart3, PieChart, Calendar, Download } from 'lucide-react';
import { AdminLayout } from '@/pages/admin/dashboard';
import { supabase } from '@/lib/supabase';

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
          <span>{Math.abs(change)}% from last month</span>
        </div>
      )}
    </div>
  );
}

function ReportsContent() {
  const [dateRange, setDateRange] = useState('30');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalQuotations: 0,
    totalCustomers: 0,
    pendingOrders: 0,
    lowStockProducts: 0,
    conversionRate: 0,
    avgOrderValue: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<{ status: string; count: number }[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const daysAgo = parseInt(dateRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Fetch orders
    const { data: orders } = await supabase
      .from('orders')
      .select('total_amount, status, created_at');

    // Fetch quotations
    const { count: quotationsCount } = await supabase
      .from('quotations')
      .select('id', { count: 'exact', head: true });

    // Fetch customers
    const { count: customersCount } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true });

    // Fetch low stock products
    const { data: lowStockData } = await supabase
      .from('products')
      .select('id')
      .eq('is_active', true);

    // Fetch pending orders
    const { count: pendingCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (orders) {
      const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const recentOrders = orders.filter(o => new Date(o.created_at) >= startDate);
      const recentRevenue = recentOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

      const statusCounts = orders.reduce((acc: Record<string, number>, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      }, {});

      setOrdersByStatus(
        Object.entries(statusCounts).map(([status, count]) => ({ status, count }))
      );

      setStats({
        totalRevenue,
        totalOrders: orders.length,
        totalQuotations: quotationsCount || 0,
        totalCustomers: customersCount || 0,
        pendingOrders: pendingCount || 0,
        lowStockProducts: (lowStockData || []).length,
        conversionRate: quotationsCount ? Math.round((orders.length / quotationsCount) * 100) : 0,
        avgOrderValue: orders.length ? Math.round(totalRevenue / orders.length) : 0
      });
    }

    // Fetch recent activity logs
    const { data: activityLogs } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    setRecentActivity(activityLogs || []);

    // Fetch top products by order items
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_name, quantity, unit_price');

    if (orderItems) {
      const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
      orderItems.forEach(item => {
        if (!productSales[item.product_name]) {
          productSales[item.product_name] = { name: item.product_name, quantity: 0, revenue: 0 };
        }
        productSales[item.product_name].quantity += item.quantity;
        productSales[item.product_name].revenue += item.quantity * item.unit_price;
      });

      const sorted = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setTopProducts(sorted);
    }

    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatKES = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <div className="flex items-center gap-4">
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
        <button className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading statistics...</div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Revenue"
              value={formatKES(stats.totalRevenue)}
              icon={<DollarSign className="w-5 h-5" />}
              color="bg-green-500"
            />
            <StatCard
              title="Total Orders"
              value={stats.totalOrders}
              icon={<ShoppingCart className="w-5 h-5" />}
              color="bg-blue-500"
            />
            <StatCard
              title="Quotations"
              value={stats.totalQuotations}
              icon={<FileText className="w-5 h-5" />}
              color="bg-purple-500"
            />
            <StatCard
              title="Total Customers"
              value={stats.totalCustomers}
              icon={<Users className="w-5 h-5" />}
              color="bg-indigo-500"
            />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Pending Orders"
              value={stats.pendingOrders}
              icon={<ShoppingCart className="w-5 h-5" />}
              color="bg-yellow-500"
            />
            <StatCard
              title="Active Products"
              value={stats.lowStockProducts}
              icon={<Package className="w-5 h-5" />}
              color="bg-teal-500"
            />
            <StatCard
              title="Conversion Rate"
              value={`${stats.conversionRate}%`}
              icon={<TrendingUp className="w-5 h-5" />}
              color="bg-pink-500"
            />
            <StatCard
              title="Avg Order Value"
              value={formatKES(stats.avgOrderValue)}
              icon={<BarChart3 className="w-5 h-5" />}
              color="bg-orange-500"
            />
          </div>

          {/* Charts Section */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Orders by Status */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary-500" />
                Orders by Status
              </h3>
              {ordersByStatus.length === 0 ? (
                <p className="text-gray-500 text-sm">No orders yet</p>
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

            {/* Top Products */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary-500" />
                Top Products by Revenue
              </h3>
              {topProducts.length === 0 ? (
                <p className="text-gray-500 text-sm">No product sales yet</p>
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
          </div>

          {/* Recent Activity */}
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
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500">
                        {activity.entity_type && `${activity.entity_type}`}
                        {activity.details && ` - ${JSON.stringify(activity.details).substring(0, 50)}...`}
                      </p>
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
