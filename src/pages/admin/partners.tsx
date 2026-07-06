import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import type { Partner } from '@/lib/types';

export default function AdminPartners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', logo_url: '', website_url: '', is_active: true });

  useEffect(() => { fetchPartners(); }, []);

  const fetchPartners = async () => {
    const { data } = await supabase.from('partners').select('*').order('display_order');
    setPartners(data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ name: '', logo_url: '', website_url: '', is_active: true });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await supabase.from('partners').update(form).eq('id', editing.id);
    } else {
      await supabase.from('partners').insert(form);
    }
    resetForm();
    fetchPartners();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    await supabase.from('partners').delete().eq('id', id);
    fetchPartners();
  };

  return (
    <AdminLayout title="Partners">
      <div className="mb-4">
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Partner
        </button>
      </div>

      {loading ? <div className="text-center py-12">Loading...</div> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Website</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {partners.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {p.logo_url && <img src={p.logo_url} alt="" className="h-8" />}
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">{p.website_url || '-'}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => { setEditing(p); setForm({ ...p }); setShowForm(true); }} className="p-2"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 text-red-500"><Trash2 className="w-4 h-4" /></button>
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
              <h2 className="font-semibold text-lg">{editing ? 'Edit Partner' : 'Add Partner'}</h2>
              <button onClick={resetForm}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
              <input placeholder="Logo URL" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} className="input" />
              <input placeholder="Website URL" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} className="input" />
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
