import { AdminLayout } from './dashboard';
import { useQuotations } from '@/hooks/use-data';
import { formatDateTime } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Eye, X } from 'lucide-react';
import { useState } from 'react';
import type { Quotation } from '@/lib/types';

export default function AdminQuotations() {
  const { quotations, loading, refetch } = useQuotations();
  const [selected, setSelected] = useState<Quotation | null>(null);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('quotations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) refetch();
  };

  const statusColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700',
    contacted: 'bg-yellow-100 text-yellow-700',
    quoted: 'bg-purple-100 text-purple-700',
    won: 'bg-green-100 text-green-700',
    lost: 'bg-red-100 text-red-700',
  };

  return (
    <AdminLayout title="Quotations">
      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : quotations.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
          <p className="text-gray-500">No quotation requests yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {quotations.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium">{q.name}</p>
                    <p className="text-xs text-gray-500">{q.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm">{q.project_type || '-'}</p>
                    {q.area_size && <p className="text-xs text-gray-500">{q.area_size}</p>}
                  </td>
                  <td className="px-6 py-4 text-sm">{q.location || '-'}</td>
                  <td className="px-6 py-4">
                    <select
                      value={q.status}
                      onChange={(e) => updateStatus(q.id, e.target.value)}
                      className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[q.status]}`}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="quoted">Quoted</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDateTime(q.created_at)}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => setSelected(q)} className="p-2 text-gray-600 hover:text-gray-900">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">Quotation Details</h2>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div><span className="text-gray-500">Name:</span> <span className="font-medium">{selected.name}</span></div>
              <div><span className="text-gray-500">Email:</span> {selected.email}</div>
              <div><span className="text-gray-500">Phone:</span> {selected.phone}</div>
              {selected.company && <div><span className="text-gray-500">Company:</span> {selected.company}</div>}
              <div><span className="text-gray-500">Project Type:</span> {selected.project_type || '-'}</div>
              <div><span className="text-gray-500">Area Size:</span> {selected.area_size || '-'}</div>
              <div><span className="text-gray-500">Location:</span> {selected.location || '-'}</div>
              <div className="pt-2"><span className="text-gray-500">Message:</span></div>
              <p className="bg-gray-50 p-3 rounded">{selected.message || '-'}</p>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
