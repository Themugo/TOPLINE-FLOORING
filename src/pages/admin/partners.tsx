import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Handshake } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/ui/image-upload';
import type { Partner } from '@/lib/types';

export default function AdminPartners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState<{ name: string; logo_url: string | null; website_url: string | null; is_active: boolean }>({ name: '', logo_url: '', website_url: '', is_active: true });

  useEffect(() => { fetchPartners(); }, []);

  const fetchPartners = async () => {
    setLoading(true);
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
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from('partners').update(form).eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Partner updated' });
      } else {
        const { error } = await supabase.from('partners').insert(form);
        if (error) throw error;
        toast({ title: 'Partner added' });
      }
      resetForm();
      await fetchPartners();
    } catch {
      toast({ title: 'Failed to save partner', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this partner?')) return;
    try {
      const { error } = await supabase.from('partners').delete().eq('id', id);
      if (error) throw error;
      await fetchPartners();
      toast({ title: 'Partner deleted' });
    } catch {
      toast({ title: 'Failed to delete partner', variant: 'destructive' });
    }
  };

  return (
    <AdminLayout title="Partners">
      <div className="mb-4">
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Partner
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-navy-400">Loading partners...</div>
      ) : partners.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Handshake className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-navy-500 mb-4">No partners yet.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">Add Your First Partner</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Name</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Website</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-navy-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {partners.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {p.logo_url && <img src={p.logo_url} alt="" className="h-8" />}
                      <span className="font-medium text-navy-900">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-navy-500">{p.website_url || '-'}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => { setEditing(p); setForm({ ...p }); setShowForm(true); }} className="p-2 text-navy-500 hover:text-primary-600" title="Edit"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 text-navy-500 hover:text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={resetForm}>
          <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg text-navy-900">{editing ? 'Edit Partner' : 'Add Partner'}</h2>
              <button onClick={resetForm}><X className="w-5 h-5 text-navy-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
              <ImageUpload
                value={form.logo_url || ''}
                onChange={(url) => setForm({ ...form, logo_url: url })}
                label="Logo"
                folder="partners"
              />
              <input placeholder="Website URL" value={form.website_url || ''} onChange={(e) => setForm({ ...form, website_url: e.target.value })} className="input" />
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
