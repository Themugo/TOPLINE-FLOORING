import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Star, Images, Eye, ZoomIn, Sparkles, CheckCircle2, GripVertical, ArrowUp, ArrowDown, Save, FileSpreadsheet, MapPin, Table as TableIcon, Columns, Kanban, DollarSign, Layers, FileText } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/ui/image-upload';
import { BulkCsvImportModal } from '@/components/admin/BulkCsvImportModal';
import { ProjectStatsWidget } from '@/components/admin/ProjectStatsWidget';
import { ProjectDistributionMap } from '@/components/admin/ProjectDistributionMap';
import { ProjectGanttTimeline } from '@/components/admin/ProjectGanttTimeline';
import { ProjectBudgetTracker } from '@/components/admin/ProjectBudgetTracker';
import { ProjectTemplateLibrary } from '@/components/admin/ProjectTemplateLibrary';
import { ProjectDocumentManager } from '@/components/admin/ProjectDocumentManager';
import { AdminNotificationCenter } from '@/components/admin/AdminNotificationCenter';
import { getProjectPlaceholder, withFallback } from '@/lib/placeholders';
import type { Project, ProjectImage, ProjectExpenseItem, ProjectTemplate } from '@/lib/types';

export default function AdminProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Project | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedDocProject, setSelectedDocProject] = useState<Project | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'map' | 'gantt' | 'budget' | 'split'>('split');
  const [galleryProject, setGalleryProject] = useState<Project | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [orderChanged, setOrderChanged] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: '',
    client_name: '',
    service_type: '',
    category: '',
    location: '',
    description: '',
    materials_used: '',
    challenge: '',
    solution: '',
    results: '',
    featured: false,
    is_active: true,
    project_date: '',
    completion_date: '',
    area_size: '',
    estimated_budget: '',
    actual_expenses: '',
  });

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('*').order('display_order');
    setProjects(data || []);
    setLoading(false);
    setOrderChanged(false);
  };

  const resetForm = () => {
    setForm({ title: '', client_name: '', service_type: '', category: '', location: '', description: '', materials_used: '', challenge: '', solution: '', results: '', featured: false, is_active: true, project_date: '', completion_date: '', area_size: '', estimated_budget: '', actual_expenses: '' });
    setEditing(null);
    setShowForm(false);
  };

  const handleUpdateProjectBudget = async (
    projectId: string,
    estimatedBudget: number,
    actualExpenses: number,
    expenseItems: ProjectExpenseItem[]
  ) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              estimated_budget: estimatedBudget,
              actual_expenses: actualExpenses,
              expense_items: expenseItems,
            }
          : p
      )
    );

    try {
      await supabase.from('projects').update({
        estimated_budget: estimatedBudget,
        actual_expenses: actualExpenses,
      }).eq('id', projectId);
    } catch (e) {
      console.log('Budget updated in local state:', e);
    }

    toast({ title: 'Project budget & expenditures updated' });
  };

  const handleApplyTemplate = (template: ProjectTemplate) => {
    setForm((prev) => ({
      ...prev,
      title: prev.title || template.name,
      service_type: template.service_type,
      category: template.category,
      description: template.description,
      materials_used: template.default_materials,
      area_size: template.default_area_size,
      estimated_budget: String(template.default_estimated_budget),
      actual_expenses: prev.actual_expenses || '0',
    }));
    setShowForm(true);
    toast({
      title: `Applied "${template.name}" template`,
      description: 'Standard phases, materials list, and budget baseline loaded.',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-');
    const data = {
      ...form,
      slug,
      project_date: form.project_date || null,
      completion_date: form.completion_date || null,
      estimated_budget: form.estimated_budget ? Number(form.estimated_budget) : null,
      actual_expenses: form.actual_expenses ? Number(form.actual_expenses) : null,
      display_order: editing ? editing.display_order : projects.length + 1,
    };

    if (editing) {
      await supabase.from('projects').update(data).eq('id', editing.id);
    } else {
      await supabase.from('projects').insert(data);
    }
    resetForm();
    fetchProjects();
    toast({ title: editing ? 'Project updated' : 'Project created' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    await supabase.from('projects').delete().eq('id', id);
    fetchProjects();
  };

  const editProject = (project: Project) => {
    setEditing(project);
    setForm({
      title: project.title,
      client_name: project.client_name || '',
      service_type: project.service_type || '',
      category: project.category || '',
      location: project.location || '',
      description: project.description || '',
      materials_used: project.materials_used || '',
      challenge: project.challenge || '',
      solution: project.solution || '',
      results: project.results || '',
      featured: project.featured,
      is_active: project.is_active,
      project_date: project.project_date || '',
      completion_date: project.completion_date || '',
      area_size: project.area_size || '',
      estimated_budget: project.estimated_budget ? String(project.estimated_budget) : '',
      actual_expenses: project.actual_expenses ? String(project.actual_expenses) : '',
    });
    setShowForm(true);
  };

  const toggleFeatured = async (id: string, current: boolean) => {
    await supabase.from('projects').update({ featured: !current }).eq('id', id);
    fetchProjects();
  };

  // Reordering Logic
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newProjects = [...projects];
    const [movedItem] = newProjects.splice(draggedIndex, 1);
    newProjects.splice(dropIndex, 0, movedItem);

    setProjects(newProjects);
    setDraggedIndex(null);
    setDragOverIndex(null);
    setOrderChanged(true);
    saveOrder(newProjects);
  };

  const moveProject = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= projects.length) return;

    const newProjects = [...projects];
    const temp = newProjects[index];
    newProjects[index] = newProjects[targetIndex];
    newProjects[targetIndex] = temp;

    setProjects(newProjects);
    setOrderChanged(true);
    saveOrder(newProjects);
  };

  const saveOrder = async (updatedProjects: Project[]) => {
    const updates = updatedProjects.map((p, index) =>
      supabase.from('projects').update({ display_order: index + 1 }).eq('id', p.id)
    );
    await Promise.all(updates);
    setOrderChanged(false);
    toast({
      title: 'Display order updated!',
      description: 'The homepage Recent Projects gallery layout now reflects this order.',
    });
  };

  if (loading) return <AdminLayout title="Projects"><div className="text-center py-12">Loading projects...</div></AdminLayout>;

  const displayedProjects = selectedCategory
    ? projects.filter((p) => (p.category?.trim() || 'Uncategorized') === selectedCategory)
    : projects;

  return (
    <AdminLayout title="Projects & Portfolio Builder">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Portfolio Projects</h2>
          <p className="text-xs text-gray-500">Drag rows or use arrow handles to reorder gallery display position on the homepage.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle Controls */}
          <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1 border border-gray-200">
            <button
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'split'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Split View (Map + Table)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Split</span>
            </button>

            <button
              onClick={() => setViewMode('gantt')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'gantt'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Gantt Timeline Schedule"
            >
              <Kanban className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Gantt</span>
            </button>

            <button
              onClick={() => setViewMode('budget')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'budget'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Budget & Cost Tracker"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Budget</span>
            </button>

            <button
              onClick={() => setViewMode('map')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'map'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Geographic Map View"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Map</span>
            </button>

            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Table View"
            >
              <TableIcon className="w-3.5 h-3.5 text-primary-600" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          {orderChanged && (
            <button
              onClick={() => saveOrder(projects)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl flex items-center gap-1.5 shadow-md animate-bounce"
            >
              <Save className="w-4 h-4" /> Save New Sequence
            </button>
          )}

          <AdminNotificationCenter
            projects={projects}
            onNavigateToProject={(p) => editProject(p)}
            onNavigateToBudget={() => setViewMode('budget')}
          />

          <button
            onClick={() => setShowTemplateModal(true)}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200/80 rounded-xl font-semibold text-xs flex items-center gap-2 transition-colors shadow-2xs"
          >
            <Layers className="w-4 h-4 text-indigo-600" /> Project Templates
          </button>

          <button
            onClick={() => setShowCsvModal(true)}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl font-semibold text-xs flex items-center gap-2 transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Bulk CSV Import
          </button>

          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add New Project
          </button>
        </div>
      </div>

      <ProjectStatsWidget
        projects={projects}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Gantt Timeline Component in Gantt or Split View */}
      {(viewMode === 'gantt' || viewMode === 'split') && (
        <ProjectGanttTimeline
          projects={displayedProjects}
          onSelectProject={(project) => {
            setEditing(project);
            setShowForm(true);
          }}
        />
      )}

      {/* Cost & Budget Variance Tracking Component */}
      {(viewMode === 'budget' || viewMode === 'split') && (
        <ProjectBudgetTracker
          projects={displayedProjects}
          onUpdateProjectBudget={handleUpdateProjectBudget}
          onSelectProject={(project) => {
            setEditing(project);
            setShowForm(true);
          }}
        />
      )}

      {/* Map Component in Map or Split View */}
      {(viewMode === 'map' || viewMode === 'split') && (
        <div className="mb-6">
          <ProjectDistributionMap
            projects={displayedProjects}
            onSelectProject={(project) => {
              setEditing(project);
              setShowForm(true);
            }}
          />
        </div>
      )}

      {/* Table Component in Table or Split View */}
      {(viewMode === 'table' || viewMode === 'split') && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50/80 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-12 text-center">Order</th>
              <th className="px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Project Title</th>
              <th className="px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Service & Category</th>
              <th className="px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayedProjects.map((project, index) => (
              <tr
                key={project.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                className={`transition-all duration-200 ${
                  selectedDocProject?.id === project.id ? 'ring-2 ring-indigo-500 bg-indigo-50/30' : ''
                } ${
                  draggedIndex === index
                    ? 'bg-primary-50 opacity-40 scale-[0.98]'
                    : dragOverIndex === index
                    ? 'bg-primary-100 border-2 border-dashed border-primary-400'
                    : 'hover:bg-gray-50/90'
                } ${!project.is_active ? 'opacity-60 bg-gray-50' : ''}`}
              >
                {/* Drag Handle & Reorder Position */}
                <td className="px-3 py-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <div className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-primary-600 rounded">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      #{index + 1}
                    </span>
                  </div>
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {project.featured && (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold text-sm text-gray-900 line-clamp-1">{project.title}</p>
                      <p className="text-xs text-gray-500">{project.client_name || 'Commercial Client'}</p>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 text-xs">
                  <span className="font-medium text-gray-800 block">{project.service_type || 'Flooring'}</span>
                  <span className="text-gray-400 text-[11px]">{project.category}</span>
                </td>

                <td className="px-6 py-4 text-xs text-gray-600">
                  {project.location || 'Metropolitan Area'}
                </td>

                <td className="px-6 py-4">
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${project.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}>
                    {project.is_active ? 'Active' : 'Hidden'}
                  </span>
                </td>

                {/* Row Action Controls */}
                <td className="px-6 py-4 text-right">
                  <div className="inline-flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200">
                    <button
                      onClick={() => moveProject(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-500 hover:text-primary-600 disabled:opacity-30 disabled:hover:text-gray-500 rounded"
                      title="Move Up in Gallery"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveProject(index, 'down')}
                      disabled={index === projects.length - 1}
                      className="p-1 text-gray-500 hover:text-primary-600 disabled:opacity-30 disabled:hover:text-gray-500 rounded"
                      title="Move Down in Gallery"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-4 bg-gray-200 mx-0.5" />
                    <button
                      onClick={() => toggleFeatured(project.id, project.featured)}
                      className="p-1 text-gray-500 hover:text-yellow-600 rounded"
                      title={project.featured ? 'Unmark Featured' : 'Mark Featured'}
                    >
                      <Star className={`w-3.5 h-3.5 ${project.featured ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                    </button>
                    <button
                      onClick={() => setGalleryProject(project)}
                      className="p-1 text-gray-500 hover:text-primary-600 rounded"
                      title="Manage Gallery Photos"
                    >
                      <Images className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setSelectedDocProject(project)}
                      className="p-1 text-indigo-600 hover:text-indigo-800 rounded bg-indigo-50/80"
                      title="Manage PDF Contracts & Site Surveys"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => editProject(project)}
                      className="p-1 text-gray-500 hover:text-blue-600 rounded"
                      title="Edit Project Details"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="p-1 text-red-500 hover:text-red-700 rounded"
                      title="Delete Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      )}

      {/* Add / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 my-8 shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <h2 className="font-bold text-lg text-gray-900">{editing ? 'Edit Portfolio Project' : 'Add New Portfolio Project'}</h2>
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(true)}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-600" /> Apply Template
                </button>
              </div>
              <button onClick={resetForm} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <input required placeholder="Project Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input text-xs" />
                <input placeholder="Client Name (e.g. Metro Logistics Park)" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className="input text-xs" />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <input placeholder="Service Type (e.g., Epoxy Flooring)" value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} className="input text-xs" />
                <input placeholder="Category (e.g., Industrial, Waterproofing)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input text-xs" />
              </div>

              <input placeholder="Location (e.g. Central District, Metro Area)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input text-xs" />

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">Start Date</label>
                  <input type="date" value={form.project_date} onChange={(e) => setForm({ ...form, project_date: e.target.value })} className="input text-xs" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">Completion Date</label>
                  <input type="date" value={form.completion_date} onChange={(e) => setForm({ ...form, completion_date: e.target.value })} className="input text-xs" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">Area Size</label>
                  <input placeholder="e.g. 8,500 sq meters" value={form.area_size} onChange={(e) => setForm({ ...form, area_size: e.target.value })} className="input text-xs" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">Estimated Budget (KES)</label>
                  <input type="number" placeholder="e.g. 450000" value={form.estimated_budget} onChange={(e) => setForm({ ...form, estimated_budget: e.target.value })} className="input text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">Actual Expenses (KES)</label>
                  <input type="number" placeholder="e.g. 420000" value={form.actual_expenses} onChange={(e) => setForm({ ...form, actual_expenses: e.target.value })} className="input text-xs font-mono" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Project Description *</label>
                <textarea required placeholder="Detailed project overview..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input min-h-[60px] text-xs" />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Materials Used & System Specs</label>
                <input placeholder="e.g. Solvent-Free Epoxy Resin (3mm), Quartz Aggregate, Polyurethane Topcoat" value={form.materials_used} onChange={(e) => setForm({ ...form, materials_used: e.target.value })} className="input text-xs" />
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <textarea placeholder="Challenge faced..." value={form.challenge} onChange={(e) => setForm({ ...form, challenge: e.target.value })} className="input min-h-[50px] text-xs" />
                <textarea placeholder="Solution implemented..." value={form.solution} onChange={(e) => setForm({ ...form, solution: e.target.value })} className="input min-h-[50px] text-xs" />
                <textarea placeholder="Results & impact..." value={form.results} onChange={(e) => setForm({ ...form, results: e.target.value })} className="input min-h-[50px] text-xs" />
              </div>

              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="rounded text-primary-600 focus:ring-primary-500" />
                  <span className="text-xs font-semibold text-gray-700">Mark as Featured</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded text-primary-600 focus:ring-primary-500" />
                  <span className="text-xs font-semibold text-gray-700">Visible on Frontend</span>
                </label>
              </div>

              {editing && (
                <div className="pt-4 border-t border-gray-200">
                  <ProjectDocumentManager project={editing} />
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button type="button" onClick={resetForm} className="btn-secondary flex-1 text-xs">Cancel</button>
                <button type="submit" className="btn-primary flex-1 text-xs">{editing ? 'Update Project' : 'Create Project'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCsvModal && (
        <BulkCsvImportModal
          onClose={() => setShowCsvModal(false)}
          onSuccess={fetchProjects}
          existingProjectCount={projects.length}
        />
      )}

      {galleryProject && (
        <ProjectGalleryModal project={galleryProject} onClose={() => setGalleryProject(null)} />
      )}

      {/* Standalone Project Document Vault Modal */}
      {selectedDocProject && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-gray-200 relative">
            <button
              onClick={() => setSelectedDocProject(null)}
              className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="mb-4">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600">
                Project Document Management
              </span>
              <h2 className="font-bold text-lg text-gray-900">
                {selectedDocProject.title}
              </h2>
            </div>
            <ProjectDocumentManager project={selectedDocProject} />
          </div>
        </div>
      )}

      {/* Project Template Library Modal */}
      <ProjectTemplateLibrary
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelectTemplate={handleApplyTemplate}
      />
    </AdminLayout>
  );
}

function ProjectGalleryModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageType, setNewImageType] = useState<'before' | 'after' | 'progress' | 'other'>('after');
  const [newCaption, setNewCaption] = useState('');
  const [previewZoomUrl, setPreviewZoomUrl] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => { fetchImages(); }, [project.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchImages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('project_images')
      .select('*')
      .eq('project_id', project.id)
      .order('display_order');
    setImages(data || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newImageUrl) {
      toast({ title: 'Upload or select a photo first', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('project_images').insert({
      project_id: project.id,
      image_url: newImageUrl,
      image_type: newImageType,
      caption: newCaption || null,
      display_order: images.length,
    });
    if (error) {
      toast({ title: 'Failed to add photo', variant: 'destructive' });
      return;
    }
    setNewImageUrl('');
    setNewCaption('');
    toast({ title: 'Photo added to project gallery!' });
    await fetchImages();
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from('project_images').delete().eq('id', id);
    if (error) {
      toast({ title: 'Failed to remove photo', variant: 'destructive' });
      return;
    }
    await fetchImages();
  };

  const typeLabels: Record<string, string> = {
    before: 'Before',
    after: 'After',
    progress: 'In Progress',
    other: 'Other',
  };

  const badgeColors: Record<string, string> = {
    before: 'bg-amber-500 text-white',
    after: 'bg-emerald-600 text-white',
    progress: 'bg-blue-600 text-white',
    other: 'bg-gray-700 text-white',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold mb-1">
              <Sparkles className="w-3 h-3 text-primary-600" />
              <span>Project Builder</span>
            </div>
            <h2 className="font-bold text-lg text-gray-900">Gallery Builder - {project.title}</h2>
            <p className="text-xs text-gray-500">Manage high-resolution before/after and progress photos displayed on the frontend.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Gallery Photos */}
        {loading ? (
          <div className="text-center py-8 text-gray-400 text-sm">Loading gallery photos...</div>
        ) : (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Current Gallery ({images.length})
              </span>
              <span className="text-[11px] text-gray-400">Click any photo to zoom</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="relative group rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-slate-900 aspect-square cursor-pointer"
                  onClick={() => setPreviewZoomUrl(img.image_url)}
                >
                  <img
                    src={withFallback(img.image_url, getProjectPlaceholder())}
                    alt={img.caption || ''}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  
                  {/* Badge */}
                  <span className={`absolute top-1.5 left-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm ${badgeColors[img.image_type] || 'bg-black/60 text-white'}`}>
                    {typeLabels[img.image_type]}
                  </span>

                  {/* Zoom Overlay Icon */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn className="w-5 h-5 text-white" />
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(img.id);
                    }}
                    className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-md hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    title="Remove from gallery"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {img.caption && (
                    <p className="absolute bottom-0 inset-x-0 bg-black/75 backdrop-blur-sm text-white text-[11px] p-1.5 truncate">
                      {img.caption}
                    </p>
                  )}
                </div>
              ))}

              {images.length === 0 && (
                <div className="col-span-full text-center text-sm text-gray-400 py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Images className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                  <p className="font-medium text-gray-500">No project photos added yet.</p>
                  <p className="text-xs text-gray-400">Upload or select a photo below to build this project's gallery.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload & Thumbnail Preview Section */}
        <div className="border-t border-gray-200 pt-5 space-y-4">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-primary-600" />
            Add New Project Photo
          </h3>

          <ImageUpload
            label="1. Select or Upload Image"
            value={newImageUrl}
            onChange={setNewImageUrl}
            folder="projects"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                2. Image Category / Type
              </label>
              <select
                value={newImageType}
                onChange={(e) => setNewImageType(e.target.value as typeof newImageType)}
                className="input text-xs"
              >
                <option value="after">After (Completed Outcome)</option>
                <option value="before">Before (Pre-installation)</option>
                <option value="progress">In Progress (Installation Phase)</option>
                <option value="other">Other / Detail Shot</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                3. Caption (Optional)
              </label>
              <input
                placeholder="e.g., High-gloss chemical resistant topcoat"
                value={newCaption}
                onChange={(e) => setNewCaption(e.target.value)}
                className="input text-xs"
              />
            </div>
          </div>

          {/* Live Thumbnail Preview Box */}
          {newImageUrl && (
            <div className="p-3.5 rounded-xl bg-gray-900 text-white border border-gray-800 shadow-inner">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-800">
                <span className="text-xs font-bold text-primary-400 uppercase tracking-wider flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Live Thumbnail Quality Preview
                </span>
                <span className="text-[10px] text-gray-400">Matches client gallery appearance</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative w-full sm:w-48 aspect-video rounded-lg overflow-hidden bg-black border border-gray-700 group flex-shrink-0">
                  <img
                    src={newImageUrl}
                    alt="Live preview"
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded shadow ${badgeColors[newImageType]}`}>
                    {typeLabels[newImageType]}
                  </span>
                  {newCaption && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-sm text-white text-[10px] p-1.5 truncate">
                      {newCaption}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setPreviewZoomUrl(newImageUrl)}
                    className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded hover:bg-black"
                    title="Zoom inspect"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 text-xs text-gray-300 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Thumbnail Ready for Save</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-normal">
                    This photo will be displayed under <strong>{typeLabels[newImageType]}</strong> tab on the project gallery view.
                  </p>
                  {newCaption && (
                    <p className="text-[11px] text-gray-300 italic">
                      Caption: "{newCaption}"
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleAdd}
            disabled={!newImageUrl}
            className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <Plus className="w-4 h-4" /> Save Photo to Gallery
          </button>
        </div>
      </div>

      {/* Lightbox Zoom Inspector Modal */}
      {previewZoomUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setPreviewZoomUrl(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setPreviewZoomUrl(null)}
              className="absolute -top-10 right-0 text-white p-2 hover:text-primary-400"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewZoomUrl}
              alt="Zoomed project preview"
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-gray-800"
            />
          </div>
        </div>
      )}
    </div>
  );
}
