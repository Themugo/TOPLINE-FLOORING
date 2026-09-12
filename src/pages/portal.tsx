import { useEffect, useState } from 'react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Clock, FileText, LogOut, Package, ShieldCheck, Truck } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { requestCustomerMagicLink, signOutCustomer } from '@/lib/customer-portal';
import { getCustomerPortal360, type CustomerPortal360Data } from '@/lib/customer-portal-360';
import { getCustomerJourney, type CustomerJourneyEvent } from '@/lib/customer-journey';
import { useSeoMeta } from '@/hooks/use-seo';
import { telHref } from '@/lib/utils';
import { useSiteSettings } from '@/hooks/use-data';
import { createServiceCase } from '@/lib/service-cases';

const orderIcon = (status: string) => {
  if (['completed', 'delivered'].includes(status)) return <CheckCircle2 className="h-5 w-5" />;
  if (['processing', 'confirmed'].includes(status)) return <Truck className="h-5 w-5" />;
  return <Clock className="h-5 w-5" />;
};

function SignIn() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null);
    try { await requestCustomerMagicLink(email); setSent(true); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to send the sign-in link.'); }
    finally { setLoading(false); }
  };
  return (
    <section className="py-20">
      <div className="container mx-auto max-w-md px-6">
        <Card>
          <CardHeader className="text-center">
            <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-primary" />
            <CardTitle>Customer Portal</CardTitle>
            <p className="text-sm text-muted-foreground">Access your quotations and orders securely.</p>
          </CardHeader>
          <CardContent>
            {sent ? <div className="text-center space-y-3"><CheckCircle2 className="mx-auto h-10 w-10 text-green-600" /><h2 className="font-semibold">Check your email</h2><p className="text-sm text-muted-foreground">We sent a secure sign-in link to <strong>{email}</strong>.</p></div> : (
              <form onSubmit={submit} className="space-y-4">
                <div><Label htmlFor="portal-email">Email address</Label><Input id="portal-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.co.ke" className="mt-1.5" /></div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button className="w-full" disabled={loading || !isSupabaseConfigured}>{loading ? 'Sending…' : 'Email me a sign-in link'}</Button>
                {!isSupabaseConfigured && <p className="text-xs text-muted-foreground">The customer portal becomes available after the production Supabase environment is configured.</p>}
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export default function Portal() {
  useSeoMeta('customer-portal', null, { noIndex: true });
  const { settings } = useSiteSettings();
  const [data, setData] = useState<CustomerPortal360Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [journey, setJourney] = useState<CustomerJourneyEvent[]>([]);
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceType, setServiceType] = useState('warranty');
  const [serviceSending, setServiceSending] = useState(false);
  const [serviceMessage, setServiceMessage] = useState<string | null>(null);

  const submitServiceCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.customer.id || !serviceTitle.trim() || !serviceDescription.trim()) return;
    setServiceSending(true); setServiceMessage(null);
    try {
      const result = await createServiceCase({ customerId: data.customer.id, issueTitle: serviceTitle, description: serviceDescription, type: serviceType });
      setServiceTitle(''); setServiceDescription('');
      setServiceMessage(`Request ${result.case_number || 'submitted'} has been received.`);
    } catch (err) {
      setServiceMessage(err instanceof Error ? err.message : 'Unable to submit your service request.');
    } finally { setServiceSending(false); }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    let mounted = true;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { if (mounted) { setSignedIn(false); setLoading(false); } return; }
      try { const portal = await getCustomerPortal360(); const journeyEvents = await getCustomerJourney(); if (mounted) { setData(portal); setJourney(journeyEvents); setSignedIn(true); } }
      catch (err) { if (mounted) setError(err instanceof Error ? err.message : 'Your customer portal is not available.'); }
      finally { if (mounted) setLoading(false); }
    };
    void load();
    const { data: listener } = supabase.auth.onAuthStateChange(() => { void load(); });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  if (loading) return <CustomerLayout><div className="min-h-[50vh] flex items-center justify-center text-sm text-muted-foreground">Loading your portal…</div></CustomerLayout>;
  if (!signedIn || !data) return <CustomerLayout><SignIn /></CustomerLayout>;

  return <CustomerLayout>
    <section className="bg-secondary text-secondary-foreground py-16"><div className="container mx-auto px-6 md:px-12 flex flex-col md:flex-row md:items-end justify-between gap-6"><div><p className="text-primary text-xs uppercase tracking-[0.2em] mb-2">My Topline</p><h1 className="font-display text-4xl font-bold text-white">Welcome, {data.customer.name}</h1><p className="text-secondary-foreground/60 mt-2">Your quotations and orders in one place.</p></div><Button variant="outline" className="w-fit" onClick={() => void signOutCustomer()}><LogOut className="h-4 w-4 mr-2" /> Sign out</Button></div></section>
    <section className="py-12"><div className="container mx-auto px-6 md:px-12 space-y-8">
      {error && <p className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Active projects</p><p className="text-2xl font-bold mt-2">{data.summary.active_projects}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Open orders</p><p className="text-2xl font-bold mt-2">{data.summary.open_orders}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Outstanding</p><p className="text-2xl font-bold mt-2">KES {Number(data.summary.outstanding_invoices).toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Open support</p><p className="text-2xl font-bold mt-2">{data.summary.open_service_cases}</p></CardContent></Card>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Quotations</CardTitle></CardHeader><CardContent className="space-y-3">{data.quotations.length ? data.quotations.map(q => <div key={q.id} className="border rounded-md p-4 flex justify-between gap-4"><div><p className="font-medium">{q.quotation_number || q.id.slice(0,8)}</p><p className="text-xs text-muted-foreground">{q.project_type || q.service || 'Project enquiry'} · {new Date(q.created_at).toLocaleDateString('en-KE')}</p></div><div className="text-right"><p className="text-sm font-medium capitalize">{q.status}</p><p className="text-xs text-muted-foreground">KES {Number(q.total_amount || 0).toLocaleString()}</p></div></div>) : <p className="text-sm text-muted-foreground">No quotations are linked to this account yet.</p>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Orders</CardTitle></CardHeader><CardContent className="space-y-3">{data.orders.length ? data.orders.map(o => <div key={o.id} className="border rounded-md p-4"><div className="flex justify-between gap-4"><div className="flex gap-3">{orderIcon(o.status)}<div><p className="font-medium">{o.order_number || o.id.slice(0,8)}</p><p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString('en-KE')}</p></div></div><div className="text-right"><p className="text-sm font-medium capitalize">{o.status}</p><p className="text-xs">KES {Number(o.total_amount).toLocaleString()}</p></div></div>{o.items?.length ? <div className="mt-3 border-t pt-3 space-y-1">{o.items.map((i, idx) => <div key={idx} className="flex justify-between text-sm"><span>{i.product_name} × {i.quantity} {i.unit}</span><span>KES {(Number(i.unit_price) * Number(i.quantity)).toLocaleString()}</span></div>)}</div> : null}</div>) : <p className="text-sm text-muted-foreground">No orders are linked to this account yet.</p>}</CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>Projects & installations</CardTitle></CardHeader><CardContent className="space-y-3">{data.projects.length ? data.projects.map(p => <div key={p.id} className="border rounded-md p-4"><div className="flex justify-between gap-4"><div><p className="font-medium">{p.title}</p><p className="text-xs text-muted-foreground">{p.project_number || p.project_type || 'Project'} · {p.location || 'Location pending'}</p></div><span className="chip">{p.status.replace('_',' ')}</span></div><div className="mt-3 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{width:`${p.progress_percentage}%`}} /></div><p className="text-xs text-muted-foreground mt-1">{p.progress_percentage}% complete{p.progress_notes ? ` · ${p.progress_notes}` : ''}</p></div>) : <p className="text-sm text-muted-foreground">No projects linked to this account yet.</p>}{data.installations.length ? <div className="border-t pt-3 space-y-2">{data.installations.map(i => <div key={i.id} className="flex justify-between text-sm"><span>{i.installation_number || 'Installation'} · {i.scheduled_date || 'Date pending'}</span><span className="chip">{i.status.replace('_',' ')}</span></div>)}</div> : null}</CardContent></Card>
      <Card><CardHeader><CardTitle>Invoices</CardTitle></CardHeader><CardContent className="space-y-3">{data.invoices.length ? data.invoices.map(i => <div key={i.id} className="border rounded-md p-4 flex justify-between gap-4"><div><p className="font-medium">{i.invoice_number || i.id.slice(0,8)}</p><p className="text-xs text-muted-foreground">Due {i.due_date || '—'} · Paid KES {Number(i.amount_paid).toLocaleString()}</p></div><div className="text-right"><p className="text-sm font-medium capitalize">{i.status}</p><p className="text-sm">KES {Number(i.total_amount).toLocaleString()}</p>{i.pdf_url ? <a className="text-xs text-primary underline" href={i.pdf_url} target="_blank" rel="noreferrer">View invoice</a> : null}</div></div>) : <p className="text-sm text-muted-foreground">No invoices are linked to this account yet.</p>}</CardContent></Card>
      <      <Card><CardHeader><CardTitle>After-sales support</CardTitle></CardHeader><CardContent><form onSubmit={submitServiceCase} className="grid md:grid-cols-[180px_1fr_auto] gap-3"><select className="input" value={serviceType} onChange={e=>setServiceType(e.target.value)}><option value="warranty">Warranty</option><option value="service">Service</option><option value="maintenance">Maintenance</option></select><div className="grid gap-2"><Input required placeholder="Issue or request title" value={serviceTitle} onChange={e=>setServiceTitle(e.target.value)}/><textarea required className="input min-h-20" placeholder="Tell us what you need help with…" value={serviceDescription} onChange={e=>setServiceDescription(e.target.value)}/></div><Button type="submit" disabled={serviceSending}>{serviceSending?'Submitting…':'Submit request'}</Button></form>{serviceMessage&&<p className="mt-3 text-sm text-muted-foreground">{serviceMessage}</p>}</CardContent></Card>
            <Card><CardHeader><CardTitle>Activity Timeline</CardTitle></CardHeader><CardContent>{journey.length ? <div className="space-y-4">{journey.map(event => <div key={event.id} className="flex gap-3"><div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary shrink-0"/><div><p className="text-sm font-medium">{event.title}</p><p className="text-sm text-muted-foreground">{event.message}</p><p className="text-xs text-muted-foreground mt-1">{new Date(event.created_at).toLocaleString('en-KE')}</p></div></div>)}</div> : <p className="text-sm text-muted-foreground">Your account activity will appear here as your quotation, order, project and invoice progress changes.</p>}</CardContent></Card>
            <Card><CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"><div><p className="font-semibold">Need help with an order?</p><p className="text-sm text-muted-foreground">Call {settings?.phone || 'our team'} or request a new quotation.</p></div><div className="flex gap-3"><a href={telHref(settings?.phone || '')}><Button variant="outline">Call us</Button></a><a href="/quotation"><Button>Request quotation</Button></a></div></CardContent></Card>
    </div></section>
  </CustomerLayout>;
}
