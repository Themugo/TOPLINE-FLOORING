import { useCallback, useEffect, useState } from 'react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { CustomerPaymentMethods } from '@/components/customer/CustomerPaymentMethods';
import { initiateCustomerPayment } from '@/lib/customer-payments';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Clock, FileText, LogOut, Package, RefreshCw, ShieldCheck, Truck } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { registerCustomerAccount, requestCustomerMagicLink, signInCustomer, signOutCustomer } from '@/lib/customer-portal';
import { getCustomerPortal360, type CustomerPortal360Data } from '@/lib/customer-portal-360';
import { getCustomerJourney, type CustomerJourneyEvent } from '@/lib/customer-journey';
import { useSeoMeta } from '@/hooks/use-seo';
import { telHref } from '@/lib/utils';
import { useSiteSettings } from '@/hooks/use-data';
import { createServiceCase } from '@/lib/service-cases';
import { submitServiceCaseFeedback } from '@/lib/service-quality-360';
import { getCustomerPortalDocuments, getCustomerPortalPreferences, updateCustomerNotificationPreferences, getCustomerCommunicationsSelfService360, type CustomerNotificationPreferences, type CustomerPortalDocument, type CustomerCommunicationTimelineItem } from '@/lib/customer-self-service';

const orderIcon = (status: string) => {
  if (['completed', 'delivered'].includes(status)) return <CheckCircle2 className="h-5 w-5" />;
  if (['processing', 'confirmed'].includes(status)) return <Truck className="h-5 w-5" />;
  return <Clock className="h-5 w-5" />;
};

function SignIn() {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [signInMethod, setSignInMethod] = useState<'password' | 'link'>('password');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      if (mode === 'register') {
        const result = await registerCustomerAccount({ name, email, phone, company, password });
        setRegistered(!result.session);
      } else if (signInMethod === 'password') {
        await signInCustomer(email, password);
      } else {
        await requestCustomerMagicLink(email);
        setSent(true);
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to complete your request.'); }
    finally { setLoading(false); }
  };
  if (sent || registered) return (
    <section className="py-20"><div className="container mx-auto max-w-md px-6"><Card><CardContent className="p-8 text-center space-y-3"><CheckCircle2 className="mx-auto h-10 w-10 text-green-600" /><h2 className="font-semibold">{registered ? 'Check your email to finish registration' : 'Check your email'}</h2><p className="text-sm text-muted-foreground">{registered ? <>We sent a verification link to <strong>{email}</strong>. Verify your email, then return here to access your customer dashboard.</> : <>We sent a secure sign-in link to <strong>{email}</strong>.</>}</p><Button variant="outline" onClick={() => { setSent(false); setRegistered(false); setMode('signin'); }}>Back to sign in</Button></CardContent></Card></div></section>
  );
  return (
    <section className="py-20"><div className="container mx-auto max-w-md px-6"><Card>
      <CardHeader className="text-center"><ShieldCheck className="mx-auto mb-3 h-8 w-8 text-primary" /><CardTitle>{mode === 'register' ? 'Create your customer account' : 'Customer Portal'}</CardTitle><p className="text-sm text-muted-foreground">{mode === 'register' ? 'Create a secure account to track quotations, orders, projects and invoices.' : 'Access your quotations and orders securely.'}</p></CardHeader>
      <CardContent><form onSubmit={submit} className="space-y-4">
        {mode === 'register' ? <>
          <div><Label htmlFor="portal-name">Full name</Label><Input id="portal-name" required value={name} onChange={e=>setName(e.target.value)} /></div>
          <div><Label htmlFor="portal-phone">Phone number</Label><Input id="portal-phone" required value={phone} onChange={e=>setPhone(e.target.value)} /></div>
          <div><Label htmlFor="portal-company">Company (optional)</Label><Input id="portal-company" value={company} onChange={e=>setCompany(e.target.value)} /></div>
          <div><Label htmlFor="portal-register-email">Email address</Label><Input id="portal-register-email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></div>
          <div><Label htmlFor="portal-password">Password</Label><Input id="portal-password" type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} /></div>
        </> : <><div><Label htmlFor="portal-email">Email address</Label><Input id="portal-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.co.ke" /></div>{signInMethod === 'password' ? <div><Label htmlFor="portal-signin-password">Password</Label><Input id="portal-signin-password" type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} /></div> : null}</>}
        {mode === 'signin' && <Button type="button" variant="link" className="px-0" onClick={()=>setSignInMethod(signInMethod === 'password' ? 'link' : 'password')}>{signInMethod === 'password' ? 'Use email sign-in link instead' : 'Use password instead'}</Button>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" disabled={loading || !isSupabaseConfigured}>{loading ? 'Please wait…' : mode === 'register' ? 'Create account' : signInMethod === 'password' ? 'Sign in' : 'Email me a sign-in link'}</Button>
        <Button type="button" variant="ghost" className="w-full" onClick={() => { setMode(mode === 'register' ? 'signin' : 'register'); setError(null); }}>{mode === 'register' ? 'Already have an account? Sign in' : 'New customer? Create an account'}</Button>
        {!isSupabaseConfigured && <p className="text-xs text-muted-foreground">The customer portal becomes available after the production Supabase environment is configured.</p>}
      </form></CardContent></Card></div></section>
  );
}

export default function Portal() {
  useSeoMeta('customer-portal', null, { noIndex: true });
  const { settings } = useSiteSettings();
  const [data, setData] = useState<CustomerPortal360Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [authenticatedError, setAuthenticatedError] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<{ type: 'quotation'|'order'|'project'|'invoice'; value: any } | null>(null);
  const [invoicePaymentMethod, setInvoicePaymentMethod] = useState<'mpesa'|'card'|'bank_transfer'|null>(null);
  const [orderPaymentMethod, setOrderPaymentMethod] = useState<'mpesa'|'card'|'bank_transfer'|null>(null);
  const [invoicePaymentGatewayKey, setInvoicePaymentGatewayKey] = useState<string | null>(null);
  const [orderPaymentGatewayKey, setOrderPaymentGatewayKey] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [journey, setJourney] = useState<CustomerJourneyEvent[]>([]);
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceType, setServiceType] = useState('warranty');
  const [serviceSending, setServiceSending] = useState(false);
  const [serviceMessage, setServiceMessage] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<Record<string, number>>({});
  const [feedbackComment, setFeedbackComment] = useState<Record<string, string>>({});
  const [feedbackMessage, setFeedbackMessage] = useState<Record<string, string>>({});
  const [feedbackSending, setFeedbackSending] = useState<string | null>(null);
  const [documents, setDocuments] = useState<CustomerPortalDocument[]>([]);
  const [notificationPrefs, setNotificationPrefs] = useState<CustomerNotificationPreferences | null>(null);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState<string | null>(null);
  const [communications, setCommunications] = useState<CustomerCommunicationTimelineItem[]>([]);

  const submitServiceCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.customer.id || !serviceTitle.trim() || !serviceDescription.trim()) return;
    setServiceSending(true); setServiceMessage(null);
    try {
      const result = await createServiceCase({ customerId: data.customer.id, issueTitle: serviceTitle, description: serviceDescription, type: serviceType });
      setServiceTitle(''); setServiceDescription('');
      await loadDashboard();
      setServiceMessage(`Request ${result.case_number || 'submitted'} has been received.`);
    } catch (err) {
      setServiceMessage(err instanceof Error ? err.message : 'Unable to submit your service request.');
    } finally { setServiceSending(false); }
  };

  const saveNotificationPreferences = async () => {
    if (!notificationPrefs) return;
    setPrefsSaving(true); setPrefsMessage(null);
    try {
      const saved = await updateCustomerNotificationPreferences({
        email_enabled: notificationPrefs.email_enabled,
        sms_enabled: notificationPrefs.sms_enabled,
        whatsapp_enabled: notificationPrefs.whatsapp_enabled,
        marketing_email_enabled: notificationPrefs.marketing_email_enabled,
        marketing_sms_enabled: notificationPrefs.marketing_sms_enabled,
      });
      setNotificationPrefs(saved);
      setPrefsMessage('Notification preferences saved.');
    } catch (err) { setPrefsMessage(err instanceof Error ? err.message : 'Unable to save preferences.'); }
    finally { setPrefsSaving(false); }
  };

  const submitFeedback = async (caseId: string) => {
    const rating = feedbackRating[caseId];
    if (!rating) return;
    setFeedbackSending(caseId);
    try { await submitServiceCaseFeedback(caseId, rating, feedbackComment[caseId]); setFeedbackMessage(prev => ({ ...prev, [caseId]: 'Thank you for your feedback.' })); }
    catch (err) { setFeedbackMessage(prev => ({ ...prev, [caseId]: err instanceof Error ? err.message : 'Unable to submit feedback.' })); }
    finally { setFeedbackSending(null); }
  };

  const loadDashboard = useCallback(async () => {
    setLoading(true); setError(null); setAuthenticatedError(false);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSignedIn(false); setData(null); setLoading(false); return; }
    setSignedIn(true);
    try {
      const [portal, journeyEvents, prefs, docs, communicationHistory] = await Promise.all([getCustomerPortal360(), getCustomerJourney(), getCustomerPortalPreferences(), getCustomerPortalDocuments(), getCustomerCommunicationsSelfService360()]);
      setData(portal); setJourney(journeyEvents); setNotificationPrefs(prefs.notification_preferences); setDocuments(docs); setCommunications(communicationHistory.timeline || []);
    } catch (err) { setAuthenticatedError(true); setError(err instanceof Error ? err.message : 'Your customer dashboard could not be loaded.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    void loadDashboard();
    const { data: listener } = supabase.auth.onAuthStateChange(() => { void loadDashboard(); });
    return () => listener.subscription.unsubscribe();
  }, [loadDashboard]);

  if (loading) return <CustomerLayout><div className="min-h-[50vh] flex items-center justify-center text-sm text-muted-foreground">Loading your portal…</div></CustomerLayout>;
  if (!signedIn) return <CustomerLayout><SignIn /></CustomerLayout>;
  if (authenticatedError || !data) return <CustomerLayout><section className="py-20"><div className="container mx-auto max-w-md px-6"><Card><CardContent className="p-8 text-center space-y-4"><ShieldCheck className="mx-auto h-10 w-10 text-primary" /><h2 className="text-xl font-semibold">We couldn't load your dashboard</h2><p className="text-sm text-muted-foreground">Your account is signed in, but your customer information is temporarily unavailable.</p>{error && <p className="text-sm text-destructive">{error}</p>}<div className="flex justify-center gap-3"><Button onClick={()=>void loadDashboard()}><RefreshCw className="h-4 w-4 mr-2"/>Try again</Button><Button variant="outline" onClick={()=>void signOutCustomer()}>Sign out</Button></div></CardContent></Card></div></section></CustomerLayout>;

  return <CustomerLayout>
    <section className="bg-secondary text-secondary-foreground py-16"><div className="container mx-auto px-6 md:px-12 flex flex-col md:flex-row md:items-end justify-between gap-6"><div><p className="text-primary text-xs uppercase tracking-[0.2em] mb-2">My Topline</p><h1 className="font-display text-4xl font-bold text-white">Welcome, {data.customer.name}</h1><p className="text-secondary-foreground/60 mt-2">Your quotations and orders in one place.</p></div><div className="flex gap-3"><Button variant="outline" className="w-fit" onClick={() => void loadDashboard()}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button><Button variant="outline" className="w-fit" onClick={() => void signOutCustomer()}><LogOut className="h-4 w-4 mr-2" /> Sign out</Button></div></div></section>
    <section className="py-12"><div className="container mx-auto px-6 md:px-12 space-y-8">
      {error && <p className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Active projects</p><p className="text-2xl font-bold mt-2">{data.summary.active_projects}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Open orders</p><p className="text-2xl font-bold mt-2">{data.summary.open_orders}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Outstanding</p><p className="text-2xl font-bold mt-2">KES {Number(data.summary.outstanding_invoices).toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Open support</p><p className="text-2xl font-bold mt-2">{data.summary.open_service_cases}</p></CardContent></Card>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Quotations</CardTitle></CardHeader><CardContent className="space-y-3">{data.quotations.length ? data.quotations.map(q => <button type="button" key={q.id} className="w-full text-left border rounded-md p-4 flex justify-between gap-4 hover:bg-muted/40" onClick={() => setSelectedRecord({ type: 'quotation', value: q })}><div><p className="font-medium">{q.quotation_number || q.id.slice(0,8)}</p><p className="text-xs text-muted-foreground">{q.project_type || q.service || 'Project enquiry'} · {new Date(q.created_at).toLocaleDateString('en-KE')}</p></div><div className="text-right"><p className="text-sm font-medium capitalize">{q.status}</p><p className="text-xs text-muted-foreground">KES {Number(q.total_amount || 0).toLocaleString()}</p></div></div></button>) : <p className="text-sm text-muted-foreground">No quotations are linked to this account yet.</p>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Orders</CardTitle></CardHeader><CardContent className="space-y-3">{data.orders.length ? data.orders.map(o => <button type="button" key={o.id} className="w-full text-left border rounded-md p-4 hover:bg-muted/40" onClick={() => { setOrderPaymentMethod(null); setSelectedRecord({ type: 'order', value: o }); }}><div className="flex justify-between gap-4"><div className="flex gap-3">{orderIcon(o.status)}<div><p className="font-medium">{o.order_number || o.id.slice(0,8)}</p><p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString('en-KE')}</p></div></div><div className="text-right"><p className="text-sm font-medium capitalize">{o.status}</p><p className="text-xs">KES {Number(o.total_amount).toLocaleString()}</p></div></div>{o.items?.length ? <div className="mt-3 border-t pt-3 space-y-1">{o.items.map((i, idx) => <div key={idx} className="flex justify-between text-sm"><span>{i.product_name} × {i.quantity} {i.unit}</span><span>KES {(Number(i.unit_price) * Number(i.quantity)).toLocaleString()}</span></div>)}</div> : null}</div></button>) : <p className="text-sm text-muted-foreground">No orders are linked to this account yet.</p>}</CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>Projects & installations</CardTitle></CardHeader><CardContent className="space-y-3">{data.projects.length ? data.projects.map(p => <button type="button" key={p.id} className="w-full text-left border rounded-md p-4 hover:bg-muted/40" onClick={() => setSelectedRecord({ type: 'project', value: p })}><div className="flex justify-between gap-4"><div><p className="font-medium">{p.title}</p><p className="text-xs text-muted-foreground">{p.project_number || p.project_type || 'Project'} · {p.location || 'Location pending'}</p></div><span className="chip">{p.status.replace('_',' ')}</span></div><div className="mt-3 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{width:`${p.progress_percentage}%`}} /></div><p className="text-xs text-muted-foreground mt-1">{p.progress_percentage}% complete{p.progress_notes ? ` · ${p.progress_notes}` : ''}</p></div></button>) : <p className="text-sm text-muted-foreground">No projects linked to this account yet.</p>}{data.installations.length ? <div className="border-t pt-3 space-y-2">{data.installations.map(i => <div key={i.id} className="flex justify-between text-sm"><span>{i.installation_number || 'Installation'} · {i.scheduled_date || 'Date pending'}</span><span className="chip">{i.status.replace('_',' ')}</span></div>)}</div> : null}</CardContent></Card>
      <Card><CardHeader><CardTitle>Invoices</CardTitle></CardHeader><CardContent className="space-y-3">{data.invoices.length ? data.invoices.map(i => <button type="button" key={i.id} className="w-full text-left border rounded-md p-4 flex justify-between gap-4 hover:bg-muted/40" onClick={() => { setInvoicePaymentMethod(null); setSelectedRecord({ type: 'invoice', value: i }); }}><div><p className="font-medium">{i.invoice_number || i.id.slice(0,8)}</p><p className="text-xs text-muted-foreground">Due {i.due_date || '—'} · Paid KES {Number(i.amount_paid).toLocaleString()}</p></div><div className="text-right"><p className="text-sm font-medium capitalize">{i.status}</p><p className="text-sm">KES {Number(i.total_amount).toLocaleString()}</p><p className="text-xs text-primary mt-1">View details</p></div></div></button>) : <p className="text-sm text-muted-foreground">No invoices are linked to this account yet.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>After-sales support</CardTitle></CardHeader><CardContent className="space-y-5"><form onSubmit={submitServiceCase} className="grid md:grid-cols-[180px_1fr_auto] gap-3"><select className="input" value={serviceType} onChange={e=>setServiceType(e.target.value)}><option value="warranty">Warranty</option><option value="service">Service</option><option value="maintenance">Maintenance</option></select><div className="grid gap-2"><Input required placeholder="Issue or request title" value={serviceTitle} onChange={e=>setServiceTitle(e.target.value)}/><textarea required className="input min-h-20" placeholder="Tell us what you need help with…" value={serviceDescription} onChange={e=>setServiceDescription(e.target.value)}/></div><Button type="submit" disabled={serviceSending}>{serviceSending?'Submitting…':'Submit request'}</Button></form>{serviceMessage&&<p className="text-sm text-muted-foreground">{serviceMessage}</p>}{data.service_cases.length ? <div className="border-t pt-5 space-y-4"><div><p className="font-semibold">Your service cases</p><p className="text-sm text-muted-foreground">Resolved cases can be rated once.</p></div>{data.service_cases.map(c => <div key={c.id} className="border rounded-md p-4"><div className="flex justify-between gap-4"><div><p className="font-medium">{c.case_number} · {c.issue_title}</p><p className="text-xs text-muted-foreground capitalize">{c.type} · {c.status.replace('_',' ')}</p></div><span className="chip">{c.priority}</span></div>{['resolved','closed'].includes(c.status) && !feedbackMessage[c.id]?.startsWith('Thank you') ? <div className="mt-4 grid gap-2 md:grid-cols-[140px_1fr_auto]"><select className="input" value={feedbackRating[c.id]||''} onChange={e=>setFeedbackRating(prev=>({...prev,[c.id]:Number(e.target.value)}))}><option value="">Rate service…</option><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Okay</option><option value="2">2 — Poor</option><option value="1">1 — Very poor</option></select><Input placeholder="Optional comment" value={feedbackComment[c.id]||''} onChange={e=>setFeedbackComment(prev=>({...prev,[c.id]:e.target.value}))}/><Button onClick={()=>void submitFeedback(c.id)} disabled={feedbackSending===c.id || !feedbackRating[c.id]}>{feedbackSending===c.id?'Sending…':'Rate service'}</Button></div> : null}{feedbackMessage[c.id]&&<p className="text-sm text-muted-foreground mt-2">{feedbackMessage[c.id]}</p>}</div>)}</div> : null}</CardContent></Card>
            <div className="grid md:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle>Documents</CardTitle></CardHeader><CardContent>{documents.length ? <div className="space-y-3">{documents.map(d => <div key={d.id} className="border rounded-md p-4"><p className="font-medium">{d.document_name}</p><p className="text-xs text-muted-foreground capitalize">{d.document_type.replace(/_/g,' ')} · {new Date(d.created_at).toLocaleDateString('en-KE')}</p>{d.description ? <p className="text-sm text-muted-foreground mt-1">{d.description}</p> : null}</div>)}</div> : <p className="text-sm text-muted-foreground">Your shared documents will appear here.</p>}<p className="text-xs text-muted-foreground mt-4">Documents are listed securely; private file locations are never exposed through the portal data API.</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Notification preferences</CardTitle></CardHeader><CardContent>{notificationPrefs ? <div className="space-y-3">{([['email_enabled','Email updates'],['sms_enabled','SMS updates'],['whatsapp_enabled','WhatsApp updates'],['marketing_email_enabled','Marketing email'],['marketing_sms_enabled','Marketing SMS']] as const).map(([key,label]) => <label key={key} className="flex items-center justify-between gap-4 border rounded-md p-3 text-sm"><span>{label}</span><input type="checkbox" checked={notificationPrefs[key]} onChange={e=>setNotificationPrefs(prev=>prev ? {...prev,[key]:e.target.checked} : prev)} /></label>)}<Button onClick={()=>void saveNotificationPreferences()} disabled={prefsSaving}>{prefsSaving ? 'Saving…' : 'Save preferences'}</Button>{prefsMessage&&<p className="text-sm text-muted-foreground">{prefsMessage}</p>}<p className="text-xs text-muted-foreground">Operational messages may still be sent when required to fulfil an order, project or service obligation.</p></div> : <p className="text-sm text-muted-foreground">Preferences are unavailable right now.</p>}</CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>Communication history</CardTitle></CardHeader><CardContent>{communications.length ? <div className="space-y-3 max-h-[28rem] overflow-y-auto">{communications.slice(0,30).map(item => <div key={`${item.id}-${item.created_at}`} className="border rounded-md p-4"><div className="flex items-center justify-between gap-3"><span className="text-xs uppercase font-semibold">{item.channel} · {item.direction}</span><span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString('en-KE')}</span></div>{item.subject ? <p className="font-medium mt-1">{item.subject}</p> : null}<p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{item.message}</p><p className="text-xs text-muted-foreground mt-2 capitalize">Status: {item.status}</p></div>)}</div> : <p className="text-sm text-muted-foreground">Your communication history will appear here as messages are sent or received.</p>}<p className="text-xs text-muted-foreground mt-4">Only communications belonging to your authenticated customer account are shown.</p></CardContent></Card>
            <Card><CardHeader><CardTitle>Activity Timeline</CardTitle></CardHeader><CardContent>{journey.length ? <div className="space-y-4">{journey.map(event => <div key={event.id} className="flex gap-3"><div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary shrink-0"/><div><p className="text-sm font-medium">{event.title}</p><p className="text-sm text-muted-foreground">{event.message}</p><p className="text-xs text-muted-foreground mt-1">{new Date(event.created_at).toLocaleString('en-KE')}</p></div></div>)}</div> : <p className="text-sm text-muted-foreground">Your account activity will appear here as your quotation, order, project and invoice progress changes.</p>}</CardContent></Card>
            <Card><CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"><div><p className="font-semibold">Need help with an order?</p><p className="text-sm text-muted-foreground">Call {settings?.phone || 'our team'} or request a new quotation.</p></div><div className="flex gap-3"><a href={telHref(settings?.phone || '')}><Button variant="outline">Call us</Button></a><a href="/quotation"><Button>Request quotation</Button></a></div></CardContent></Card>
      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{selectedRecord ? `${selectedRecord.type[0].toUpperCase()}${selectedRecord.type.slice(1)} details` : 'Details'}</DialogTitle></DialogHeader>{selectedRecord ? <div className="space-y-4 text-sm">{selectedRecord.type === 'quotation' && <><p><strong>Quotation:</strong> {selectedRecord.value.quotation_number || selectedRecord.value.id.slice(0,8)}</p><p><strong>Status:</strong> {selectedRecord.value.status}</p><p><strong>Service:</strong> {selectedRecord.value.service || selectedRecord.value.project_type || 'Project enquiry'}</p><p><strong>Total:</strong> KES {Number(selectedRecord.value.total_amount || 0).toLocaleString()}</p><div>{selectedRecord.value.items?.map((i:any,idx:number)=><div key={idx} className="flex justify-between border-b py-2"><span>{i.description} × {i.quantity} {i.unit}</span><span>KES {Number(i.line_total).toLocaleString()}</span></div>)}</div></>}{selectedRecord.type === 'order' && <><p><strong>Order:</strong> {selectedRecord.value.order_number || selectedRecord.value.id.slice(0,8)}</p><p><strong>Status:</strong> {selectedRecord.value.status}</p><p><strong>Total:</strong> KES {Number(selectedRecord.value.total_amount || 0).toLocaleString()}</p><div>{selectedRecord.value.items?.map((i:any,idx:number)=><div key={idx} className="flex justify-between border-b py-2"><span>{i.product_name} × {i.quantity} {i.unit}</span><span>KES {(Number(i.unit_price)*Number(i.quantity)).toLocaleString()}</span></div>)}</div>{selectedRecord.value.payment_status && !['paid','successful','completed'].includes(String(selectedRecord.value.payment_status).toLowerCase()) && <div className="pt-4 border-t"><CustomerPaymentMethods context="order" value={orderPaymentMethod} onChange={setOrderPaymentMethod} onGatewayChange={setOrderPaymentGatewayKey}/><Button className="mt-3" disabled={paying || !orderPaymentMethod || !orderPaymentGatewayKey} onClick={async()=>{ if(!data?.customer?.email || !selectedRecord?.value?.id) return; setPaying(true); setPaymentMessage(null); try { const r=await initiateCustomerPayment({targetType:'order',targetId:selectedRecord.value.id,email:data.customer.email,phone:selectedRecord.value.customer_phone||data.customer.phone||null,paymentMethod:orderPaymentMethod,gatewayKey:orderPaymentGatewayKey,idempotencyKey:`portal-order-payment:${selectedRecord.value.id}:${orderPaymentGatewayKey}:${crypto.randomUUID()}`,returnUrl:`${window.location.origin}/payment-return`}); if(r.checkout_url) window.location.href=r.checkout_url; else if(r.return_url) window.location.href=r.return_url; else setPaymentMessage(r.message || 'Payment started. Check your payment status shortly.'); } catch(e){ setPaymentMessage(e instanceof Error?e.message:'Payment could not be started.'); } finally { setPaying(false); } }}>{paying?'Starting payment…':'Pay Now'}</Button>{paymentMessage&&<p className="text-sm text-muted-foreground mt-3">{paymentMessage}</p>}</div>}</>}{selectedRecord.type === 'project' && <><p><strong>Project:</strong> {selectedRecord.value.title}</p><p><strong>Status:</strong> {selectedRecord.value.status}</p><p><strong>Location:</strong> {selectedRecord.value.location || 'Pending'}</p><p><strong>Progress:</strong> {selectedRecord.value.progress_percentage}%</p><p>{selectedRecord.value.description || selectedRecord.value.progress_notes || 'No additional project notes.'}</p></>}{selectedRecord.type === 'invoice' && <><p><strong>Invoice:</strong> {selectedRecord.value.invoice_number || selectedRecord.value.id.slice(0,8)}</p><p><strong>Status:</strong> {selectedRecord.value.status}</p><p><strong>Total:</strong> KES {Number(selectedRecord.value.total_amount).toLocaleString()}</p><p><strong>Paid:</strong> KES {Number(selectedRecord.value.amount_paid).toLocaleString()}</p><p><strong>Balance:</strong> KES {Math.max(Number(selectedRecord.value.total_amount)-Number(selectedRecord.value.amount_paid),0).toLocaleString()}</p><div>{selectedRecord.value.items?.map((i:any,idx:number)=><div key={idx} className="flex justify-between border-b py-2"><span>{i.description} × {i.quantity}</span><span>KES {Number(i.line_total).toLocaleString()}</span></div>)}</div>{selectedRecord.value.pdf_url ? <a className="text-primary underline" href={selectedRecord.value.pdf_url} target="_blank" rel="noreferrer">Open invoice PDF</a> : null}{Math.max(Number(selectedRecord.value.total_amount)-Number(selectedRecord.value.amount_paid),0) > 0 && <div className="pt-4 border-t"><CustomerPaymentMethods context="invoice" value={invoicePaymentMethod} onChange={setInvoicePaymentMethod} onGatewayChange={setInvoicePaymentGatewayKey}/><Button className="mt-3" disabled={paying || !invoicePaymentMethod || !invoicePaymentGatewayKey} onClick={async()=>{ if(!data?.customer?.email || !selectedRecord?.value?.id) return; setPaying(true); setPaymentMessage(null); try { const r=await initiateCustomerPayment({targetType:'invoice',targetId:selectedRecord.value.id,email:data.customer.email,phone:selectedRecord.value.customer_phone||data.customer.phone||null,paymentMethod:invoicePaymentMethod,gatewayKey:invoicePaymentGatewayKey,idempotencyKey:`portal-invoice-payment:${selectedRecord.value.id}:${invoicePaymentGatewayKey}:${crypto.randomUUID()}`,returnUrl:`${window.location.origin}/payment-return`}); if(r.checkout_url) window.location.href=r.checkout_url; else if(r.return_url) window.location.href=r.return_url; else setPaymentMessage(r.message || 'Payment started. Check your payment status shortly.'); } catch(e){ setPaymentMessage(e instanceof Error?e.message:'Payment could not be started.'); } finally { setPaying(false); } }}>{paying?'Starting payment…':'Pay Now'}</Button>{paymentMessage&&<p className="text-sm text-muted-foreground mt-3">{paymentMessage}</p>}</div>}</>}</div> : null}</DialogContent></Dialog>
    </div></section>
  </CustomerLayout>;
}
