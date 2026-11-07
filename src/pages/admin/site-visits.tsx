import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, RefreshCw, UserRound, XCircle } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { createSiteVisit, updateSiteVisitStatus } from '@/lib/lifecycle';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/db';

type Visit = {
  id: string; quotation_id: string | null; customer_id: string | null; project_id: string | null;
  scheduled_date: string; scheduled_time: string | null; visit_type: string | null;
  assigned_to: string | null; status: string; visit_notes: string | null;
};
type Staff = { user_id: string; display_name: string };

export default function AdminSiteVisits() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [quotationId, setQuotationId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [updatingVisitId, setUpdatingVisitId] = useState<string | null>(null);
  const { toast } = useToast();
  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [visitResult, staffResult] = await Promise.all([
        supabase.from('site_visits')
          .select('id,quotation_id,customer_id,project_id,scheduled_date,scheduled_time,visit_type,assigned_to,status,visit_notes')
          .order('scheduled_date', { ascending: true })
          .order('scheduled_time', { ascending: true }),
        supabase.from('staff_profiles')
          .select('user_id,display_name')
          .eq('is_active', true)
          .order('display_name', { ascending: true }),
      ]);
      if (visitResult.error) throw visitResult.error;
      if (staffResult.error) throw staffResult.error;
      setVisits((visitResult.data ?? []) as Visit[]);
      setStaff((staffResult.data ?? []) as Staff[]);
    } catch (error) {
      setLoadError(errorMessage(error, 'Could not load site visits and active staff'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const schedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;
    setSaving(true);
    try {
      const result = await createSiteVisit({
        quotationId: quotationId.trim() || null,
        scheduledDate: date,
        scheduledTime: time || null,
        assignedTo: assignedTo || null,
        visitType: 'site_survey',
        notes: notes.trim() || null,
      });
      if (!result.success) throw new Error(result.error || 'Could not schedule visit');
      setDate(''); setTime(''); setQuotationId(''); setAssignedTo(''); setNotes('');
      toast({ title: 'Site visit scheduled' });
      await load();
    } catch (error) {
      toast({ title: 'Could not schedule site visit', description: errorMessage(error), variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const setStatus = async (id: string, status: 'completed' | 'cancelled') => {
    setUpdatingVisitId(id);
    try {
      const result = await updateSiteVisitStatus(id, status);
      if (!result.success) throw new Error(result.error || 'Update failed');
      toast({ title: status === 'completed' ? 'Site visit completed' : 'Site visit cancelled' });
      await load();
    } catch (error) {
      toast({ title: 'Could not update visit', description: errorMessage(error), variant: 'destructive' });
    } finally { setUpdatingVisitId(null); }
  };

  const staffName = (userId: string | null) => staff.find((member) => member.user_id === userId)?.display_name || (userId ? 'Assigned staff member' : 'Unassigned');

  return (
    <AdminLayout title="Site Visits" subtitle="Schedule measurements, surveys and field appointments without the technical detail.">
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        <form onSubmit={schedule} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 h-fit">
          <div><h2 className="font-display font-bold text-lg text-navy-900">Schedule Site Survey</h2><p className="text-sm text-gray-500 mt-1">Create the field-work appointment that follows a qualified enquiry.</p></div>
          <div className="grid grid-cols-2 gap-3">
            <input required type="date" aria-label="Visit date" min={minDate} className="input" value={date} onChange={e => setDate(e.target.value)} />
            <input type="time" aria-label="Visit time" className="input" value={time} onChange={e => setTime(e.target.value)} />
          </div>
          <input className="input" placeholder="Quotation ID (optional)" aria-label="Quotation ID" value={quotationId} onChange={e => setQuotationId(e.target.value)} />
          <label className="block text-sm font-medium text-gray-700">Assign active staff member
            <select className="input mt-1 w-full" value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
              <option value="">Leave unassigned</option>
              {staff.map(member => <option key={member.user_id} value={member.user_id}>{member.display_name}</option>)}
            </select>
          </label>
          <textarea className="input min-h-24" placeholder="Visit notes / scope" aria-label="Visit notes and scope" maxLength={4000} value={notes} onChange={e => setNotes(e.target.value)} />
          <button disabled={saving || !date} className="btn-primary w-full">{saving ? 'Scheduling...' : 'Schedule Visit'}</button>
        </form>

        <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div><h2 className="font-display font-bold text-lg text-navy-900">Visit Calendar</h2><p className="text-sm text-gray-500">Upcoming surveys, measurements and field appointments.</p></div>
            <button type="button" onClick={() => void load()} disabled={loading} aria-label="Refresh visits" className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
          {loading ? <div className="p-10 text-center text-gray-500">Loading visits...</div>
            : loadError ? <div className="p-8 text-center"><p role="alert" className="text-sm text-red-700">{loadError}</p><button type="button" onClick={() => void load()} className="btn-secondary mt-3">Try again</button></div>
            : visits.length === 0 ? <div className="p-10 text-center text-gray-500">No site visits scheduled.</div> : (
              <div className="divide-y">
                {visits.map(v => <div key={v.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-navy-900"><CalendarDays className="w-4 h-4" />{v.scheduled_date}{v.scheduled_time ? ` · ${v.scheduled_time}` : ''}</div>
                    <p className="text-sm text-gray-500 mt-1">{v.visit_type || 'Site survey'} {v.quotation_id ? `· Quote ${v.quotation_id.slice(0,8)}` : ''} {v.project_id ? `· Project ${v.project_id.slice(0,8)}` : ''}</p>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1"><UserRound className="w-3.5 h-3.5" />{staffName(v.assigned_to)}</p>
                    {v.visit_notes && <p className="text-sm text-gray-600 mt-2">{v.visit_notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">{v.status}</span>
                    {v.status === 'scheduled' && <>
                      <button type="button" title="Complete" aria-label="Complete site visit" disabled={updatingVisitId === v.id} onClick={() => void setStatus(v.id,'completed')} className="p-2 rounded-lg hover:bg-green-50 text-green-700 disabled:opacity-50"><CheckCircle2 className="w-4 h-4" /></button>
                      <button type="button" title="Cancel" aria-label="Cancel site visit" disabled={updatingVisitId === v.id} onClick={() => void setStatus(v.id,'cancelled')} className="p-2 rounded-lg hover:bg-red-50 text-red-700 disabled:opacity-50"><XCircle className="w-4 h-4" /></button>
                    </>}
                    {v.status === 'rescheduled' && <Clock3 className="w-4 h-4 text-yellow-600" />}
                  </div>
                </div>)}
              </div>
            )}
        </section>
      </div>
    </AdminLayout>
  );
}
