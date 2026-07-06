import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import type { Testimonial } from '@/lib/types';

export default function AdminTestimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', role: '', company: '', content: '', rating: 5, is_active: true });

  useEffect(() => { fetchTestimonials(); }, []);

  const fetchTestimonials = async () => {
    const { data } = await supabase.from('testimonials').select('*').order('display_order');
    setTestimonials(data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ name: '', role: '', company: '', content: '', rating: 5, is_active: true });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await supabase.from('testimonials').update(form).eq('id', editing.id);
    } else {
      await supabase.from('testimonials').insert(form);
    }
    resetForm();
    fetchTestimonials();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    await supabase.from('testimonials').delete().eq('id', id);
    fetchTestimonials();
  };

  return (
    <AdminLayout title="Testimonials">
      <div className="mb-4">
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Testimonial
        </button>
      </div>

      {loading ? <div className="text-center py-12">Loading...</div> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Rating</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {testimonials.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{t.name}</td>
                  <td className="px-6 py-4 text-sm">{t.role}{t.company && `, ${t.company}`}</td>
                  <td className="px-6 py-4 text-sm">{t.rating}/5</td>
                  <td className="px-6 py-4">
                    <button onClick={() => { setEditing(t); setForm({ ...t }); setShowForm(true); }} className="p-2"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(t.id)} className="p-2 text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">{editing ? 'Edit Testimonial' : 'Add Testimonial'}</h2>
              <button onClick={resetForm}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
              <input placeholder="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input" />
              <input placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="input" />
              <textarea required placeholder="Content *" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="input min-h-[80px]" />
              <select value={form.rating} onChange={(e) => setForm({ ...form, rating: parseInt(e.target.value) })} className="input">
                {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} Stars</option>)}
              </select>
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
