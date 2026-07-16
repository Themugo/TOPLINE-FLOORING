import { useState, useEffect } from 'react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { RefreshCw, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function formatAction(action: string) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function AdminAuditLogs() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const pageSize = 20;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('activity_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (search) {
        query = query.ilike('action', `%${search}%`);
      }

      const { data, count, error } = await query;
      if (error) throw error;
      setLogs(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Audit Logs</h1>
            <p className="text-muted-foreground">Track all activity across the admin panel</p>
          </div>
          <Button variant="outline" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by action..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9"
            />
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Timestamp</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Action</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Entity Type</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Entity ID</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Details</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">User Agent</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">Loading...</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">No audit logs found.</td>
                  </tr>
                ) : logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-3 text-sm">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="p-3 text-sm font-medium">{formatAction(log.action)}</td>
                    <td className="p-3 text-sm">{log.entity_type}</td>
                    <td className="p-3 text-sm font-mono text-xs">{log.entity_id}</td>
                    <td className="p-3 text-sm max-w-[200px] truncate" title={log.details ? JSON.stringify(log.details) : ''}>
                      {log.details ? JSON.stringify(log.details).substring(0, 60) + '...' : '-'}
                    </td>
                    <td className="p-3 text-sm font-mono text-xs max-w-[150px] truncate" title={log.user_agent}>
                      {log.user_agent || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages} ({totalCount} total)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
