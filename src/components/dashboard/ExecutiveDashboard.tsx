import { useState } from 'react';
import { 
  TrendingUp, Users, FolderKanban, 
  DollarSign, AlertTriangle, Package, 
  RefreshCw, BarChart3, Activity
} from 'lucide-react';
import { useGetDashboardStats, useGetRecentOrders } from '@/lib/api';
import { formatKES } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'indigo';
}

function MetricCard({ title, value, icon, color = 'blue' }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  };

  return (
    <div className="p-6 bg-white border rounded-xl hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-navy-900">{value}</p>
    </div>
  );
}

export function ExecutiveDashboard() {
  const { data: stats, isLoading: loading } = useGetDashboardStats();
  const { data: recentOrders } = useGetRecentOrders();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <p className="text-gray-500">Unable to load dashboard metrics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Business Control Centre</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time business overview and metrics</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard title="Total Orders" value={stats.totalOrders} icon={<FolderKanban className="w-6 h-6" />} color="blue" />
        <MetricCard title="Pending Orders" value={stats.pendingOrders} icon={<AlertTriangle className="w-6 h-6" />} color="orange" />
        <MetricCard title="Completed Orders" value={stats.completedOrders} icon={<TrendingUp className="w-6 h-6" />} color="green" />
        <MetricCard title="Total Products" value={stats.totalProducts} icon={<Package className="w-6 h-6" />} color="purple" />
        <MetricCard title="Total Customers" value={stats.totalCustomers} icon={<Users className="w-6 h-6" />} color="indigo" />
        <MetricCard title="Total Revenue" value={formatKES(stats.totalRevenue)} icon={<DollarSign className="w-6 h-6" />} color="green" />
      </div>

      <div className="bg-white border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-navy-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Sales Performance
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-2xl font-bold text-green-700">{formatKES(stats.totalRevenue)}</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Pending Orders</p>
            <p className="text-2xl font-bold text-blue-700">{stats.pendingOrders}</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-600">Completion Rate</p>
            <p className="text-2xl font-bold text-orange-700">
              {stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0}%
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6">
        <h2 className="font-semibold text-navy-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Recent Orders
        </h2>
        {recentOrders && recentOrders.length > 0 ? (
          <div className="divide-y">
            {recentOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-navy-900">{order.customer_name}</p>
                  <p className="text-sm text-gray-500">{order.customer_email}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatKES(order.total_amount)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    order.status === 'completed' ? 'bg-green-100 text-green-700' :
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No recent orders</p>
        )}
      </div>

      <div className="bg-white border rounded-xl p-6">
        <h2 className="font-semibold text-navy-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium text-navy-900">Add Lead</p>
              <p className="text-xs text-gray-500">New enquiry</p>
            </div>
          </button>
          <button className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left">
            <FolderKanban className="w-5 h-5 text-orange-600" />
            <div>
              <p className="font-medium text-navy-900">Create Quote</p>
              <p className="text-xs text-gray-500">New quotation</p>
            </div>
          </button>
          <button className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left">
            <Package className="w-5 h-5 text-purple-600" />
            <div>
              <p className="font-medium text-navy-900">Stock Alert</p>
              <p className="text-xs text-gray-500">Low inventory</p>
            </div>
          </button>
          <button className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left">
            <DollarSign className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-navy-900">Invoices</p>
              <p className="text-xs text-gray-500">View all</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
