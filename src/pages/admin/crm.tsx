import { useState } from 'react';
import { Plus, X, Phone, Mail, Building2, Clock, CheckCircle2, ArrowRight, Trash2 } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { useLeads, useLeadNotes, useLeadReminders } from '@/hooks/use-data';
import { useToast } from '@/hooks/use-toast';
import type { Lead, LeadStatus } from '@/lib/types';
import { formatKES } from '@/lib/utils';

const PIPELINE: { status: LeadStatus; label: string; color: string }[] = [
  { status: 'new', label: 'New', color: 'bg-navy-100 text-navy-700' },
  { status: 'contacted', label: 'Contacted', color: 'bg-accent-100 text-accent-700' },
  { status: 'qualified', label: 'Qualified', color: 'bg-primary-100 text-primary-700' },
  { status: 'proposal', label: 'Proposal Sent', color: 'bg-primary-200 text-primary-800' },
  { status: 'negotiating', label: 'Negotiating', color: 'bg-primary-300 text-primary-900' },
  { status: 'won', label: 'Won', color: 'bg-green-100 text-green-700' },
  { status: 'lost', label: 'Lost', color: 'bg-red-100 text-red-700' },
];

const emptyForm = { name: '', email: '', phone: '', company: '', source: 'manual', estimated_value: '' };

export default function AdminCRM() {
  const { leads, loading, createLead, updateLead, deleteLead, convertLead } = useLeads();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createLead({
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        company: form.company || null,
        source: form.source,
        estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
      });
      toast({ title: 'Lead added' });
      setForm(emptyForm);
      setShowForm(false);
    } catch {
      toast({ title: 'Failed to add lead', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const moveLead = async (lead: Lead, status: LeadStatus) => {
    try {
      await updateLead(lead.id, { status });
    } catch {
      toast({ title: 'Failed to update lead', variant: 'destructive' });
    }
  };

  const handleConvert = async (lead: Lead) => {
    if (!confirm(`Convert "${lead.name}" to a customer? This creates a real customer record.`)) return;
    try {
      await convertLead(lead.id);
      toast({ title: 'Lead converted to customer' });
      setSelectedLead(null);
    } catch {
      toast({ title: 'Failed to convert lead', variant: 'destructive' });
    }
  };

  const handleDelete = async (lead: Lead) => {
    if (!confirm(`Delete lead "${lead.name}"? This cannot be undone.`)) return;
    try {
      await deleteLead(lead.id);
      setSelectedLead(null);
    } catch {
      toast({ title: 'Failed to delete lead', variant: 'destructive' });
    }
  };

  const totalPipelineValue = leads
    .filter((l) => !['won', 'lost'].includes(l.status))
    .reduce((sum, l) => sum + (l.estimated_value || 0), 0);

  return (
    <AdminLayout title="CRM / Leads">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-6">
          <div>
            <p className="text-sm text-gray-500">Open pipeline value</p>
            <p className="text-2xl font-display font-bold text-navy-900">{formatKES(totalPipelineValue)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total leads</p>
            <p className="text-2xl font-display font-bold text-navy-900">{leads.length}</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 w-fit">
          <Plus className="w-4 h-4" />
          Add Lead
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading leads...</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE.map((col) => {
            const colLeads = leads.filter((l) => l.status === col.status);
            return (
              <div key={col.status} className="flex-shrink-0 w-72">
                <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg ${col.color}`}>
                  <span className="text-sm font-semibold">{col.label}</span>
                  <span className="text-xs font-medium bg-white/60 px-2 py-0.5 rounded-full">{colLeads.length}</span>
                </div>
                <div className="bg-navy-50/50 rounded-b-lg p-2 space-y-2 min-h-[200px]">
                  {colLeads.map((lead) => (
                    <button
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="w-full text-left card p-3 hover:shadow-premium-lg transition-shadow"
                    >
                      <p className="font-medium text-navy-900 text-sm">{lead.name}</p>
                      {lead.company && <p className="text-xs text-gray-500">{lead.company}</p>}
                      {lead.estimated_value != null && (
                        <p className="text-sm font-semibold text-primary-600 mt-1">{formatKES(lead.estimated_value)}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                        {lead.phone && <Phone className="w-3 h-3" />}
                        {lead.email && <Mail className="w-3 h-3" />}
                      </div>
                    </button>
                  ))}
                  {colLeads.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-6">No leads here</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Lead Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg text-navy-900">Add Lead</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <input required placeholder="Name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input placeholder="Company" className="input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              <input placeholder="Phone" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input placeholder="Email" type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input placeholder="Estimated value (KES)" type="number" className="input" value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} />
              <select className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                <option value="manual">Manual entry</option>
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="phone">Phone call</option>
                <option value="walk-in">Walk-in</option>
              </select>
              <button type="submit" disabled={saving} className="btn-primary w-full">
                {saving ? 'Adding...' : 'Add Lead'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Lead Detail Drawer */}
      {selectedLead && (
        <LeadDetailDrawer
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onMove={moveLead}
          onConvert={handleConvert}
          onDelete={handleDelete}
        />
      )}
    </AdminLayout>
  );
}

function LeadDetailDrawer({
  lead,
  onClose,
  onMove,
  onConvert,
  onDelete,
}: {
  lead: Lead;
  onClose: () => void;
  onMove: (lead: Lead, status: LeadStatus) => void;
  onConvert: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
}) {
  const { notes, addNote } = useLeadNotes(lead.id);
  const { reminders, addReminder, completeReminder } = useLeadReminders(lead.id);
  const [noteText, setNoteText] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderNote, setReminderNote] = useState('');

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    await addNote(noteText);
    setNoteText('');
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderDate) return;
    await addReminder(new Date(reminderDate).toISOString(), reminderNote);
    setReminderDate('');
    setReminderNote('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-end z-50" onClick={onClose}>
      <div className="bg-white w-full max-w-md h-full overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-xl text-navy-900">{lead.name}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="space-y-2 text-sm text-gray-600 mb-6">
          {lead.company && <p className="flex items-center gap-2"><Building2 className="w-4 h-4" />{lead.company}</p>}
          {lead.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4" />{lead.phone}</p>}
          {lead.email && <p className="flex items-center gap-2"><Mail className="w-4 h-4" />{lead.email}</p>}
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {PIPELINE.map((col) => (
            <button
              key={col.status}
              onClick={() => onMove(lead, col.status)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                lead.status === col.status ? col.color + ' ring-2 ring-offset-1 ring-primary-400' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {col.label}
            </button>
          ))}
        </div>

        {lead.status !== 'won' && lead.status !== 'lost' && (
          <button onClick={() => onConvert(lead)} className="btn-primary w-full flex items-center justify-center gap-2 mb-6">
            <ArrowRight className="w-4 h-4" />
            Convert to Customer
          </button>
        )}

        {/* Reminders */}
        <div className="mb-6">
          <h3 className="font-semibold text-navy-900 mb-2 flex items-center gap-2"><Clock className="w-4 h-4" /> Follow-up Reminders</h3>
          <div className="space-y-2 mb-3">
            {reminders.map((r) => (
              <div key={r.id} className={`flex items-start justify-between p-2 rounded-lg text-sm ${r.completed ? 'bg-gray-50 text-gray-400 line-through' : 'bg-primary-50'}`}>
                <div>
                  <p>{new Date(r.due_at).toLocaleString()}</p>
                  {r.note && <p className="text-xs">{r.note}</p>}
                </div>
                {!r.completed && (
                  <button onClick={() => completeReminder(r.id)} title="Mark done">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </button>
                )}
              </div>
            ))}
            {reminders.length === 0 && <p className="text-xs text-gray-400">No reminders yet</p>}
          </div>
          <form onSubmit={handleAddReminder} className="space-y-2">
            <input type="datetime-local" className="input text-sm" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} required />
            <input placeholder="Reminder note (optional)" className="input text-sm" value={reminderNote} onChange={(e) => setReminderNote(e.target.value)} />
            <button type="submit" className="btn-secondary w-full text-sm">Add Reminder</button>
          </form>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <h3 className="font-semibold text-navy-900 mb-2">Notes</h3>
          <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
            {notes.map((n) => (
              <div key={n.id} className="p-2 bg-gray-50 rounded-lg text-sm">
                <p>{n.note}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            ))}
            {notes.length === 0 && <p className="text-xs text-gray-400">No notes yet</p>}
          </div>
          <form onSubmit={handleAddNote} className="flex gap-2">
            <input placeholder="Add a note..." className="input text-sm" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
            <button type="submit" className="btn-secondary text-sm px-4">Add</button>
          </form>
        </div>

        <button onClick={() => onDelete(lead)} className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700">
          <Trash2 className="w-4 h-4" />
          Delete Lead
        </button>
      </div>
    </div>
  );
}
