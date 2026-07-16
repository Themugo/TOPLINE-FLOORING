import { useState } from 'react';
import { AdminLayout } from '@/pages/admin/dashboard';
import { LeadForm } from '@/components/leads/LeadForm';
import { LeadList } from '@/components/leads/LeadList';
import { useLeads } from '@/hooks/use-data';
import { useToast } from '@/hooks/use-toast';
import type { Lead } from '@/lib/types';

export default function AdminLeads() {
  const { leads, loading, createLead, updateLead, deleteLead } = useLeads();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const handleAddNew = () => {
    setEditingLead(null);
    setShowForm(true);
  };

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setShowForm(true);
  };

  const handleFormSubmit = async (data: Partial<Lead>) => {
    try {
      if (editingLead) {
        await updateLead(editingLead.id, data);
      } else {
        await createLead(data);
      }
      setShowForm(false);
      setEditingLead(null);
    } catch (error) {
      console.error('Failed to save lead:', error);
      toast({ title: 'Failed to save lead. Please try again.', variant: 'destructive' });
    }
  };

  const handleDelete = async (leadId: string) => {
    try {
      await deleteLead(leadId);
    } catch (error) {
      console.error('Failed to delete lead:', error);
      toast({ title: 'Failed to delete lead. Please try again.', variant: 'destructive' });
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingLead(null);
  };

  return (
    <AdminLayout title="Leads">
      {showForm ? (
        <LeadForm
          lead={editingLead || undefined}
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
        />
      ) : (
        <LeadList
          leads={leads}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddNew={handleAddNew}
        />
      )}
    </AdminLayout>
  );
}
