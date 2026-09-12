import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, RefreshCw, ShieldCheck, Wrench, AlertTriangle, Users, PackageCheck, CircleDollarSign } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { useToast } from '@/hooks/use-toast';
import { getProjectDelivery360, reconcileProjectDelivery360, recordProjectQualityInspection, updateProjectDeliveryStatus } from '@/lib/project-delivery-360';

const money = (value: unknown) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(Number(value || 0));
const arr = (value: unknown) => Array.isArray(value) ? value as Array<Record<string, any>> : [];

export default function AdminProjectDelivery360() {
  const [rows, setRows] = useState<Array<Record<string, any>>>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quality, setQuality] = useState<'pending'|'passed'|'failed'|'waived'>('passed');
  const [score, setScore] = useState('100');
  const [findings, setFindings] = useState('');
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const data = await getProjectDelivery360();
      const next = data.projects || [];
      setRows(next as any[]);
      if (!selected && next[0]?.project?.id) setSelected(next[0].project.id as string);
    } catch (e) { toast({ title: 'Unable to load project delivery', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const current = useMemo(() => rows.find(r => r.project?.id === selected) || rows[0], [rows, selected]);
  const project = current?.project || {};
  const installations = arr(current?.installations); const tasks = arr(current?.tasks); const issues = arr(current?.issues); const materials = arr(current?.materials); const costs = arr(current?.costs); const qualityRows = arr(current?.quality); const workforce = arr(current?.workforce); const signoff = current?.signoff;
  const openIssues = issues.filter(i => !['resolved','closed'].includes(i.status)).length;
  const openTasks = tasks.filter(t => !['completed','cancelled'].includes(t.status)).length;
  const latestQuality = qualityRows[0]?.status;
  const latestInstallation = installations[0]?.status;
  const ready = Number(project.progress_percentage || 0) === 100 && openIssues === 0 && openTasks === 0 && (!latestInstallation || latestInstallation === 'completed') && (!latestQuality || ['passed','waived'].includes(latestQuality)) && !!signoff?.approved;
  const run = async (fn: () => Promise<unknown>, title: string) => { setSaving(true); try { await fn(); toast({ title }); await load(); } catch (e) { toast({ title: 'Operation failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' }); } finally { setSaving(false); } };

  return <AdminLayout title="Project Delivery 360" subtitle="One authoritative control surface from project planning through field execution, cost, quality and customer completion.">
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[["Projects", rows.length], ["In progress", rows.filter(r => ['scheduled','in_progress'].includes(r.project?.status)).length], ["Open issues", rows.reduce((n,r)=>n+arr(r.issues).filter(i=>!['resolved','closed'].includes(i.status)).length,0)], ["Unfinished tasks", rows.reduce((n,r)=>n+arr(r.tasks).filter(t=>!['completed','cancelled'].includes(t.status)).length,0)], ["Ready to close", rows.filter(r=>r.project?.progress_percentage===100).length]].map(([label,value])=><div className="surface p-4" key={label as string}><p className="eyebrow">{label}</p><p className="text-2xl font-bold mt-1">{value}</p></div>)}
      </div>
      <div className="flex justify-end"><button className="btn-secondary flex items-center gap-2" disabled={saving} onClick={()=>run(()=>reconcileProjectDelivery360(selected),'Delivery reconciliation completed')}><RefreshCw className="w-4 h-4"/>Reconcile Delivery</button></div>
      <div className="grid xl:grid-cols-[320px_1fr] gap-6">
        <section className="surface overflow-hidden"><div className="p-5 border-b"><h2 className="font-bold">Projects</h2><p className="text-sm text-muted-foreground mt-1">Select a delivery operation.</p></div><div className="divide-y max-h-[680px] overflow-auto">{loading ? <p className="p-6 text-muted-foreground">Loading…</p> : rows.map(r=>{const p=r.project; return <button key={p.id} onClick={()=>setSelected(p.id)} className={`w-full text-left p-4 hover:bg-muted/40 ${selected===p.id?'bg-muted/50 border-l-4 border-primary':''}`}><div className="font-semibold">{p.title}</div><div className="text-xs text-muted-foreground mt-1">{p.client_name || 'No customer'} · {p.status}</div><div className="mt-3 h-2 bg-muted rounded-full"><div className="h-2 bg-primary rounded-full" style={{width:`${p.progress_percentage||0}%`}}/></div><div className="text-xs mt-1 text-muted-foreground">{p.progress_percentage||0}% complete</div></button>})}</div></section>
        {!current ? <section className="surface p-10 text-center text-muted-foreground">No projects available.</section> : <section className="space-y-6">
          <div className="surface p-5"><div className="flex flex-wrap justify-between gap-4"><div><p className="eyebrow">{project.project_number || 'Project'}</p><h2 className="text-2xl font-bold mt-1">{project.title}</h2><p className="text-sm text-muted-foreground mt-1">{project.client_name || 'Customer not linked'} · {project.status}</p></div><span className={`chip ${ready?'text-emerald-700':'text-amber-700'}`}>{ready?'Ready to close':'Delivery in progress'}</span></div><div className="grid sm:grid-cols-4 gap-3 mt-5"><div className="surface-muted p-3"><p className="eyebrow">Progress</p><p className="text-xl font-bold mt-1">{project.progress_percentage || 0}%</p></div><div className="surface-muted p-3"><p className="eyebrow">Installation</p><p className="text-xl font-bold mt-1">{latestInstallation || 'Not scheduled'}</p></div><div className="surface-muted p-3"><p className="eyebrow">Actual cost</p><p className="text-xl font-bold mt-1">{money(costs.reduce((n,c)=>n+Number(c.actual_amount||0),0))}</p></div><div className="surface-muted p-3"><p className="eyebrow">Quality</p><p className="text-xl font-bold mt-1">{latestQuality || 'Pending'}</p></div></div><div className="mt-5 flex flex-wrap gap-2">{project.status!=='completed' && <><button className="btn-secondary" disabled={saving} onClick={()=>run(()=>updateProjectDeliveryStatus(project.id,'in_progress'),'Project marked in progress')}>Start execution</button><button className="btn-secondary" disabled={saving} onClick={()=>run(()=>updateProjectDeliveryStatus(project.id,'scheduled'),'Project marked scheduled')}>Mark scheduled</button></>}</div></div>
          <div className="grid md:grid-cols-2 gap-6">
            <section className="surface p-5"><h3 className="font-bold flex items-center gap-2"><ClipboardCheck className="w-4 h-4"/>Execution readiness</h3><div className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><span>Tasks complete</span><span>{tasks.length-openTasks}/{tasks.length}</span></div><div className="flex justify-between"><span>Issues resolved</span><span>{issues.length-openIssues}/{issues.length}</span></div><div className="flex justify-between"><span>Workforce assigned</span><span>{workforce.length}</span></div><div className="flex justify-between"><span>Materials allocated</span><span>{materials.length}</span></div><div className="flex justify-between"><span>Customer sign-off</span><span>{signoff?.approved?'Approved':'Pending'}</span></div></div></section>
            <section className="surface p-5"><h3 className="font-bold flex items-center gap-2"><ShieldCheck className="w-4 h-4"/>Quality inspection</h3><div className="grid grid-cols-2 gap-2 mt-4"><select className="input" value={quality} onChange={e=>setQuality(e.target.value as any)}><option value="passed">Passed</option><option value="failed">Failed</option><option value="waived">Waived</option><option value="pending">Pending</option></select><input className="input" type="number" min="0" max="100" value={score} onChange={e=>setScore(e.target.value)} placeholder="Score"/></div><textarea className="input mt-2" value={findings} onChange={e=>setFindings(e.target.value)} placeholder="Inspection findings / corrective action"/><button className="btn-primary mt-3" disabled={saving} onClick={()=>run(()=>recordProjectQualityInspection({projectId:project.id,installationId:installations[0]?.id,status:quality,score:Number(score),findings}),'Quality inspection recorded')}>Record inspection</button></section>
          </div>
          <div className="grid md:grid-cols-4 gap-3"><div className="surface p-4"><Users className="w-4 h-4"/><p className="eyebrow mt-2">Workforce</p><p className="text-xl font-bold">{workforce.length}</p></div><div className="surface p-4"><PackageCheck className="w-4 h-4"/><p className="eyebrow mt-2">Material allocations</p><p className="text-xl font-bold">{materials.length}</p></div><div className="surface p-4"><AlertTriangle className="w-4 h-4"/><p className="eyebrow mt-2">Open issues</p><p className="text-xl font-bold">{openIssues}</p></div><div className="surface p-4"><CircleDollarSign className="w-4 h-4"/><p className="eyebrow mt-2">Project value</p><p className="text-xl font-bold">{money(project.project_value)}</p></div></div>
          {project.status==='completed' && <div className="surface p-5 flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-600"/><div><p className="font-semibold">Project completed</p><p className="text-sm text-muted-foreground">Customer completion and delivery controls are recorded.</p></div></div>}
        </section>}
      </div>
    </div>
  </AdminLayout>;
}
