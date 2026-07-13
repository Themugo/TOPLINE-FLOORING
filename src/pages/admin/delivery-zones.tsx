import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { formatKES } from '@/lib/utils';
import type { DeliveryZone } from '@/lib/types';

export default function AdminDeliveryZones() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DeliveryZone | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    zone_name: '',
    regions: '',
    base_charge: 0,
    free_delivery_minimum: 0,
    estimated_days: '',
    is_active: true,
    display_order: 0,
  });

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    const { data } = await supabase.from('delivery_zones').select('*').order('display_order');
    setZones(data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ zone_name: '', regions: '', base_charge: 0, free_delivery_minimum: 0, estimated_days: '', is_active: true, display_order: 0 });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      zone_name: form.zone_name,
      regions: form.regions.split(',').map(r => r.trim()).filter(Boolean),
      base_charge: form.base_charge,
      free_delivery_minimum: form.free_delivery_minimum || null,
      estimated_days: form.estimated_days,
      is_active: form.is_active,
      display_order: form.display_order,
    };

    if (editing) {
      await supabase.from('delivery_zones').update(data).eq('id', editing.id);
    } else {
      await supabase.from('delivery_zones').insert(data);
    }
    resetForm();
    fetchZones();
    toast({ title: editing ? 'Zone updated' : 'Zone created' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    await supabase.from('delivery_zones').delete().eq('id', id);
    fetchZones();
  };

  const editZone = (zone: DeliveryZone) => {
    setEditing(zone);
    setForm({
      zone_name: zone.zone_name,
      regions: zone.regions.join(', '),
      base_charge: zone.base_charge,
      free_delivery_minimum: zone.free_delivery_minimum || 0,
      estimated_days: zone.estimated_days,
      is_active: zone.is_active,
      display_order: zone.display_order,
    });
    setShowForm(true);
  };

  if (loading) return <AdminLayout title="Delivery Zones"><div className="text-center py-12">Loading...</div></AdminLayout>;

  return (
    <AdminLayout title="Delivery Zones">
      <div className="mb-4">
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Zone
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Zone</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Regions</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Charge</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Free Above</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Est. Days</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {zones.map((zone) => (
              <tr key={zone.id} className={`hover:bg-gray-50 ${!zone.is_active ? 'opacity-50' : ''}`}>
                <td className="px-6 py-4 font-medium">{zone.zone_name}</td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{zone.regions.join(', ')}</td>
                <td className="px-6 py-4 text-sm">{formatKES(zone.base_charge)}</td>
                <td className="px-6 py-4 text-sm">{zone.free_delivery_minimum ? formatKES(zone.free_delivery_minimum) : '-'}</td>
                <td className="px-6 py-4 text-sm">{zone.estimated_days}</td>
                <td className="px-6 py-4">
                  <button onClick={() => editZone(zone)} className="p-2"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(zone.id)} className="p-2 text-red-500"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">{editing ? 'Edit Zone' : 'Add Zone'}</h2>
              <button onClick={resetForm}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required placeholder="Zone Name *" value={form.zone_name} onChange={(e) => setForm({ ...form, zone_name: e.target.value })} className="input" />
              <textarea placeholder="Regions (comma separated) *" value={form.regions} onChange={(e) => setForm({ ...form, regions: e.target.value })} className="input min-h-[60px]" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Charge (KES)</label>
                  <input type="number" required value={form.base_charge} onChange={(e) => setForm({ ...form, base_charge: parseFloat(e.target.value) })} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Free Above (KES)</label>
                  <input type="number" value={form.free_delivery_minimum} onChange={(e) => setForm({ ...form, free_delivery_minimum: parseFloat(e.target.value) })} className="input" />
                </div>
              </div>
              <input placeholder="Estimated Days (e.g., 1-2 days)" value={form.estimated_days} onChange={(e) => setForm({ ...form, estimated_days: e.target.value })} className="input" />
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
