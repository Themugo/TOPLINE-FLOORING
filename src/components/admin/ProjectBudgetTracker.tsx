import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertTriangle,
  Search,
  CheckCircle2,
  Receipt,
  Building2,
  X,
} from 'lucide-react';
import type { Project } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { addProjectCostEntry, deleteProjectCostEntry, type CostCategory } from '@/lib/project-costs';

interface ProjectBudgetTrackerProps {
  projects: Project[];
  onUpdateProjectBudget?: (projectId: string, estimatedBudget: number) => Promise<void> | void;
  onSelectProject?: (project: Project) => void;
}

type CostEntry = {
  id: string;
  project_id: string;
  category: string;
  description: string;
  estimated_amount: number | null;
  actual_amount: number | null;
  incurred_at: string;
};

const formatCurrency = (value: number) => new Intl.NumberFormat('en-KE', {
  style: 'currency', currency: 'KES', maximumFractionDigits: 0,
}).format(value);

export function ProjectBudgetTracker({ projects, onUpdateProjectBudget, onSelectProject }: ProjectBudgetTrackerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [varianceFilter, setVarianceFilter] = useState<'all' | 'under' | 'over'>('all');
  const [entries, setEntries] = useState<CostEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [category, setCategory] = useState<CostCategory>('materials');
  const [description, setDescription] = useState('');
  const [estimated, setEstimated] = useState('');
  const [actual, setActual] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [tempBudgetValue, setTempBudgetValue] = useState(0);

  const loadEntries = useCallback(async () => {
    if (!projects.length) { setEntries([]); return; }
    setLoading(true);
    const { data, error } = await supabase.from('project_cost_entries').select('id,project_id,category,description,estimated_amount,actual_amount,incurred_at').order('incurred_at', { ascending: false });
    if (!error) setEntries((data || []) as CostEntry[]);
    setLoading(false);
  }, [projects.length]);

  useEffect(() => { void loadEntries(); }, [loadEntries]);

  const budgetData = useMemo(() => projects.map((project) => {
    const projectEntries = entries.filter((entry) => entry.project_id === project.id);
    const estimatedBudget = Number(project.estimated_budget ?? project.project_value ?? 0);
    const actualExpenses = projectEntries.reduce((sum, entry) => sum + Number(entry.actual_amount || 0), 0);
    const variance = estimatedBudget - actualExpenses;
    return {
      project,
      entries: projectEntries,
      estimatedBudget,
      actualExpenses,
      variance,
      isOverBudget: variance < 0,
      variancePercentage: estimatedBudget > 0 ? (variance / estimatedBudget) * 100 : 0,
      utilization: estimatedBudget > 0 ? Math.round((actualExpenses / estimatedBudget) * 100) : 0,
    };
  }), [projects, entries]);

  const filteredData = budgetData.filter((item) => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = !term || [item.project.title, item.project.client_name, item.project.service_type].filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
    const matchesVariance = varianceFilter === 'all' || (varianceFilter === 'over' ? item.isOverBudget : !item.isOverBudget);
    return matchesSearch && matchesVariance;
  });

  const totals = budgetData.reduce((sum, item) => ({
    budget: sum.budget + item.estimatedBudget,
    actual: sum.actual + item.actualExpenses,
    over: sum.over + (item.isOverBudget ? 1 : 0),
  }), { budget: 0, actual: 0, over: 0 });
  const netVariance = totals.budget - totals.actual;

  const saveBudget = async (projectId: string) => {
    const value = Math.max(0, tempBudgetValue);
    try {
      await onUpdateProjectBudget?.(projectId, value);
      setEditingBudgetId(null);
    } catch { /* parent reports persistence errors */ }
  };

  const addExpense = async () => {
    if (!activeProject || !description.trim()) return;
    setSaving(true);
    try {
      await addProjectCostEntry({
        projectId: activeProject.id,
        category,
        description: description.trim(),
        estimatedAmount: Math.max(0, Number(estimated) || 0),
        actualAmount: Math.max(0, Number(actual) || 0),
        incurredAt: date || undefined,
      });
      setDescription(''); setEstimated(''); setActual('');
      setShowExpenseModal(false);
      await loadEntries();
    } finally {
      setSaving(false);
    }
  };

  const removeExpense = async (entryId: string) => {
    if (!confirm('Remove this cost entry?')) return;
    try {
      await deleteProjectCostEntry(entryId);
      await loadEntries();
    } catch { /* database error is handled by the RPC boundary */ }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col mb-6">
      <div className="p-4 bg-gray-50/90 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl"><DollarSign className="w-5 h-5 text-emerald-600" /></div>
          <div>
            <h3 className="font-bold text-sm text-gray-900">Project budgets & costs</h3>
            <p className="text-xs text-gray-500">Actual costs come from the project cost ledger. Nothing is estimated or invented.</p>
          </div>
        </div>
        <button onClick={() => { if (projects[0]) { setActiveProject(projects[0]); setShowExpenseModal(true); } }} className="btn-primary text-xs flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Log a cost
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50/40 border-b border-gray-200">
        <div className="bg-white p-3.5 rounded-xl border border-gray-200"><div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total budget</div><div className="text-xl font-black text-gray-900 mt-1">{formatCurrency(totals.budget)}</div></div>
        <div className="bg-white p-3.5 rounded-xl border border-gray-200"><div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Recorded costs</div><div className="text-xl font-black text-slate-800 mt-1">{formatCurrency(totals.actual)}</div></div>
        <div className="bg-white p-3.5 rounded-xl border border-gray-200"><div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Budget position</div><div className={`text-xl font-black mt-1 ${netVariance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(Math.abs(netVariance))}</div><div className="text-[10px] text-gray-500 mt-1">{netVariance >= 0 ? 'remaining' : 'over budget'} · {totals.over} project(s) over</div></div>
      </div>

      <div className="p-3 bg-white border-b border-gray-100 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64"><Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Find a project..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full text-xs pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white focus:outline-none" /></div>
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-semibold"><button onClick={() => setVarianceFilter('all')} className={`px-2.5 py-1 rounded-lg ${varianceFilter === 'all' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-600'}`}>All</button><button onClick={() => setVarianceFilter('under')} className={`px-2.5 py-1 rounded-lg ${varianceFilter === 'under' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-gray-600'}`}>On budget</button><button onClick={() => setVarianceFilter('over')} className={`px-2.5 py-1 rounded-lg ${varianceFilter === 'over' ? 'bg-white text-rose-700 shadow-2xs' : 'text-gray-600'}`}>Over budget</button></div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs"><thead className="bg-gray-50 border-b border-gray-200 font-bold text-gray-600 uppercase tracking-wider text-[10px]"><tr><th className="p-3">Project</th><th className="p-3 text-right">Budget</th><th className="p-3 text-right">Recorded cost</th><th className="p-3 text-right">Position</th><th className="p-3">Use</th><th className="p-3 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-gray-100">{filteredData.map((item) => {
            const { project } = item; const editing = editingBudgetId === project.id;
            return <tr key={project.id} className="hover:bg-gray-50/80"><td className="p-3"><button onClick={() => onSelectProject?.(project)} className="font-bold text-gray-900 hover:text-primary-600 text-left">{project.title}</button><div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5"><Building2 className="w-3 h-3" />{project.client_name || project.location || 'Project site'}</div></td><td className="p-3 text-right font-mono font-semibold">{editing ? <div className="flex justify-end gap-1"><input type="number" min="0" value={tempBudgetValue} onChange={(e) => setTempBudgetValue(Number(e.target.value))} className="w-24 text-xs p-1 border border-primary-500 rounded text-right" /><button onClick={() => void saveBudget(project.id)} className="p-1 bg-emerald-600 text-white rounded"><Check className="w-3 h-3" /></button><button onClick={() => setEditingBudgetId(null)} className="p-1 bg-gray-200 rounded"><X className="w-3 h-3" /></button></div> : <div className="group flex items-center justify-end gap-1.5"><span>{formatCurrency(item.estimatedBudget)}</span><button onClick={() => { setEditingBudgetId(project.id); setTempBudgetValue(item.estimatedBudget); }} className="text-gray-400 opacity-0 group-hover:opacity-100 hover:text-primary-600" title="Edit budget"><Edit2 className="w-3 h-3" /></button></div>}</td><td className="p-3 text-right font-mono font-bold">{formatCurrency(item.actualExpenses)}</td><td className="p-3 text-right font-mono font-bold"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${item.isOverBudget ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{item.isOverBudget ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}{formatCurrency(Math.abs(item.variance))}</span></td><td className="p-3"><div className="w-28"><div className="flex justify-between text-[10px] font-bold text-gray-600 mb-1"><span>{item.utilization}%</span><span>{item.isOverBudget ? 'Over' : 'On track'}</span></div><div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden"><div className={`h-full ${item.isOverBudget ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, item.utilization)}%` }} /></div></div></td><td className="p-3 text-right"><button onClick={() => { setActiveProject(project); setShowExpenseModal(true); }} className="btn-secondary text-[11px] flex items-center gap-1 ml-auto"><Receipt className="w-3.5 h-3.5 text-primary-600" /> Manage costs</button></td></tr>;
          })}</tbody></table>
        {loading && <div className="p-4 text-center text-xs text-gray-500">Refreshing cost records…</div>}
        {!loading && filteredData.length === 0 && <div className="p-8 text-center text-gray-500 text-sm">No project budgets match this view.</div>}
      </div>

      {showExpenseModal && activeProject && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"><div className="p-4 bg-gray-50 border-b flex items-center justify-between"><div><h3 className="font-bold text-sm text-gray-900">Costs · {activeProject.title}</h3><p className="text-xs text-gray-500 mt-1">These entries are saved to the shared project cost ledger.</p></div><button onClick={() => setShowExpenseModal(false)} className="p-1.5 rounded-lg hover:bg-gray-200"><X className="w-4 h-4" /></button></div><div className="p-4 overflow-y-auto"><div className="grid sm:grid-cols-2 gap-3"><select className="input" value={category} onChange={(e) => setCategory(e.target.value as CostCategory)}><option value="materials">Materials</option><option value="labor">Labour</option><option value="equipment">Equipment</option><option value="transport">Transport</option><option value="subcontractor">Subcontractor</option><option value="permits">Permits</option><option value="other">Other</option></select><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /><input className="input sm:col-span-2" placeholder="What was the cost for?" value={description} onChange={(e) => setDescription(e.target.value)} /><input className="input" type="number" min="0" placeholder="Estimated KES" value={estimated} onChange={(e) => setEstimated(e.target.value)} /><input className="input" type="number" min="0" placeholder="Actual KES" value={actual} onChange={(e) => setActual(e.target.value)} /></div><button disabled={saving || !description.trim()} onClick={() => void addExpense()} className="btn-primary w-full mt-4">{saving ? 'Saving cost…' : 'Save cost'}</button><div className="mt-6"><h4 className="font-semibold text-sm">Recorded costs</h4><div className="mt-2 divide-y border rounded-xl">{entries.filter(e => e.project_id === activeProject.id).map(e => <div key={e.id} className="p-3 flex items-center justify-between gap-3 text-sm"><div><p className="font-medium">{e.description}</p><p className="text-xs text-gray-500">{e.category} · {e.incurred_at}</p></div><div className="flex items-center gap-3"><span className="font-semibold">{formatCurrency(Number(e.actual_amount || 0))}</span><button onClick={() => void removeExpense(e.id)} className="text-red-600 p-1" title="Remove cost"><Trash2 className="w-4 h-4" /></button></div></div>)}{!entries.some(e => e.project_id === activeProject.id) && <div className="p-6 text-center text-sm text-gray-500">No costs recorded yet.</div>}</div></div></div></div></div>}
    </div>
  );
}
