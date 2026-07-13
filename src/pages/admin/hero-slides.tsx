import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Image as ImageIcon } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/ui/image-upload';
import type { HeroSlide } from '@/lib/types';

export default function AdminHeroSlides() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<HeroSlide | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState<{
    title: string;
    subtitle: string | null;
    description: string | null;
    image_url: string;
    button_text: string | null;
    button_link: string | null;
    display_order: number;
    is_active: boolean;
  }>({
    title: '',
    subtitle: '',
    description: '',
    image_url: '',
    button_text: '',
    button_link: '',
    display_order: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchSlides();
  }, []);

  const fetchSlides = async () => {
    setLoading(true);
    const { data } = await supabase.from('hero_slides').select('*').order('display_order');
    setSlides(data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ title: '', subtitle: '', description: '', image_url: '', button_text: '', button_link: '', display_order: 0, is_active: true });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.image_url) {
      toast({ title: 'Please add a slide image', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from('hero_slides').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Slide updated' });
      } else {
        const { error } = await supabase.from('hero_slides').insert(form);
        if (error) throw error;
        toast({ title: 'Slide added' });
      }
      resetForm();
      await fetchSlides();
    } catch {
      toast({ title: 'Failed to save slide', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this slide?')) return;
    try {
      const { error } = await supabase.from('hero_slides').delete().eq('id', id);
      if (error) throw error;
      await fetchSlides();
      toast({ title: 'Slide deleted' });
    } catch {
      toast({ title: 'Failed to delete slide', variant: 'destructive' });
    }
  };

  return (
    <AdminLayout title="Hero Slides">
      <div className="mb-4">
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Slide
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-navy-400">Loading slides...</div>
      ) : slides.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-navy-500 mb-4">No hero slides yet.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">Add Your First Slide</button>
        </div>
      ) : (
        <div className="grid gap-4">
          {slides.map((slide) => (
            <div key={slide.id} className={`bg-white rounded-xl p-4 border border-gray-200 flex gap-4 ${!slide.is_active ? 'opacity-60' : ''}`}>
              <img src={slide.image_url} alt="" className="w-32 h-20 object-cover rounded flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-navy-900 truncate">{slide.title}</h3>
                <p className="text-sm text-navy-400 truncate">{slide.subtitle}</p>
                {!slide.is_active && <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-navy-500">Hidden</span>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => { setEditing(slide); setForm({ ...slide }); setShowForm(true); }} className="p-2 text-navy-500 hover:text-primary-600" title="Edit"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(slide.id)} className="p-2 text-navy-500 hover:text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={resetForm}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg text-navy-900">{editing ? 'Edit Slide' : 'Add Slide'}</h2>
              <button onClick={resetForm}><X className="w-5 h-5 text-navy-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" />
              <input placeholder="Subtitle" value={form.subtitle || ''} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="input" />
              <textarea placeholder="Description" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input min-h-[60px]" />
              <ImageUpload
                value={form.image_url || ''}
                onChange={(url) => setForm({ ...form, image_url: url })}
                label="Slide Image"
                folder="hero-slides"
              />
              <input placeholder="Button Text" value={form.button_text || ''} onChange={(e) => setForm({ ...form, button_text: e.target.value })} className="input" />
              <input placeholder="Button Link" value={form.button_link || ''} onChange={(e) => setForm({ ...form, button_link: e.target.value })} className="input" />
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                <span className="text-sm text-navy-700">Active</span>
              </label>
              <div className="flex gap-3">
                <button type="button" onClick={resetForm} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
