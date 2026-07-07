import { useState } from 'react';
import { 
  TrendingUp, Users, FolderKanban, Calendar, Truck, 
  DollarSign, AlertTriangle, Package, 
  RefreshCw, BarChart3, PieChart, Activity
} from 'lucide-react';
import { useDashboardMetrics } from '@/hooks/use-data';
import { formatKES } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'indigo';
  onClick?: () => void;
}

function MetricCard({ title, value, icon, trend, color = 'blue', onClick }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  };

  return (
    <div 
      className={`p-6 bg-white border rounded-xl hover:shadow-md transition-shadow cursor-pointer ${onClick ? 'hover:border-primary-300' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className={`w-4 h-4 ${trend < 0 ? 'rotate-180' : ''}`} />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-navy-900">{value}</p>
    </div>
  );
}

export function ExecutiveDashboard() {
  const { metrics, loading } = useDashboardMetrics();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Trigger refetch - this would need to be implemented in the hook
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <p className="text-gray-500">Unable to load dashboard metrics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="New Enquiries"
          value={metrics.newEnquiries}
          icon={<Users className="w-6 h-6" />}
          color="blue"
        />
        <MetricCard
          title="Open Quotations"
          value={metrics.openQuotations}
          icon={<FolderKanban className="w-6 h-6" />}
          color="orange"
        />
        <MetricCard
          title="Active Projects"
          value={metrics.activeProjects}
          icon={<Activity className="w-6 h-6" />}
          color="purple"
        />
        <MetricCard
          title="Pending Installations"
          value={metrics.pendingInstallations}
          icon={<Calendar className="w-6 h-6" />}
          color="indigo"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Today's Deliveries"
          value={metrics.todayDeliveries}
          icon={<Truck className="w-6 h-6" />}
          color="green"
        />
        <MetricCard
          title="Awaiting Payment"
          value={metrics.awaitingPayment}
          icon={<DollarSign className="w-6 h-6" />}
          color="red"
        />
        <MetricCard
          title="Low Stock Items"
          value={metrics.lowStockItems}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="orange"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${metrics.conversionRate.toFixed(1)}%`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="green"
        />
      </div>

      {/* Sales Metrics */}
      <div className="bg-white border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-navy-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Sales Performance
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Today</p>
            <p className="text-xl font-bold text-navy-900">{formatKES(metrics.salesToday)}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">This Week</p>
            <p className="text-xl font-bold text-navy-900">{formatKES(metrics.salesWeek)}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">This Month</p>
            <p className="text-xl font-bold text-navy-900">{formatKES(metrics.salesMonth)}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">This Year</p>
            <p className="text-xl font-bold text-navy-900">{formatKES(metrics.salesYear)}</p>
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-navy-900 flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Financial Overview
            </h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-700">{formatKES(metrics.revenue)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Outstanding Balance</p>
                <p className="text-2xl font-bold text-red-700">{formatKES(metrics.outstandingBalance)}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-navy-900 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Performance Metrics
            </h2>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Customer Satisfaction</p>
                <span className="text-sm font-medium text-navy-900">N/A</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '0%' }} />
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Team Workload</p>
                <span className="text-sm font-medium text-navy-900">N/A</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '0%' }} />
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Delivery Performance</p>
                <span className="text-sm font-medium text-navy-900">N/A</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '0%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
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
            <Calendar className="w-5 h-5 text-indigo-600" />
            <div>
              <p className="font-medium text-navy-900">Schedule</p>
              <p className="text-xs text-gray-500">Installations</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
