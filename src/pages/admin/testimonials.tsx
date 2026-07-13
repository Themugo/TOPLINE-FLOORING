import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, MessageSquareQuote, Star } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/ui/image-upload';
import type { Testimonial } from '@/lib/types';

export default function AdminTestimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState<{ name: string; role: string | null; company: string | null; content: string; avatar_url: string | null; rating: number; is_active: boolean }>({ name: '', role: '', company: '', content: '', avatar_url: '', rating: 5, is_active: true });

  useEffect(() => { fetchTestimonials(); }, []);

  const fetchTestimonials = async () => {
    setLoading(true);
    const { data } = await supabase.from('testimonials').select('*').order('display_order');
    setTestimonials(data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ name: '', role: '', company: '', content: '', avatar_url: '', rating: 5, is_active: true });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from('testimonials').update(form).eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Testimonial updated' });
      } else {
        const { error } = await supabase.from('testimonials').insert(form);
        if (error) throw error;
        toast({ title: 'Testimonial added' });
      }
      resetForm();
      await fetchTestimonials();
    } catch {
      toast({ title: 'Failed to save testimonial', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this testimonial?')) return;
    try {
      const { error } = await supabase.from('testimonials').delete().eq('id', id);
      if (error) throw error;
      await fetchTestimonials();
      toast({ title: 'Testimonial deleted' });
    } catch {
      toast({ title: 'Failed to delete testimonial', variant: 'destructive' });
    }
  };

  return (
    <AdminLayout title="Testimonials">
      <div className="mb-4">
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Testimonial
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-navy-400">Loading testimonials...</div>
      ) : testimonials.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <MessageSquareQuote className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-navy-500 mb-4">No testimonials yet.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">Add Your First Testimonial</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Name</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Role</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Rating</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {testimonials.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-navy-900">{t.name}</td>
                  <td className="px-6 py-4 text-sm text-navy-500">{t.role}{t.company && `, ${t.company}`}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-flex items-center gap-1 text-primary-600">
                      <Star className="w-3.5 h-3.5 fill-primary-500" /> {t.rating}/5
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => { setEditing(t); setForm({ ...t }); setShowForm(true); }} className="p-2 text-navy-500 hover:text-primary-600" title="Edit"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(t.id)} className="p-2 text-navy-500 hover:text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={resetForm}>
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg text-navy-900">{editing ? 'Edit Testimonial' : 'Add Testimonial'}</h2>
              <button onClick={resetForm}><X className="w-5 h-5 text-navy-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
              <input placeholder="Role" value={form.role || ''} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input" />
              <input placeholder="Company" value={form.company || ''} onChange={(e) => setForm({ ...form, company: e.target.value })} className="input" />
              <textarea required placeholder="Content *" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="input min-h-[80px]" />
              <select value={form.rating} onChange={(e) => setForm({ ...form, rating: parseInt(e.target.value) })} className="input">
                {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} Stars</option>)}
              </select>
              <ImageUpload
                value={form.avatar_url || ''}
                onChange={(url) => setForm({ ...form, avatar_url: url })}
                label="Avatar"
                folder="avatars"
              />
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
