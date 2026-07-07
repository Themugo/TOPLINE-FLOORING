import { useState } from 'react';
import { X, Phone, Mail, MessageSquare, MapPin, DollarSign, User, Building2 } from 'lucide-react';
import type { Lead } from '@/lib/types';

interface LeadFormProps {
  lead?: Lead;
  onSubmit: (data: Partial<Lead>) => void;
  onCancel: () => void;
}

const SOURCES = ['google', 'facebook', 'referral', 'walk-in', 'website', 'whatsapp', 'phone', 'email', 'other'] as const;
const STAGES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'on_hold'] as const;
const COMMUNICATION_METHODS = ['phone', 'email', 'whatsapp'] as const;

export function LeadForm({ lead, onSubmit, onCancel }: LeadFormProps) {
  const [formData, setFormData] = useState<Partial<Lead>>({
    customer_name: lead?.customer_name || '',
    company_name: lead?.company_name || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    preferred_contact_method: lead?.preferred_contact_method || 'phone',
    source: lead?.source || 'website',
    budget_range: lead?.budget_range || '',
    project_location: lead?.project_location || '',
    project_address: lead?.project_address || '',
    lead_stage: lead?.lead_stage || 'new',
    follow_up_date: lead?.follow_up_date || '',
    follow_up_notes: lead?.follow_up_notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl font-bold text-navy-900">
          {lead ? 'Edit Lead' : 'Add New Lead'}
        </h2>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="font-semibold text-navy-900 flex items-center gap-2">
            <User className="w-4 h-4" />
            Contact Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                required
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.company_name || ''}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Acme Corporation"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="+254 7XX XXX XXX"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="john@example.com"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Contact Method
            </label>
            <div className="flex gap-2">
              {COMMUNICATION_METHODS.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setFormData({ ...formData, preferred_contact_method: method })}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                    formData.preferred_contact_method === method
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {method === 'phone' && <Phone className="w-4 h-4" />}
                  {method === 'email' && <Mail className="w-4 h-4" />}
                  {method === 'whatsapp' && <MessageSquare className="w-4 h-4" />}
                  <span className="capitalize">{method}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lead Details */}
        <div className="space-y-4">
          <h3 className="font-semibold text-navy-900 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Lead Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source
              </label>
              <select
                value={formData.source || 'website'}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {source.charAt(0).toUpperCase() + source.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lead Stage
              </label>
              <select
                value={formData.lead_stage}
                onChange={(e) => setFormData({ ...formData, lead_stage: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage.charAt(0).toUpperCase() + stage.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget Range
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.budget_range || ''}
                  onChange={(e) => setFormData({ ...formData, budget_range: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="10000-50000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Follow-up Date
              </label>
              <input
                type="date"
                value={formData.follow_up_date || ''}
                onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Location
            </label>
            <input
              type="text"
              value={formData.project_location || ''}
              onChange={(e) => setFormData({ ...formData, project_location: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Nairobi, Kenya"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Address
            </label>
            <input
              type="text"
              value={formData.project_address || ''}
              onChange={(e) => setFormData({ ...formData, project_address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="123 Main Street, Westlands"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Follow-up Notes
            </label>
            <textarea
              value={formData.follow_up_notes || ''}
              onChange={(e) => setFormData({ ...formData, follow_up_notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Notes about follow-up actions..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            {lead ? 'Update Lead' : 'Create Lead'}
          </button>
        </div>
      </form>
    </div>
  );
}
