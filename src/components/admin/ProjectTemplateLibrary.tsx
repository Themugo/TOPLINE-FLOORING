import React, { useCallback, useEffect, useState } from 'react';
import {
  Layers,
  Plus,
  CheckCircle2,
  Clock,
  DollarSign,
  Package,
  X,
  Trash2,
  Search,
  ShieldCheck,
  Check,
} from 'lucide-react';
import type { ProjectTemplate } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { dbFailure, describeDbError } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';

interface ProjectTemplateRow {
  id: string;
  name: string;
  category: string;
  service_type: string;
  description: string;
  default_materials: string;
  default_estimated_budget: number | string;
  default_area_size: string;
  phases: ProjectTemplate['phases'] | null;
  default_expense_items: ProjectTemplate['default_expense_items'] | null;
}

function rowToTemplate(row: ProjectTemplateRow): ProjectTemplate {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    service_type: row.service_type,
    description: row.description,
    default_materials: row.default_materials,
    default_estimated_budget: Number(row.default_estimated_budget) || 0,
    default_area_size: row.default_area_size,
    phases: Array.isArray(row.phases) ? row.phases : [],
    default_expense_items: Array.isArray(row.default_expense_items) ? row.default_expense_items : [],
  };
}

interface ProjectTemplateLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: ProjectTemplate) => void;
}

export function ProjectTemplateLibrary({
  isOpen,
  onClose,
  onSelectTemplate,
}: ProjectTemplateLibraryProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from('project_templates')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setTemplates([]);
      setLoadError(describeDbError(error));
    } else {
      const rows = ((data ?? []) as ProjectTemplateRow[]).map(rowToTemplate);
      setTemplates(rows);
      setSelectedTemplate((current) => rows.find((t) => t.id === current?.id) ?? rows[0] ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) void loadTemplates();
  }, [isOpen, loadTemplates]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'phases' | 'costs'>('overview');

  // Custom template editor state
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [customServiceType, setCustomServiceType] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customMaterials, setCustomMaterials] = useState('');
  const [customBudget, setCustomBudget] = useState(0);
  const [customArea, setCustomArea] = useState('');

  if (!isOpen) return null;

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.service_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveCustomTemplate = async () => {
    if (!customName.trim() || saving) return;
    setSaving(true);
    // Only what the user entered is stored: no invented phases, budget splits or defaults.
    const { data, error } = await supabase
      .from('project_templates')
      .insert({
        name: customName.trim(),
        category: customCategory.trim(),
        service_type: customServiceType.trim(),
        description: customDescription.trim(),
        default_materials: customMaterials.trim(),
        default_estimated_budget: Math.max(0, Number(customBudget) || 0),
        default_area_size: customArea.trim(),
        phases: [],
        default_expense_items: [],
      })
      .select('*')
      .single();
    setSaving(false);
    if (error || !data) {
      toast({ title: 'Template not saved', description: describeDbError(error), variant: 'destructive' });
      return;
    }
    const created = rowToTemplate(data as ProjectTemplateRow);
    setTemplates((prev) => [created, ...prev]);
    setSelectedTemplate(created);
    setIsCreatingCustom(false);
    setCustomName('');
    setCustomDescription('');
    setCustomMaterials('');
    setCustomBudget(0);
    setCustomArea('');
    toast({ title: 'Template saved' });
  };

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this template? This cannot be undone.')) return;
    const failure = await dbFailure(supabase.from('project_templates').delete().eq('id', id).select('id'), { requireRows: true });
    if (failure) {
      toast({ title: 'Delete failed', description: failure, variant: 'destructive' });
      return;
    }
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    if (selectedTemplate?.id === id) setSelectedTemplate(updated[0] ?? null);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <div className="bg-white rounded-3xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-gray-900 via-slate-900 to-gray-800 text-white flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-500/20 text-primary-400 rounded-xl border border-primary-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                Project Template Library
                <span className="text-[10px] bg-primary-500/30 text-primary-300 font-extrabold px-2 py-0.5 rounded-full border border-primary-500/40">
                  Standard Specifications
                </span>
              </h3>
              <p className="text-xs text-gray-300">
                Pre-defined execution phases, task checklists, material lists, and estimated cost benchmarks.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Split */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Left Column: Template List */}
          <div className="w-full md:w-80 border-r border-gray-200 bg-gray-50 flex flex-col overflow-hidden">
            {/* Search & Add New */}
            <div className="p-3 border-b border-gray-200 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <button
                onClick={() => setIsCreatingCustom(true)}
                className="w-full py-2 px-3 bg-white hover:bg-primary-50 text-primary-700 border border-primary-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
              >
                <Plus className="w-4 h-4 text-primary-600" /> Define Custom Template
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {loading && <p className="p-4 text-xs text-gray-500 text-center">Loading templates...</p>}
              {!loading && loadError && (
                <div className="p-4 text-center space-y-2">
                  <p className="text-xs font-semibold text-red-700">Could not load templates</p>
                  <p className="text-[11px] text-red-600">{loadError}</p>
                  <button onClick={() => void loadTemplates()} className="px-3 py-1 text-[11px] font-semibold bg-white border border-red-200 rounded-lg text-red-700">Retry</button>
                </div>
              )}
              {!loading && !loadError && templates.length === 0 && (
                <p className="p-4 text-xs text-gray-500 text-center">No templates yet. Use the add button to create your first one.</p>
              )}
              {filteredTemplates.map((t) => {
                const isSelected = selectedTemplate?.id === t.id && !isCreatingCustom;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTemplate(t);
                      setIsCreatingCustom(false);
                    }}
                    className={`p-3 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-white border-primary-500 shadow-md ring-1 ring-primary-500/20'
                        : 'bg-white/60 border-gray-200/80 hover:bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        {t.category}
                      </span>
                      {(
                        <button
                          onClick={(e) => void handleDeleteTemplate(t.id, e)}
                          className="text-gray-300 hover:text-rose-600 p-0.5 rounded"
                          title="Delete Template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <h4 className="font-bold text-xs text-gray-900 mt-1.5 line-clamp-1">
                      {t.name}
                    </h4>

                    <div className="text-[11px] text-gray-500 mt-1 flex items-center justify-between font-mono">
                      <span>Est. {formatCurrency(t.default_estimated_budget)}</span>
                      <span className="text-[10px] text-gray-400">{t.phases.length} Phases</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Template Detail / Custom Form */}
          <div className="flex-1 bg-white flex flex-col overflow-y-auto">
            {isCreatingCustom ? (
              /* Custom Template Creator */
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">
                      Create Custom Project Template
                    </h3>
                    <p className="text-xs text-gray-500">
                      Save a new standardized blueprint for repeating project jobs.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCreatingCustom(false)}
                    className="text-xs text-gray-500 hover:text-gray-800 underline"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Template Title / Preset Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Heavy Duty Food Processing Floor"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Industrial Epoxy"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Service Type
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Epoxy Flooring"
                        value={customServiceType}
                        onChange={(e) => setCustomServiceType(e.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Default Estimated Budget (KES)
                      </label>
                      <input
                        type="number"
                        value={customBudget}
                        onChange={(e) => setCustomBudget(Number(e.target.value))}
                        className="w-full p-2.5 border border-gray-300 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Default Coverage Area
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 400 SQM"
                        value={customArea}
                        onChange={(e) => setCustomArea(e.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Standard Materials List
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. EP-100 Primer, Polyurethane Topcoat..."
                      value={customMaterials}
                      onChange={(e) => setCustomMaterials(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      System Description
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Overview of execution methodology..."
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-xl"
                    />
                  </div>

                  <button
                    onClick={() => void handleSaveCustomTemplate()}
                    disabled={!customName.trim() || saving}
                    className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                  >
                    {saving ? 'Saving...' : 'Save Template to Library'}
                  </button>
                </div>
              </div>
            ) : selectedTemplate ? (
              /* Selected Template Display */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Template Top Info Banner */}
                <div className="p-5 bg-gray-50 border-b border-gray-200">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <span className="px-2.5 py-0.5 bg-primary-100 text-primary-800 text-[10px] font-black uppercase rounded-md tracking-wider">
                      {selectedTemplate.category} • {selectedTemplate.service_type}
                    </span>
                    <button
                      onClick={() => {
                        onSelectTemplate(selectedTemplate);
                        onClose();
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Check className="w-4 h-4" /> Apply Template to Project Form
                    </button>
                  </div>

                  <h2 className="text-base font-extrabold text-gray-900">
                    {selectedTemplate.name}
                  </h2>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    {selectedTemplate.description}
                  </p>

                  <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-gray-200/80">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold">
                          Est. Budget
                        </div>
                        <div className="text-xs font-mono font-bold text-gray-900">
                          {formatCurrency(selectedTemplate.default_estimated_budget)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary-600" />
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold">
                          Default Coverage
                        </div>
                        <div className="text-xs font-mono font-bold text-gray-900">
                          {selectedTemplate.default_area_size}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold">
                          Est. Duration
                        </div>
                        <div className="text-xs font-mono font-bold text-gray-900">
                          {selectedTemplate.phases.reduce(
                            (acc, p) => acc + p.estimated_days,
                            0
                          )}{' '}
                          Days
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center border-b border-gray-200 px-5 text-xs font-bold text-gray-600 bg-white">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-3 px-4 border-b-2 transition-colors ${
                      activeTab === 'overview'
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent hover:text-gray-900'
                    }`}
                  >
                    System Materials & Specs
                  </button>
                  <button
                    onClick={() => setActiveTab('phases')}
                    className={`py-3 px-4 border-b-2 transition-colors ${
                      activeTab === 'phases'
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent hover:text-gray-900'
                    }`}
                  >
                    Execution Phases ({selectedTemplate.phases.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('costs')}
                    className={`py-3 px-4 border-b-2 transition-colors ${
                      activeTab === 'costs'
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent hover:text-gray-900'
                    }`}
                  >
                    Cost Line Items ({(selectedTemplate.default_expense_items ?? []).length})
                  </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-5 text-xs space-y-4">
                  {activeTab === 'overview' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                        <h4 className="font-bold text-gray-900 flex items-center gap-1.5">
                          <Package className="w-4 h-4 text-primary-600" /> Standard Materials List
                        </h4>
                        <p className="text-gray-700 leading-relaxed">
                          {selectedTemplate.default_materials}
                        </p>
                      </div>

                      <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-2">
                        <h4 className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" /> Quality & Safety Assurance
                        </h4>
                        <p className="text-emerald-800 text-[11px] leading-relaxed">
                          Applying this template automatically configures default materials, estimated cost baseline, and technical execution milestones to enforce high quality standards.
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'phases' && (
                    <div className="space-y-3">
                      {selectedTemplate.phases.map((phase) => (
                        <div
                          key={phase.id}
                          className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-gray-900 text-xs">
                              {phase.name}
                            </h4>
                            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                              {phase.estimated_days} Days
                            </span>
                          </div>

                          <ul className="space-y-1.5 pt-1">
                            {phase.tasks.map((task, tIdx) => (
                              <li
                                key={tIdx}
                                className="flex items-start gap-2 text-gray-700 text-[11px]"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{task}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'costs' && (
                    <div className="border border-gray-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200 font-bold text-gray-500 uppercase text-[10px]">
                          <tr>
                            <th className="p-3">Expense Category</th>
                            <th className="p-3">Description</th>
                            <th className="p-3 text-right">Est. Cost</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(selectedTemplate.default_expense_items ?? []).map((exp, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="p-3">
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-bold uppercase text-[9px] rounded">
                                  {exp.category}
                                </span>
                              </td>
                              <td className="p-3 font-medium text-gray-900">
                                {exp.description}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-gray-900">
                                {formatCurrency(exp.estimated_amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-xs italic p-6">
                Select a template from the left library to inspect specs or apply.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
