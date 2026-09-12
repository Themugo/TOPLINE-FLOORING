import { AdminLayout } from './dashboard';
import { Button } from '@/components/ui/button';
import { Database, Download, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function AdminBackups() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const exportData = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-data-export', { method: 'POST' });
      if (error) throw error;
      const exportPayload = data?.payload ?? data; const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = `topline-data-export-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
      toast({ title: 'Data export ready', description: data?.event?.payload_hash ? `Export ${data.event.id.slice(0, 8)}… verified with hash ${data.event.payload_hash}.` : 'The operational export has been downloaded.' });
    } catch (err) { toast({ title: 'Export failed', description: err instanceof Error ? err.message : 'Unable to create the export.', variant: 'destructive' }); }
    finally { setExporting(false); }
  };
  return <AdminLayout><div className="space-y-6 max-w-4xl"><div><h1 className="text-2xl font-bold">Backups & Data Export</h1><p className="text-muted-foreground">Understand the database backup boundary and create an operational data export.</p></div>
    <div className="grid md:grid-cols-2 gap-6"><div className="rounded-lg border bg-card p-6"><ShieldCheck className="h-7 w-7 text-green-600 mb-4"/><h2 className="font-semibold">Database backups</h2><p className="text-sm text-muted-foreground mt-2">PostgreSQL backups are managed by Supabase. Topline does not pretend to create a second database backup from the browser.</p><a className="text-sm text-primary hover:underline mt-4 inline-block" href="https://supabase.com/dashboard/project/jypkhvknfgoqrhwzbdwi/settings/database" target="_blank" rel="noreferrer">Open Supabase database settings</a></div>
    <div className="rounded-lg border bg-card p-6"><Database className="h-7 w-7 text-primary mb-4"/><h2 className="font-semibold">Operational data export</h2><p className="text-sm text-muted-foreground mt-2">Export business records for controlled handoff, analysis or disaster-recovery preparation.</p><Button className="mt-4" onClick={() => void exportData()} disabled={exporting}><Download className="h-4 w-4 mr-2"/>{exporting ? 'Preparing…' : 'Download data export'}</Button></div></div>
  </div></AdminLayout>;
}
