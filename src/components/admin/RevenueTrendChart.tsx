import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabase';
import { formatKES } from '@/lib/utils';

interface RevenuePoint {
  date: string;
  revenue: number;
}

export function RevenueTrendChart() {
  const [data, setData] = useState<RevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRevenue() {
      try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: orders } = await supabase
          .from('orders')
          .select('created_at, total_amount')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at');

        if (!orders) return;

        const dailyMap: Record<string, number> = {};
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          dailyMap[d.toISOString().slice(0, 10)] = 0;
        }

        orders.forEach((order) => {
          const day = order.created_at?.slice(0, 10);
          if (day && day in dailyMap) {
            dailyMap[day] += order.total_amount || 0;
          }
        });

        const chartData = Object.entries(dailyMap).map(([date, revenue]) => ({
          date: new Date(date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
          revenue,
        }));

        setData(chartData);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    fetchRevenue();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-6">
        <h2 className="font-semibold text-navy-900 mb-4">Revenue Trend (30 Days)</h2>
        <div className="h-64 bg-gray-50 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-6">
      <h2 className="font-semibold text-navy-900 mb-4">Revenue Trend (30 Days)</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1e3a5f" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#1e3a5f" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value: number) => [formatKES(value), 'Revenue']}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
            />
            <Area type="monotone" dataKey="revenue" stroke="#1e3a5f" strokeWidth={2} fill="url(#revenueGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
