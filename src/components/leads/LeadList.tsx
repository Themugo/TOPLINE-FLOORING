import { useState } from 'react';
import { Phone, Mail, MapPin, Calendar, MoreVertical, Filter, Search, Plus } from 'lucide-react';
import type { Lead } from '@/lib/types';

interface LeadListProps {
  leads: Lead[];
  loading?: boolean;
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
  onAddNew: () => void;
}

const STAGE_COLORS = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-purple-100 text-purple-700',
  qualified: 'bg-green-100 text-green-700',
  proposal: 'bg-yellow-100 text-yellow-700',
  negotiation: 'bg-orange-100 text-orange-700',
  won: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-red-100 text-red-700',
  on_hold: 'bg-gray-100 text-gray-700',
};

export function LeadList({ leads, loading, onEdit, onDelete, onAddNew }: LeadListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = 
      lead.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStage = stageFilter === 'all' || lead.lead_stage === stageFilter;
    
    return matchesSearch && matchesStage;
  });

  const stages = ['all', 'new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'on_hold'];

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-navy-900">Leads</h2>
          <p className="text-sm text-gray-500">Manage and track all leads</p>
        </div>
        <button
          onClick={onAddNew}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Lead
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {stages.map((stage) => (
              <option key={stage} value={stage}>
                {stage === 'all' ? 'All Stages' : stage.charAt(0).toUpperCase() + stage.slice(1).replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Leads Table */}
      {filteredLeads.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 mb-2">No leads found</p>
          <p className="text-sm text-gray-400">
            {searchQuery || stageFilter !== 'all' ? 'Try adjusting your filters' : 'Add your first lead to get started'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lead
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Follow-up
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-navy-900">{lead.customer_name}</p>
                        {lead.company_name && (
                          <p className="text-sm text-gray-500">{lead.company_name}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">{lead.lead_number}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {lead.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-3 h-3" />
                            <span>{lead.phone}</span>
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-3 h-3" />
                            <span className="truncate max-w-[150px]">{lead.email}</span>
                          </div>
                        )}
                        {lead.project_location && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate max-w-[150px]">{lead.project_location}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 capitalize">
                        {lead.source?.replace('_', ' ') || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${STAGE_COLORS[lead.lead_stage as keyof typeof STAGE_COLORS]}`}>
                        {lead.lead_stage.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {lead.budget_range ? `KES ${lead.budget_range}` : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {lead.follow_up_date ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(lead.follow_up_date).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative">
                        <button
                          onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          aria-label="More options"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                        {selectedLead?.id === lead.id && (
                          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                            <button
                              onClick={() => {
                                onEdit(lead);
                                setSelectedLead(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this lead?')) {
                                  onDelete(lead.id);
                                  setSelectedLead(null);
                                }
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <p>Showing {filteredLeads.length} of {leads.length} leads</p>
        <div className="flex gap-4">
          {stages.slice(1).map((stage) => {
            const count = leads.filter(l => l.lead_stage === stage).length;
            return count > 0 ? (
              <span key={stage} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${STAGE_COLORS[stage as keyof typeof STAGE_COLORS].split(' ')[0]}`} />
                <span className="capitalize">{stage.replace('_', ' ')}</span>
                <span>({count})</span>
              </span>
            ) : null;
          })}
        </div>
      </div>
    </div>
  );
}
