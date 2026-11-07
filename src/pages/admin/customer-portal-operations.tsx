import { useEffect, useState } from 'react';
import { AdminLayout } from './dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, FileText, Headphones, Receipt, ShieldCheck, Truck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function CustomerPortalOperations() {
  const [stats, setStats] = useState<{ customers: number; activeAccess: number; projects: number; invoices: number; cases: number; installations: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const [customers, access, projects, invoices, cases, installations] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('customer_portal_access').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).not('status', 'eq', 'cancelled'),
        supabase.from('service_cases').select('id', { count: 'exact', head: true }).not('status', 'in', '(closed,rejected)'),
        supabase.from('installations').select('id', { count: 'exact', head: true }).not('status', 'eq', 'cancelled'),
      ]);
      const failed = [customers, access, projects, invoices, cases, installations].find((result) => result.error);
      if (mounted) {
        if (failed?.error) {
          setStats(null);
          setLoadError('Portal operations metrics are unavailable. Check staff permissions and database access, then refresh.');
        } else {
          setStats({ customers: customers.count ?? 0, activeAccess: access.count ?? 0, projects: projects.count ?? 0, invoices: invoices.count ?? 0, cases: cases.count ?? 0, installations: installations.count ?? 0 });
          setLoadError(null);
        }
        setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const cards = [
    ['Customers', stats?.customers, ShieldCheck],
    ['Portal access', stats?.activeAccess, Activity],
    ['Active projects', stats?.projects, FileText],
    ['Live invoices', stats?.invoices, Receipt],
    ['Open service cases', stats?.cases, Headphones],
    ['Active installations', stats?.installations, Truck],
  ] as const;

  return <AdminLayout title="Customer Portal Operations" subtitle="Monitor the customer self-service surface and the lifecycle data exposed through the secure portal boundary.">
    {loadError && <Card className="mb-4 border-destructive"><CardContent className="p-4 text-sm text-destructive" role="alert">{loadError}</CardContent></Card>}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(([label, value, Icon]) => <Card key={label}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Icon className="h-4 w-4" />{label}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{loading || stats === null ? '—' : value}</p></CardContent></Card>)}
    </div>
    <Card className="mt-6"><CardContent className="p-6"><div className="flex gap-3"><ShieldCheck className="h-5 w-5 text-primary mt-0.5"/><div><p className="font-semibold">Secure portal boundary</p><p className="text-sm text-muted-foreground mt-1">Customer-facing lifecycle data is served through the dedicated portal RPC and remains scoped to the authenticated customer identity. Staff continue to use the existing admin surfaces for operational mutations.</p></div></div></CardContent></Card>
  </AdminLayout>;
}
