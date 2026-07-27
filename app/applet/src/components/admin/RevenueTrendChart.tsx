import { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingUp, DollarSign, ShoppingCart, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatKES } from '@/lib/utils';

interface MonthlyTrendPoint {
  month: string;
  yearMonth: string;
  revenue: number;
  orders: number;
}

export function RevenueTrendChart() {
  const [timeframe, setTimeframe] = useState<'6' | '12'>('6');
  const [trendData, setTrendData] = useState<MonthlyTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ revenue: 0, orders: 0, avgMonthlyRevenue: 0 });

  const fetchTrends = useCallback(async () => {
    setLoading(true);
    try {
      const monthCount = parseInt(timeframe, 10);
      const monthsMap: Record<string, MonthlyTrendPoint> = {};
      const points: MonthlyTrendPoint[] = [];

      const now = new Date();
      for (let i = monthCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        
        const point: MonthlyTrendPoint = {
          month: monthLabel,
          yearMonth,
          revenue: 0,
          orders: 0,
        };
        monthsMap[yearMonth] = point;
        points.push(point);
      }

      const startDate = new Date(now.getFullYear(), now.getMonth() - (monthCount - 1), 1);
      startDate.setHours(0, 0, 0, 0);

      const { data: orderRows, error } = await supabase
        .from('orders')
        .select('total_amount, status, created_at')
        .gte('created_at', startDate.toISOString())
        .not('status', 'eq', 'cancelled');

      if (!error && orderRows) {
        orderRows.forEach((o) => {
          if (!o.created_at) return;
          const ym = o.created_at.slice(0, 7);
          if (monthsMap[ym]) {
            monthsMap[ym].revenue += o.total_amount || 0;
            monthsMap[ym].orders += 1;
          }
        });
      }

      const totalRev = points.reduce((acc, p) => acc + p.revenue, 0);
      const totalOrd = points.reduce((acc, p) => acc + p.orders, 0);

      setTrendData(points);
      setTotals({
        revenue: totalRev,
        orders: totalOrd,
        avgMonthlyRevenue: monthCount ? Math.round(totalRev / monthCount) : 0,
      });
    } catch (err) {
      console.error('Failed to load revenue trends:', err);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-navy-950 text-white p-3 rounded-lg shadow-xl border border-navy-800 text-xs space-y-1.5 min-w-[170px]">
          <p className="font-semibold text-primary-400 border-b border-navy-800 pb-1 flex items-center justify-between">
            <span>{label}</span>
            <Calendar className="w-3.5 h-3.5 text-navy-400" />
          </p>
          {payload.map((entry: { name: string; value: number; color: string }, index: number) => (
            <div key={`tooltip-${index}`} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-navy-300">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-bold text-white">
                {entry.name === 'Revenue' ? formatKES(entry.value) : `${entry.value} orders`}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-navy-900 text-lg">
                Revenue & Order Volume Trends
              </h2>
              <p className="text-xs text-navy-500">
                Monthly performance overview across completed & active orders
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex bg-gray-100 p-1 rounded-lg text-xs font-medium text-navy-600">
            <button
              onClick={() => setTimeframe('6')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                timeframe === '6'
                  ? 'bg-white text-navy-900 shadow-sm font-semibold'
                  : 'hover:text-navy-900'
              }`}
            >
              Last 6 Months
            </button>
            <button
              onClick={() => setTimeframe('12')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                timeframe === '12'
                  ? 'bg-white text-navy-900 shadow-sm font-semibold'
                  : 'hover:text-navy-900'
              }`}
            >
              Last 12 Months
            </button>
          </div>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-amber-50/60 border border-amber-200/60 rounded-lg p-3.5 flex items-center gap-3">
          <div className="p-2 bg-amber-500 text-white rounded-md flex-shrink-0">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-medium text-amber-900">Period Revenue</span>
            <p className="text-lg font-bold text-navy-900">
              {loading ? '...' : formatKES(totals.revenue)}
            </p>
          </div>
        </div>

        <div className="bg-blue-50/60 border border-blue-200/60 rounded-lg p-3.5 flex items-center gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-md flex-shrink-0">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-medium text-blue-900">Total Orders</span>
            <p className="text-lg font-bold text-navy-900">
              {loading ? '...' : `${totals.orders} orders`}
            </p>
          </div>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-lg p-3.5 flex items-center gap-3">
          <div className="p-2 bg-emerald-600 text-white rounded-md flex-shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-medium text-emerald-900">Avg Monthly Revenue</span>
            <p className="text-lg font-bold text-navy-900">
              {loading ? '...' : formatKES(totals.avgMonthlyRevenue)}
            </p>
          </div>
        </div>
      </div>

      {/* Recharts Area */}
      <div className="w-full h-72">
        {loading ? (
          <div className="w-full h-full bg-gray-50 rounded-lg animate-pulse flex items-center justify-center text-navy-400 text-xs">
            Loading trend telemetry...
          </div>
        ) : trendData.length === 0 ? (
          <div className="w-full h-full bg-gray-50 rounded-lg flex items-center justify-center text-navy-400 text-sm">
            No order history recorded for this timeframe.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: '#d97706' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: '#2563eb' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="#c9971f"
                strokeWidth={3}
                dot={{ r: 4, fill: '#c9971f', strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 6, fill: '#b38214', stroke: '#ffffff', strokeWidth: 2 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="orders"
                name="Order Volume"
                stroke="#2563eb"
                strokeWidth={2.5}
                strokeDasharray="4 4"
                dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 6, fill: '#1d4ed8', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
