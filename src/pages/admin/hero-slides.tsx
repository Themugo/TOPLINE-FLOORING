import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import type { HeroSlide } from '@/lib/types';

export default function AdminHeroSlides() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<HeroSlide | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
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
    if (editing) {
      await supabase.from('hero_slides').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editing.id);
    } else {
      await supabase.from('hero_slides').insert(form);
    }
    resetForm();
    fetchSlides();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    await supabase.from('hero_slides').delete().eq('id', id);
    fetchSlides();
  };

  return (
    <AdminLayout title="Hero Slides">
      <div className="mb-4">
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Slide
        </button>
      </div>

      {loading ? <div className="text-center py-12">Loading...</div> : (
        <div className="grid gap-4">
          {slides.map((slide) => (
            <div key={slide.id} className="bg-white rounded-xl p-4 border border-gray-200 flex gap-4">
              <img src={slide.image_url} alt="" className="w-32 h-20 object-cover rounded" />
              <div className="flex-1">
                <h3 className="font-medium">{slide.title}</h3>
                <p className="text-sm text-gray-500">{slide.subtitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditing(slide); setForm({ ...slide }); setShowForm(true); }} className="p-2"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(slide.id)} className="p-2 text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">{editing ? 'Edit Slide' : 'Add Slide'}</h2>
              <button onClick={resetForm}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" />
              <input placeholder="Subtitle" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="input" />
              <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input min-h-[60px]" />
              <input required placeholder="Image URL *" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="input" />
              <input placeholder="Button Text" value={form.button_text} onChange={(e) => setForm({ ...form, button_text: e.target.value })} className="input" />
              <input placeholder="Button Link" value={form.button_link} onChange={(e) => setForm({ ...form, button_link: e.target.value })} className="input" />
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                <span className="text-sm">Active</span>
              </label>
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
