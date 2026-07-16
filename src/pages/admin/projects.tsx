import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Star, Images } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/ui/image-upload';
import { getProjectPlaceholder, withFallback } from '@/lib/placeholders';
import type { Project, ProjectImage } from '@/lib/types';

export default function AdminProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Project | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [galleryProject, setGalleryProject] = useState<Project | null>(null);
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
        <div className="overflow-x-auto">
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
                  <button onClick={() => setGalleryProject(project)} className="p-2" title="Manage Photos"><Images className="w-4 h-4" /></button>
                  <button onClick={() => editProject(project)} className="p-2"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(project.id)} className="p-2 text-red-500"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
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
      {galleryProject && (
        <ProjectGalleryModal project={galleryProject} onClose={() => setGalleryProject(null)} />
      )}
    </AdminLayout>
  );
}

function ProjectGalleryModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageType, setNewImageType] = useState<'before' | 'after' | 'progress' | 'other'>('after');
  const [newCaption, setNewCaption] = useState('');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="font-semibold text-lg">Photos - {project.title}</h2>
            <p className="text-xs text-gray-500">Before/after and progress photos shown on the Portfolio page.</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading photos...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {images.map((img) => (
              <div key={img.id} className="relative group rounded-lg overflow-hidden border border-gray-200">
                <img src={withFallback(img.image_url, getProjectPlaceholder())} alt={img.caption || ''} className="w-full aspect-square object-cover" />
                <span className="absolute top-1 left-1 text-[10px] font-medium bg-black/60 text-white px-1.5 py-0.5 rounded">
                  {typeLabels[img.image_type]}
                </span>
                <button
                  onClick={() => handleRemove(img.id)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
                {img.caption && (
                  <p className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] p-1 truncate">{img.caption}</p>
                )}
              </div>
            ))}
            {images.length === 0 && (
              <p className="col-span-full text-center text-sm text-gray-400 py-6">No photos yet - add the first one below.</p>
            )}
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 space-y-3">
          <ImageUpload label="Add a Photo" value={newImageUrl} onChange={setNewImageUrl} folder="projects" />
          <div className="grid grid-cols-2 gap-3">
            <select value={newImageType} onChange={(e) => setNewImageType(e.target.value as typeof newImageType)} className="input">
              <option value="before">Before</option>
              <option value="after">After</option>
              <option value="progress">In Progress</option>
              <option value="other">Other</option>
            </select>
            <input placeholder="Caption (optional)" value={newCaption} onChange={(e) => setNewCaption(e.target.value)} className="input" />
          </div>
          <button onClick={handleAdd} className="btn-primary w-full flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Add to Gallery
          </button>
        </div>
      </div>
    </div>
  );
}
