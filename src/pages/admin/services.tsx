import { useState } from 'react';
import { Plus, X, Pencil, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { useServices } from '@/hooks/use-data';
import type { Service } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/ui/image-upload';
import { getServicePlaceholder, withFallback } from '@/lib/placeholders';

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Unique slug among known services; stable fallback when the name has no latin characters. */
function uniqueSlug(name: string, existing: Service[], excludeId?: string): string {
  const base = (slugify(name) || 'service').slice(0, 120);
  const taken = new Set(existing.filter((s) => s.id !== excludeId).map((s) => s.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

function describeError(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { message?: string; code?: string };
    if (e.code === '23505') return 'A service with this name/slug already exists. Use a different name.';
    if (e.code === '42501' || e.message?.toLowerCase().includes('row-level security'))
      return 'You do not have permission to manage services.';
    if (e.message) return e.message;
  }
  return 'Unexpected error';
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
  const { services, loading, error: loadError, refetch, createService, updateService, deleteService } = useServices({ activeOnly: false });
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
    if (saving) return;
    const name = form.name.trim();
    if (!name) {
      toast({ title: 'Service name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name,
        // Existing slugs are kept on edit so public /service/:slug URLs do not break.
        slug: editing ? editing.slug : uniqueSlug(name, services),
        description: form.description.trim(),
        short_description: form.short_description.trim() || null,
        image_url: form.image_url,
        icon: form.icon.trim() || null,
        features: form.features.split('\n').map((f) => f.trim()).filter(Boolean),
        is_active: form.is_active,
      };

      if (editing) {
        await updateService(editing.id, payload);
        toast({ title: 'Service updated' });
      } else {
        const nextOrder = services.reduce((max, s) => Math.max(max, s.display_order ?? 0), -1) + 1;
        await createService({ ...payload, display_order: nextOrder });
        toast({ title: 'Service added' });
      }
      setShowForm(false);
    } catch (err) {
      toast({ title: 'Failed to save service', description: describeError(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (service: Service) => {
    if (!confirm(`Remove "${service.name}" from the service catalogue?`)) return;
    try {
      await deleteService(service.id);
      toast({ title: 'Service deleted' });
    } catch (err) {
      toast({ title: 'Failed to delete service', description: describeError(err), variant: 'destructive' });
    }
  };

  const toggleActive = async (service: Service) => {
    try {
      await updateService(service.id, { is_active: !service.is_active });
      toast({
        title: service.is_active ? 'Service hidden from website' : 'Service published on website',
        description: service.is_active ? 'Customers will no longer see this service.' : 'Customers can now see this service.',
      });
    } catch (err) {
      toast({ title: 'Failed to update service', description: describeError(err), variant: 'destructive' });
    }
  };

  return (
    <AdminLayout title="Services" subtitle="Manage the services customers see on the website and use when requesting work.">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Manage the services shown on your website. Keep the name, photo, description and customer-facing benefits clear.
        </p>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 flex-shrink-0">
          <Plus className="w-4 h-4" />
          Add service
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading services...</div>
      ) : loadError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-sm font-semibold text-red-700 mb-1">Could not load services</p>
          <p className="text-xs text-red-600 mb-3">{loadError}</p>
          <button onClick={() => void refetch()} className="btn-secondary text-xs">Retry</button>
        </div>
      ) : services.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
          <p className="text-gray-500 mb-4">No services yet.</p>
          <button onClick={openCreate} className="btn-primary">Add your first service</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <div key={service.id} className={`card overflow-hidden ${!service.is_active ? 'opacity-50' : ''}`}>
              <div className="aspect-video overflow-hidden bg-gray-100">
                <img
                  src={withFallback(service.image_url, getServicePlaceholder(service.name))}
                  alt={service.name}
                  loading="lazy"
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
              <h2 className="font-display font-bold text-lg text-navy-900">{editing ? 'Edit Service' : 'Add service'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input required placeholder="Service name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input placeholder="Short description (shown in cards)" className="input" value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} />
              <textarea required placeholder="Full description" className="input min-h-[100px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <ImageUpload label="Service Photo" value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} folder="services" />
              <textarea
                placeholder={'Features (one per line)\ne.g.\nSite preparation\nProfessional installation'}
                className="input min-h-[80px]"
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
              />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Visible on site
              </label>
              <button type="submit" disabled={saving} className="btn-primary w-full">
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add service'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
