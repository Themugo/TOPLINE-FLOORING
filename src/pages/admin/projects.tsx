import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Star, ExternalLink, Image } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { Project, ProjectImage } from '@/lib/types';

export default function AdminProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Project | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: '',
    client_name: '',
    service_type: '',
    category: '',
    location: '',
    description: '',
    challenge: '',
    solution: '',
    results: '',
    featured: false,
    is_active: true,
    project_date: '',
    completion_date: '',
    area_size: '',
  });

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('*').order('display_order');
    setProjects(data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ title: '', client_name: '', service_type: '', category: '', location: '', description: '', challenge: '', solution: '', results: '', featured: false, is_active: true, project_date: '', completion_date: '', area_size: '' });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-');
    const data = { ...form, slug, project_date: form.project_date || null, completion_date: form.completion_date || null };

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
      challenge: project.challenge || '',
      solution: project.solution || '',
      results: project.results || '',
      featured: project.featured,
      is_active: project.is_active,
      project_date: project.project_date || '',
      completion_date: project.completion_date || '',
      area_size: project.area_size || '',
    });
    setShowForm(true);
  };

  const toggleFeatured = async (id: string, current: boolean) => {
    await supabase.from('projects').update({ featured: !current }).eq('id', id);
    fetchProjects();
  };

  if (loading) return <AdminLayout title="Projects"><div className="text-center py-12">Loading...</div></AdminLayout>;

  return (
    <AdminLayout title="Projects / Portfolio">
      <div className="mb-4">
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Project
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Project</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {projects.map((project) => (
              <tr key={project.id} className={`hover:bg-gray-50 ${!project.is_active ? 'opacity-50' : ''}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {project.featured && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                    <div>
                      <p className="font-medium">{project.title}</p>
                      <p className="text-xs text-gray-500">{project.client_name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">{project.service_type}</td>
                <td className="px-6 py-4 text-sm">{project.location}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-1 rounded ${project.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {project.is_active ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => toggleFeatured(project.id, project.featured)} className="p-2"><Star className={`w-4 h-4 ${project.featured ? 'text-yellow-500 fill-yellow-500' : ''}`} /></button>
                  <button onClick={() => editProject(project)} className="p-2"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(project.id)} className="p-2 text-red-500"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 my-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">{editing ? 'Edit Project' : 'Add Project'}</h2>
              <button onClick={resetForm}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <input required placeholder="Project Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" />
                <input placeholder="Client Name" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className="input" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <input placeholder="Service Type (e.g., Industrial Flooring)" value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} className="input" />
                <input placeholder="Category (Industrial/Commercial/Residential)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input" />
              </div>
              <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input" />
              <div className="grid sm:grid-cols-3 gap-4">
                <input type="date" value={form.project_date} onChange={(e) => setForm({ ...form, project_date: e.target.value })} className="input" />
                <input type="date" value={form.completion_date} onChange={(e) => setForm({ ...form, completion_date: e.target.value })} className="input" />
                <input placeholder="Area Size (e.g., 5000 sqm)" value={form.area_size} onChange={(e) => setForm({ ...form, area_size: e.target.value })} className="input" />
              </div>
              <textarea required placeholder="Description *" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input min-h-[60px]" />
              <textarea placeholder="Challenge" value={form.challenge} onChange={(e) => setForm({ ...form, challenge: e.target.value })} className="input min-h-[60px]" />
              <textarea placeholder="Solution" value={form.solution} onChange={(e) => setForm({ ...form, solution: e.target.value })} className="input min-h-[60px]" />
              <textarea placeholder="Results/Outcomes" value={form.results} onChange={(e) => setForm({ ...form, results: e.target.value })} className="input min-h-[60px]" />
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
                  <span className="text-sm">Featured</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                  <span className="text-sm">Active</span>
                </label>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={resetForm} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
