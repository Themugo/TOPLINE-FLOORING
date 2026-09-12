import { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { createSiteVisit, updateSiteVisitStatus } from '@/lib/lifecycle';
import { useToast } from '@/hooks/use-toast';

type Visit = {
  id: string; quotation_id: string | null; customer_id: string | null; scheduled_date: string;
  scheduled_time: string | null; visit_type: string | null; status: string; visit_notes: string | null;
};

export default function AdminSiteVisits() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [quotationId, setQuotationId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('site_visits').select('*').order('scheduled_date').order('scheduled_time');
    if (!error) setVisits((data || []) as Visit[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const schedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;
    setSaving(true);
    try {
      const result = await createSiteVisit({ quotationId: quotationId || null, scheduledDate: date, scheduledTime: time || null, notes });
      if (!result.success) throw new Error(result.error || 'Could not schedule visit');
      setDate(''); setTime(''); setQuotationId(''); setNotes('');
      toast({ title: 'Site visit scheduled' });
      await load();
    } catch (error) {
      toast({ title: 'Could not schedule site visit', description: error instanceof Error ? error.message : undefined, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const setStatus = async (id: string, status: 'completed' | 'cancelled' | 'rescheduled') => {
    try {
      const result = await updateSiteVisitStatus(id, status);
      if (!result.success) throw new Error(result.error || 'Update failed');
      await load();
    } catch (error) {
      toast({ title: 'Could not update visit', description: error instanceof Error ? error.message : undefined, variant: 'destructive' });
    }
  };

  return (
    <AdminLayout title="Site Visits">
      <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        <form onSubmit={schedule} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 h-fit">
          <div><h2 className="font-display font-bold text-lg text-navy-900">Schedule Site Survey</h2><p className="text-sm text-gray-500 mt-1">Create the field-work appointment that follows a qualified enquiry.</p></div>
          <div className="grid grid-cols-2 gap-3"><input required type="date" className="input" value={date} onChange={e => setDate(e.target.value)} /><input type="time" className="input" value={time} onChange={e => setTime(e.target.value)} /></div>
          <input className="input" placeholder="Quotation ID (optional)" value={quotationId} onChange={e => setQuotationId(e.target.value)} />
          <textarea className="input min-h-24" placeholder="Visit notes / scope" value={notes} onChange={e => setNotes(e.target.value)} />
          <button disabled={saving} className="btn-primary w-full">{saving ? 'Scheduling...' : 'Schedule Visit'}</button>
        </form>

        <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between"><div><h2 className="font-display font-bold text-lg text-navy-900">Visit Calendar</h2><p className="text-sm text-gray-500">Upcoming surveys, measurements and field appointments.</p></div><CalendarDays className="w-5 h-5 text-primary-600" /></div>
          {loading ? <div className="p-10 text-center text-gray-500">Loading visits...</div> : visits.length === 0 ? <div className="p-10 text-center text-gray-500">No site visits scheduled.</div> : (
            <div className="divide-y">
              {visits.map(v => <div key={v.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div><div className="flex items-center gap-2 font-semibold text-navy-900"><CalendarDays className="w-4 h-4" />{v.scheduled_date}{v.scheduled_time ? ` · ${v.scheduled_time}` : ''}</div><p className="text-sm text-gray-500 mt-1">{v.visit_type || 'Site survey'} {v.quotation_id ? `· Quote ${v.quotation_id.slice(0,8)}` : ''}</p>{v.visit_notes && <p className="text-sm text-gray-600 mt-2">{v.visit_notes}</p>}</div>
                <div className="flex items-center gap-2"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">{v.status}</span>{v.status === 'scheduled' && <><button title="Complete" onClick={() => setStatus(v.id,'completed')} className="p-2 rounded-lg hover:bg-green-50 text-green-700"><CheckCircle2 className="w-4 h-4" /></button><button title="Cancel" onClick={() => setStatus(v.id,'cancelled')} className="p-2 rounded-lg hover:bg-red-50 text-red-700"><XCircle className="w-4 h-4" /></button></>}{v.status === 'rescheduled' && <Clock3 className="w-4 h-4 text-yellow-600" />}</div>
              </div>)}
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
