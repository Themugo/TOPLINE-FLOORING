import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { Promotion } from '@/lib/types';

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    promo_type: 'banner' as Promotion['promo_type'],
    title: '',
    subtitle: '',
    description: '',
    image_url: '',
    link_url: '',
    link_text: '',
    discount_percent: 0,
    discount_amount: 0,
    start_date: '',
    end_date: '',
    is_active: true,
    position: 'top',
    background_color: '',
    text_color: '',
  });

  useEffect(() => { fetchPromotions(); }, []);

  const fetchPromotions = async () => {
    const { data } = await supabase.from('promotions').select('*').order('display_order');
    setPromotions(data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ promo_type: 'banner', title: '', subtitle: '', description: '', image_url: '', link_url: '', link_text: '', discount_percent: 0, discount_amount: 0, start_date: '', end_date: '', is_active: true, position: 'top', background_color: '', text_color: '' });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...form,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      discount_percent: form.discount_percent || null,
      discount_amount: form.discount_amount || null,
    };

    if (editing) {
      await supabase.from('promotions').update({ ...data, updated_at: new Date().toISOString() }).eq('id', editing.id);
    } else {
      await supabase.from('promotions').insert(data);
    }
    resetForm();
    fetchPromotions();
    toast({ title: editing ? 'Promotion updated' : 'Promotion created' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    await supabase.from('promotions').delete().eq('id', id);
    fetchPromotions();
  };

  const editPromo = (promo: Promotion) => {
    setEditing(promo);
    setForm({
      promo_type: promo.promo_type,
      title: promo.title,
      subtitle: promo.subtitle || '',
      description: promo.description || '',
      image_url: promo.image_url || '',
      link_url: promo.link_url || '',
      link_text: promo.link_text || '',
      discount_percent: promo.discount_percent || 0,
      discount_amount: promo.discount_amount || 0,
      start_date: promo.start_date || '',
      end_date: promo.end_date || '',
      is_active: promo.is_active,
      position: promo.position,
      background_color: promo.background_color || '',
      text_color: promo.text_color || '',
    });
    setShowForm(true);
  };

  const typeLabels: Record<string, string> = { banner: 'Banner', flash_sale: 'Flash Sale', featured: 'Featured', announcement: 'Announcement', popup: 'Popup' };

  if (loading) return <AdminLayout title="Promotions"><div className="text-center py-12">Loading...</div></AdminLayout>;

  return (
    <AdminLayout title="Promotions">
      <div className="mb-4">
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Promotion
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Promotion</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Position</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Valid</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {promotions.map((promo) => (
              <tr key={promo.id} className={`hover:bg-gray-50 ${!promo.is_active ? 'opacity-50' : ''}`}>
                <td className="px-6 py-4">
                  <p className="font-medium">{promo.title}</p>
                  <p className="text-xs text-gray-500">{promo.subtitle}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{typeLabels[promo.promo_type]}</span>
                </td>
                <td className="px-6 py-4 text-sm">{promo.position}</td>
                <td className="px-6 py-4 text-sm">
                  {promo.start_date ? new Date(promo.start_date).toLocaleDateString() : 'Now'}
                  {promo.end_date && ` - ${new Date(promo.end_date).toLocaleDateString()}`}
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => editPromo(promo)} className="p-2"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(promo.id)} className="p-2 text-red-500"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 my-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">{editing ? 'Edit Promotion' : 'Add Promotion'}</h2>
              <button onClick={resetForm}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <select value={form.promo_type} onChange={(e) => setForm({ ...form, promo_type: e.target.value as 'banner' | 'announcement' | 'flash_sale' | 'featured' })} className="input">
                <option value="banner">Banner</option>
                <option value="announcement">Announcement</option>
                <option value="flash_sale">Flash Sale</option>
                <option value="featured">Featured</option>
                <option value="popup">Popup</option>
              </select>
              <input required placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" />
              <input placeholder="Subtitle" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="input" />
              <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input min-h-[60px]" />
              <input placeholder="Image URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="input" />
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Link URL" value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} className="input" />
                <input placeholder="Link Text (e.g., Shop Now)" value={form.link_text} onChange={(e) => setForm({ ...form, link_text: e.target.value })} className="input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
                  <input type="number" min={0} max={100} value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: parseInt(e.target.value) })} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="input">
                    <option value="top">Top Bar</option>
                    <option value="home">Homepage</option>
                    <option value="product">Product Pages</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="input" />
                </div>
              </div>
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
