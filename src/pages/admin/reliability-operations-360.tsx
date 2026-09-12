import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, ShieldAlert } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { createOperationalIncident, getReliabilityOperations360, updateOperationalIncident, type IncidentSeverity, type IncidentStatus, type ReliabilitySnapshot } from '@/lib/reliability-operations-360';

const severityClass: Record<IncidentSeverity, string> = { critical: 'text-red-700 bg-red-50 border-red-200', high: 'text-amber-700 bg-amber-50 border-amber-200', medium: 'text-yellow-700 bg-yellow-50 border-yellow-200', low: 'text-gray-700 bg-gray-50 border-gray-200' };

export default function ReliabilityOperations360() {
  const [data, setData] = useState<ReliabilitySnapshot | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const load = useCallback(async () => { setLoading(true); setMessage(''); try { setData(await getReliabilityOperations360(days)); } catch (e) { setMessage(e instanceof Error ? e.message : 'Unable to load reliability control.'); } finally { setLoading(false); } }, [days]);
  useEffect(() => { void load(); }, [load]);
  const create = async () => {
    const title = window.prompt('Incident title'); if (!title?.trim()) return;
    const severity = (window.prompt('Severity: critical, high, medium, low', 'medium') ?? 'medium').trim() as IncidentSeverity;
    const domain = (window.prompt('Domain: platform, database, payments, communications, fulfillment, supply_chain, customer_service, security, other', 'platform') ?? 'platform').trim();
    try { setLoading(true); await createOperationalIncident({ severity, domain, title }); await load(); setMessage('Incident recorded.'); } catch (e) { setLoading(false); setMessage(e instanceof Error ? e.message : 'Unable to create incident.'); }
  };
  const advance = async (id: string, status: IncidentStatus) => {
    const resolutionSummary = status === 'resolved' ? window.prompt('Resolution summary') ?? '' : undefined;
    if (status === 'resolved' && !resolutionSummary.trim()) return;
    try { setLoading(true); await updateOperationalIncident({ id, status, resolutionSummary }); await load(); setMessage('Incident updated.'); } catch (e) { setLoading(false); setMessage(e instanceof Error ? e.message : 'Unable to update incident.'); }
  };
  const m = data?.metrics;
  return <AdminLayout title="Reliability & Incident Response 360" subtitle="Durable incident ownership and operational response without creating a second system of record." actions={<div className="flex gap-2"><select value={days} onChange={e => setDays(Number(e.target.value))} className="rounded-lg border px-3 py-2 text-sm"><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select><button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />Refresh</button><button onClick={() => void create()} className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white">Record incident</button></div>}>
    {message && <div className="mb-5 rounded-xl border bg-white p-4 text-sm text-gray-700">{message}</div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {[["Open",m?.open],['Critical',m?.critical_open],['High',m?.high_open],['Unassigned',m?.unassigned_open],['Detected in period',m?.detected_period]].map(([label,value]) => <div key={label as string} className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{label as string}</p><p className="mt-1 text-3xl font-semibold">{loading ? '—' : value ?? 0}</p></div>)}
    </div>
    <section className="mt-6 rounded-2xl border bg-card p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Open incidents</h2><p className="mt-1 text-sm text-muted-foreground">Critical and high-severity incidents should have an owner and an explicit state.</p></div><ShieldAlert className="h-5 w-5 text-primary" /></div>
      <div className="mt-5 space-y-3">{data?.open_incidents.length ? data.open_incidents.map(i => <div key={i.id} className="rounded-xl border p-4"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-1 text-xs font-semibold uppercase ${severityClass[i.severity]}`}>{i.severity}</span><span className="text-xs text-muted-foreground">INC-{i.incident_number} · {i.domain}</span><span className="text-xs text-muted-foreground"><Clock3 className="mr-1 inline h-3 w-3" />{new Date(i.detected_at).toLocaleString()}</span></div><p className="mt-2 font-medium">{i.title}</p>{i.description && <p className="mt-1 text-sm text-muted-foreground">{i.description}</p>}</div><div className="flex shrink-0 gap-2"><select value={i.status} onChange={e => void advance(i.id, e.target.value as IncidentStatus)} className="rounded-lg border px-2 py-2 text-sm"><option value="open">Open</option><option value="investigating">Investigating</option><option value="mitigated">Mitigated</option><option value="resolved">Resolved</option></select></div></div></div>) : <div className="flex items-center gap-2 py-8 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />No open incidents recorded.</div>}</div>
    </section>
    <section className="mt-6 rounded-2xl border bg-muted/30 p-5 text-sm text-muted-foreground"><div className="flex items-center gap-2 font-medium text-foreground"><AlertTriangle className="h-4 w-4" />Operational principle</div><p className="mt-2">This register records incidents and response state; it does not pretend to replace Vercel, Supabase, payment-provider, messaging-provider or infrastructure monitoring.</p></section>
  </AdminLayout>;
}
