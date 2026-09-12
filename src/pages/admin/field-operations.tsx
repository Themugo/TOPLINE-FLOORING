import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import {
  allocateInstallationMaterial,
  assignInstallationStaff,
  recordInstallationMeasurement,
  recordInstallationProgress,
  reportInstallationIssue,
  resolveInstallationIssue,
  signoffInstallation,
} from '@/lib/field-operations';
import { AlertTriangle, CheckCircle2, ClipboardList, HardHat, Plus, RefreshCw, Ruler, Truck, Users, X } from 'lucide-react';

type Installation = { id: string; installation_number: string | null; project_id: string | null; scheduled_date: string | null; scheduled_time: string | null; status: string; projects?: { title?: string | null; client_name?: string | null } | null };
type Staff = { user_id: string; display_name: string | null; is_active: boolean };
type Product = { id: string; name: string; sku: string | null; unit: string; is_active: boolean };
type Assignment = { id: string; installation_id: string; staff_user_id: string; assignment_role: string; status: string };
type Measurement = { id: string; surface_name: string; length: number | null; width: number | null; area: number | null; unit: string; notes: string | null; created_at: string };
type Material = { id: string; product_id: string; quantity: number; unit: string; status: string; notes: string | null; created_at: string };
type Progress = { id: string; percent_complete: number; work_summary: string; blockers: string | null; created_at: string };
type Issue = { id: string; severity: string; category: string; description: string; status: string; resolution_notes: string | null; created_at: string };
type Signoff = { id: string; signed_by_name: string; signer_role: string | null; notes: string | null; signed_at: string };
type Detail = { assignments: Assignment[]; measurements: Measurement[]; materials: Material[]; progress: Progress[]; issues: Issue[]; signoff: Signoff | null };

const emptyDetail: Detail = { assignments: [], measurements: [], materials: [], progress: [], issues: [], signoff: null };
const friendly = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function FieldOperations() {
  const { toast } = useToast();
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Installation | null>(null);
  const [detail, setDetail] = useState<Detail>(emptyDetail);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staffId, setStaffId] = useState('');
  const [role, setRole] = useState('installer');
  const [surfaceName, setSurfaceName] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [area, setArea] = useState('');
  const [measurementNotes, setMeasurementNotes] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [progress, setProgress] = useState('');
  const [workSummary, setWorkSummary] = useState('');
  const [blockers, setBlockers] = useState('');
  const [issueSeverity, setIssueSeverity] = useState('medium');
  const [issueCategory, setIssueCategory] = useState('general');
  const [issueDescription, setIssueDescription] = useState('');
  const [signer, setSigner] = useState('');
  const [signerRole, setSignerRole] = useState('');
  const [signoffNotes, setSignoffNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const [i, s, p] = await Promise.all([
      supabase.from('installations').select('id,installation_number,project_id,scheduled_date,scheduled_time,status,projects(title,client_name)').order('scheduled_date', { ascending: true }),
      supabase.from('staff_profiles').select('user_id,display_name,is_active').eq('is_active', true).order('display_name'),
      supabase.from('products').select('id,name,sku,unit,is_active').eq('is_active', true).order('name'),
    ]);
    const first = [i, s, p].find((r) => r.error)?.error;
    if (first) setError(first.message); else { setInstallations((i.data ?? []) as Installation[]); setStaff((s.data ?? []) as Staff[]); setProducts((p.data ?? []) as Product[]); }
    setLoading(false);
  }, []);

  const loadDetail = useCallback(async (installationId: string) => {
    setDetailLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_installation_operations_360', { p_installation_id: installationId });
      if (rpcError) throw rpcError;
      const raw = (data ?? {}) as Partial<Detail>;
      setDetail({ assignments: (raw.assignments ?? []) as Assignment[], measurements: (raw.measurements ?? []) as Measurement[], materials: (raw.materials ?? []) as Material[], progress: (raw.progress ?? []) as Progress[], issues: (raw.issues ?? []) as Issue[], signoff: (raw.signoff ?? null) as Signoff | null });
    } catch (e) { toast({ title: 'Could not load field record', description: e instanceof Error ? e.message : 'Please try again', variant: 'destructive' }); }
    finally { setDetailLoading(false); }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (selected) void loadDetail(selected.id); else setDetail(emptyDetail); }, [selected, loadDetail]);

  const run = async (action: () => Promise<unknown>, success: string, reset?: () => void) => {
    try { await action(); toast({ title: success }); reset?.(); await load(); if (selected) await loadDetail(selected.id); }
    catch (e) { toast({ title: 'Action failed', description: e instanceof Error ? e.message : 'Please try again', variant: 'destructive' }); }
  };

  const metrics = useMemo(() => ({ scheduled: installations.filter((x) => x.status === 'scheduled').length, active: installations.filter((x) => x.status === 'in_progress').length, completed: installations.filter((x) => x.status === 'completed').length, openIssues: detail.issues.filter((x) => x.status === 'open' || x.status === 'in_progress').length }), [installations, detail.issues]);
  const latestProgress = detail.progress[0]?.percent_complete ?? 0;

  return <AdminLayout title="Field Operations 360" subtitle="Control the field execution loop from site evidence through installation sign-off." actions={<button className="btn-secondary" onClick={() => void load()} disabled={loading}><RefreshCw className={`w-4 h-4 mr-2 inline ${loading ? 'animate-spin' : ''}`} />Refresh</button>}>
    {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Field operations could not be loaded: {error}</div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
      {[['Scheduled', metrics.scheduled, ClipboardList], ['In progress', metrics.active, HardHat], ['Completed', metrics.completed, CheckCircle2], ['Open issues', metrics.openIssues, AlertTriangle]].map(([label, value, Icon]) => <div className="surface p-5" key={String(label)}><Icon className="w-5 h-5 text-primary-600" /><p className="eyebrow mt-4">{label}</p><p className="text-3xl font-bold mt-1">{loading ? '—' : value}</p></div>)}
    </div>

    <div className="grid xl:grid-cols-[.9fr_1.6fr] gap-6">
      <section className="surface overflow-hidden">
        <div className="p-5 border-b"><p className="eyebrow">Work queue</p><h2 className="text-xl font-bold mt-1">Installations</h2></div>
        <div className="max-h-[720px] overflow-auto">{loading ? <p className="p-8 text-sm text-muted-foreground">Loading field schedule…</p> : installations.length === 0 ? <p className="p-8 text-sm text-muted-foreground">No installations available.</p> : installations.map((item) => <button key={item.id} onClick={() => setSelected(item)} className={`w-full text-left p-4 border-b hover:bg-muted/40 transition-colors ${selected?.id === item.id ? 'bg-muted/50' : ''}`}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{item.installation_number || item.id.slice(0, 8)}</p><p className="text-sm text-muted-foreground mt-1">{item.projects?.title || 'Project installation'}</p><p className="text-xs text-muted-foreground">{item.projects?.client_name || 'No client'} · {item.scheduled_date || 'Unscheduled'}</p></div><span className="chip">{friendly(item.status)}</span></div></button>)}</div>
      </section>

      <section className="space-y-6">
        {!selected ? <div className="surface p-12 text-center"><HardHat className="w-12 h-12 mx-auto mb-4 opacity-40" /><h2 className="text-xl font-bold">Select an installation</h2><p className="text-sm text-muted-foreground mt-2">Measurements, crew, materials, progress, issues and sign-off will appear here.</p></div> : <>
          <div className="surface p-6"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">{selected.installation_number || 'Installation'}</p><h2 className="text-2xl font-bold mt-1">{selected.projects?.title || 'Project installation'}</h2><p className="text-sm text-muted-foreground mt-1">{selected.projects?.client_name || 'No client'} · {selected.scheduled_date || 'Unscheduled'} {selected.scheduled_time || ''}</p></div><button onClick={() => setSelected(null)}><X className="w-5 h-5" /></button></div><div className="mt-5"><div className="flex justify-between text-sm"><span>Latest recorded progress</span><strong>{latestProgress}%</strong></div><div className="h-2 rounded-full bg-muted mt-2 overflow-hidden"><div className="h-full bg-primary-600" style={{ width: `${latestProgress}%` }} /></div></div></div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="surface p-6"><h3 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4" /> Crew assignment</h3><div className="grid sm:grid-cols-2 gap-3 mt-4"><select className="input" value={staffId} onChange={(e) => setStaffId(e.target.value)}><option value="">Staff member</option>{staff.map((s) => <option key={s.user_id} value={s.user_id}>{s.display_name || s.user_id.slice(0, 8)}</option>)}</select><select className="input" value={role} onChange={(e) => setRole(e.target.value)}><option value="lead_installer">Lead installer</option><option value="installer">Installer</option><option value="technician">Technician</option><option value="supervisor">Supervisor</option><option value="helper">Helper</option></select></div><button className="btn-primary mt-3" disabled={!staffId} onClick={() => void run(() => assignInstallationStaff({ installationId: selected.id, staffUserId: staffId, role }), 'Crew member assigned', () => setStaffId(''))}>Assign member</button><div className="mt-4 space-y-2">{detail.assignments.map((a) => <div className="flex justify-between text-sm border rounded-lg p-2.5" key={a.id}><span>{staff.find((s) => s.user_id === a.staff_user_id)?.display_name || a.staff_user_id.slice(0, 8)} · {friendly(a.assignment_role)}</span><span className="text-muted-foreground">{friendly(a.status)}</span></div>)}{!detail.assignments.length && <p className="text-sm text-muted-foreground">No active crew assigned.</p>}</div></div>

            <div className="surface p-6"><h3 className="font-semibold flex items-center gap-2"><Ruler className="w-4 h-4" /> Measurement capture</h3><div className="grid sm:grid-cols-2 gap-3 mt-4"><input className="input" placeholder="Surface / room" value={surfaceName} onChange={(e) => setSurfaceName(e.target.value)} /><input className="input" type="number" placeholder="Length" value={length} onChange={(e) => setLength(e.target.value)} /><input className="input" type="number" placeholder="Width" value={width} onChange={(e) => setWidth(e.target.value)} /><input className="input" type="number" placeholder="Area" value={area} onChange={(e) => setArea(e.target.value)} /></div><input className="input w-full mt-3" placeholder="Notes" value={measurementNotes} onChange={(e) => setMeasurementNotes(e.target.value)} /><button className="btn-primary mt-3" disabled={!surfaceName.trim()} onClick={() => void run(() => recordInstallationMeasurement({ installationId: selected.id, surfaceName, length: length ? Number(length) : null, width: width ? Number(width) : null, area: area ? Number(area) : null, notes: measurementNotes }), 'Measurement recorded', () => { setSurfaceName(''); setLength(''); setWidth(''); setArea(''); setMeasurementNotes(''); })}><Plus className="w-4 h-4 mr-1 inline" />Record measurement</button><div className="mt-4 space-y-2">{detail.measurements.slice(0, 5).map((m) => <div className="text-sm border rounded-lg p-2.5" key={m.id}><strong>{m.surface_name}</strong> · {m.area ?? '—'} {m.unit}<div className="text-xs text-muted-foreground">L {m.length ?? '—'} × W {m.width ?? '—'}</div></div>)}</div></div>

            <div className="surface p-6"><h3 className="font-semibold flex items-center gap-2"><Truck className="w-4 h-4" /> Material allocation</h3><div className="grid sm:grid-cols-[1fr_.5fr] gap-3 mt-4"><select className="input" value={productId} onChange={(e) => setProductId(e.target.value)}><option value="">Product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.sku ? ` · ${p.sku}` : ''}</option>)}</select><input className="input" type="number" min="0.001" step="0.001" placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div><button className="btn-primary mt-3" disabled={!productId || !quantity} onClick={() => void run(() => allocateInstallationMaterial({ installationId: selected.id, productId, quantity: Number(quantity) }), 'Material allocated', () => { setProductId(''); setQuantity(''); })}>Allocate material</button><div className="mt-4 space-y-2">{detail.materials.slice(0, 5).map((m) => <div className="flex justify-between text-sm border rounded-lg p-2.5" key={m.id}><span>{products.find((p) => p.id === m.product_id)?.name || m.product_id.slice(0, 8)}</span><span>{m.quantity} {m.unit} · {friendly(m.status)}</span></div>)}</div></div>

            <div className="surface p-6"><h3 className="font-semibold flex items-center gap-2"><HardHat className="w-4 h-4" /> Progress update</h3><div className="grid sm:grid-cols-[.35fr_1fr] gap-3 mt-4"><input className="input" type="number" min="0" max="100" placeholder="%" value={progress} onChange={(e) => setProgress(e.target.value)} /><input className="input" placeholder="What was completed?" value={workSummary} onChange={(e) => setWorkSummary(e.target.value)} /></div><textarea className="input w-full mt-3 min-h-20" placeholder="Blockers / dependencies (optional)" value={blockers} onChange={(e) => setBlockers(e.target.value)} /><button className="btn-primary mt-3" disabled={!progress || !workSummary.trim()} onClick={() => void run(() => recordInstallationProgress({ installationId: selected.id, percentComplete: Number(progress), workSummary, blockers }), 'Progress recorded', () => { setProgress(''); setWorkSummary(''); setBlockers(''); })}>Record progress</button></div>

            <div className="surface p-6"><h3 className="font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Issues & blockers</h3><div className="grid sm:grid-cols-2 gap-3 mt-4"><select className="input" value={issueSeverity} onChange={(e) => setIssueSeverity(e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select><input className="input" placeholder="Category" value={issueCategory} onChange={(e) => setIssueCategory(e.target.value)} /></div><textarea className="input w-full mt-3 min-h-20" placeholder="Describe the issue" value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} /><button className="btn-primary mt-3" disabled={!issueDescription.trim()} onClick={() => void run(() => reportInstallationIssue({ installationId: selected.id, severity: issueSeverity, category: issueCategory, description: issueDescription }), 'Issue reported', () => setIssueDescription(''))}>Report issue</button><div className="mt-4 space-y-2">{detail.issues.slice(0, 6).map((x) => <div className="border rounded-lg p-3 text-sm" key={x.id}><div className="flex justify-between gap-3"><strong>{friendly(x.severity)} · {friendly(x.category)}</strong><span>{friendly(x.status)}</span></div><p className="mt-1">{x.description}</p>{(x.status === 'open' || x.status === 'in_progress') && <button className="text-xs text-primary-700 font-medium mt-2" onClick={() => void run(() => resolveInstallationIssue(x.id, 'resolved', 'Resolved from Field Operations 360'), 'Issue resolved')}>Mark resolved</button>}</div>)}</div></div>

            <div className="surface p-6"><h3 className="font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Completion & sign-off</h3>{detail.signoff ? <div className="rounded-lg bg-muted/40 p-4 mt-4 text-sm"><strong>Signed by {detail.signoff.signed_by_name}</strong><p className="text-muted-foreground mt-1">{detail.signoff.signer_role || 'No role supplied'} · {new Date(detail.signoff.signed_at).toLocaleString()}</p></div> : <><div className="grid sm:grid-cols-2 gap-3 mt-4"><input className="input" placeholder="Signer name" value={signer} onChange={(e) => setSigner(e.target.value)} /><input className="input" placeholder="Signer role" value={signerRole} onChange={(e) => setSignerRole(e.target.value)} /></div><textarea className="input w-full mt-3 min-h-20" placeholder="Sign-off notes" value={signoffNotes} onChange={(e) => setSignoffNotes(e.target.value)} /><button className="btn-primary mt-3" disabled={!signer.trim() || detail.issues.some((x) => x.status === 'open' || x.status === 'in_progress')} onClick={() => void run(() => signoffInstallation({ installationId: selected.id, signedByName: signer, signerRole, notes: signoffNotes }), 'Installation signed off', () => { setSigner(''); setSignerRole(''); setSignoffNotes(''); })}>Complete & sign off</button>{detail.issues.some((x) => x.status === 'open' || x.status === 'in_progress') && <p className="text-xs text-amber-700 mt-2">Resolve open issues before sign-off.</p>}</>}</div>
          </div>
        </>}
      </section>
    </div>
    {detailLoading && selected && <div className="fixed bottom-5 right-5 surface px-4 py-3 text-sm shadow-lg">Refreshing field record…</div>}
  </AdminLayout>;
}
