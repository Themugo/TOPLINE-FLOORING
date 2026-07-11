import { useState } from 'react';
import { Plus, X, Pencil, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { useServices, Service } from '@/hooks/use-data';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/ui/image-upload';
import { getServicePlaceholder, withFallback } from '@/lib/placeholders';

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

const emptyForm = {
  name: '',
  description: '',
  short_description: '',
  image_url: '',
  icon: '',
  features: '',
  is_active: true,
};

export default function AdminServices() {
  const { services, loading, createService, updateService, deleteService } = useServices({ activeOnly: false });
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (service: Service) => {
    setEditing(service);
    setForm({
      name: service.name,
      description: service.description,
      short_description: service.short_description || '',
      image_url: service.image_url,
      icon: service.icon || '',
      features: (service.features || []).join('\n'),
      is_active: service.is_active,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        slug: slugify(form.name),
        description: form.description,
        short_description: form.short_description || undefined,
        image_url: form.image_url || getServicePlaceholder(form.name),
        icon: form.icon || undefined,
        features: form.features.split('\n').map((f) => f.trim()).filter(Boolean),
        is_active: form.is_active,
      };

      if (editing) {
        await updateService(editing.id, payload);
        toast({ title: 'Service updated' });
      } else {
        await createService({ ...payload, display_order: services.length });
        toast({ title: 'Service added' });
      }
      setShowForm(false);
    } catch {
      toast({ title: 'Failed to save service', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (service: Service) => {
    if (!confirm(`Delete "${service.name}"? This cannot be undone.`)) return;
    try {
      await deleteService(service.id);
      toast({ title: 'Service deleted' });
    } catch {
      toast({ title: 'Failed to delete service', variant: 'destructive' });
    }
  };

  const toggleActive = async (service: Service) => {
    try {
      await updateService(service.id, { is_active: !service.is_active });
    } catch {
      toast({ title: 'Failed to update service', variant: 'destructive' });
    }
  };

  return (
    <AdminLayout title="Services">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Manage the services shown on your homepage and Services page - photos, descriptions, and feature lists.
        </p>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 flex-shrink-0">
          <Plus className="w-4 h-4" />
          Add Service
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading services...</div>
      ) : services.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
          <p className="text-gray-500 mb-4">No services yet.</p>
          <button onClick={openCreate} className="btn-primary">Add Your First Service</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <div key={service.id} className={`card overflow-hidden ${!service.is_active ? 'opacity-50' : ''}`}>
              <div className="aspect-video overflow-hidden bg-gray-100">
                <img
                  src={withFallback(service.image_url, getServicePlaceholder(service.name))}
                  alt={service.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-navy-900">{service.name}</h3>
                  <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </div>
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{service.short_description || service.description}</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(service)} className="p-2 text-gray-600 hover:text-primary-600" title="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => toggleActive(service)} className="p-2 text-gray-600 hover:text-primary-600" title={service.is_active ? 'Hide from site' : 'Show on site'}>
                    {service.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleDelete(service)} className="p-2 text-gray-600 hover:text-red-600 ml-auto" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg text-navy-900">{editing ? 'Edit Service' : 'Add Service'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input required placeholder="Service name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input placeholder="Short description (shown in cards)" className="input" value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} />
              <textarea required placeholder="Full description" className="input min-h-[100px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <ImageUpload label="Service Photo" value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} folder="services" />
              <textarea
                placeholder={'Features (one per line)\ne.g.\nCertified installers\n10-year warranty'}
                className="input min-h-[80px]"
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
              />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Visible on site
              </label>
              <button type="submit" disabled={saving} className="btn-primary w-full">
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Service'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
