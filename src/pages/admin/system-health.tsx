import { useCallback, useEffect, useState } from 'react';
import { Activity, CheckCircle2, Clock3, Database, Mail, Package, RefreshCw, Server, ShieldCheck, Users } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { getSystemHealthSnapshot, type SystemHealthSnapshot } from '@/lib/system-health';
import { Button } from '@/components/ui/button';

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Activity; label: string; value: string | number; detail: string }) {
  return <div className="rounded-2xl border bg-card p-5 shadow-sm">
    <div className="flex items-center justify-between"><div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Icon className="h-5 w-5" /></div><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
    <p className="mt-5 text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p>
  </div>;
}

export default function AdminSystemHealth() {
  const [data, setData] = useState<SystemHealthSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setData(await getSystemHealthSnapshot()); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to read system health.'); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  return <AdminLayout title="System Health" subtitle="A read-only operational view of the Topline platform." actions={<Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>}>
    {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">{error}</div> : loading && !data ? <div className="py-16 text-center text-muted-foreground">Checking platform health…</div> : data && <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /><span className="font-semibold">Platform operational</span></div><p className="mt-1 text-sm text-muted-foreground">Database responded successfully at {new Date(data.checked_at).toLocaleString()}.</p></div><div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="h-4 w-4" /> Server {new Date(data.database.server_time).toLocaleTimeString()}</div></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Users} label="Active staff" value={data.staff.active_count} detail="Authorized internal users" />
        <Metric icon={Package} label="Open orders" value={data.orders.open_count} detail="Orders still in progress" />
        <Metric icon={Activity} label="Active projects" value={data.projects.active_count} detail="Projects not yet completed" />
        <Metric icon={Mail} label="Queued messages" value={data.communications.queued} detail={`${data.communications.failed} currently failed`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6"><h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-primary" />Operational signals</h2><div className="mt-5 space-y-3"><div className="flex justify-between rounded-xl bg-muted/50 px-4 py-3 text-sm"><span>Customers</span><strong>{data.customers.count}</strong></div><div className="flex justify-between rounded-xl bg-muted/50 px-4 py-3 text-sm"><span>Unresolved inventory alerts</span><strong>{data.inventory.low_stock_alerts}</strong></div><div className="flex justify-between rounded-xl bg-muted/50 px-4 py-3 text-sm"><span>Failed communications</span><strong>{data.communications.failed}</strong></div></div></div>
        <div className="rounded-2xl border bg-card p-6"><h2 className="flex items-center gap-2 font-semibold"><Database className="h-5 w-5 text-primary" />Critical database surfaces</h2><div className="mt-5 grid grid-cols-2 gap-3">{Object.entries(data.tables).map(([name, healthy]) => <div key={name} className="flex items-center gap-2 rounded-xl border px-3 py-3 text-sm"><span className={`h-2.5 w-2.5 rounded-full ${healthy ? 'bg-emerald-500' : 'bg-red-500'}`} /><span className="truncate">{name.replaceAll('_',' ')}</span></div>)}</div></div>
      </div>
      <div className="rounded-2xl border bg-muted/30 p-5 text-sm text-muted-foreground"><div className="flex items-center gap-2 font-medium text-foreground"><Server className="h-4 w-4" />What this page does</div><p className="mt-2">This is a live read-only health snapshot. It does not mutate business data, restart services, or claim that third-party providers such as email or WhatsApp are online.</p></div>
    </div>}
  </AdminLayout>;
}
