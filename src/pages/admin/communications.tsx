import { useEffect, useState } from 'react';
import { Mail, MessageCircle, Send, Smartphone } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { queueCustomerMessage, retryCustomerMessage, cancelCustomerMessage } from '@/lib/communications';
import { useToast } from '@/hooks/use-toast';

interface Customer { id: string; name: string; email: string; phone: string; }
interface Outbox { id: string; channel: string; recipient: string; subject: string | null; message: string; status: string; created_at: string; }

export default function AdminCommunications() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [outbox, setOutbox] = useState<Outbox[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [channel, setChannel] = useState<'email'|'whatsapp'|'sms'>('email');
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: c }, { data: o }] = await Promise.all([
      supabase.from('customers').select('id,name,email,phone').order('name').limit(500),
      supabase.from('communication_outbox').select('id,channel,recipient,subject,message,status,created_at').order('created_at',{ ascending:false }).limit(50),
    ]);
    setCustomers((c || []) as Customer[]); setOutbox((o || []) as Outbox[]);
  };
  useEffect(() => { void load(); }, []);
  const chooseCustomer = (id: string) => { const c = customers.find(x => x.id === id); setCustomerId(id); setRecipient(channel === 'email' ? c?.email || '' : c?.phone || ''); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!customerId || !recipient || !message.trim()) return;
    setSaving(true);
    try { await queueCustomerMessage({ customerId, channel, recipient, subject, message }); toast({ title:'Message queued', description:'It is recorded in the communication outbox and ready for provider delivery.' }); setMessage(''); setSubject(''); await load(); }
    catch (err) { toast({ title:'Unable to queue message', description: err instanceof Error ? err.message : 'Please try again.', variant:'destructive' }); }
    finally { setSaving(false); }
  };
  return <AdminLayout>
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div><p className="text-xs uppercase tracking-widest text-primary-600 font-semibold">Customer communications</p><h1 className="text-2xl font-bold text-navy-900">Communication Center</h1><p className="text-sm text-gray-500 mt-1">Compose controlled outbound messages and keep every customer touchpoint auditable.</p></div>
      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
        <form onSubmit={submit} className="bg-white border rounded-xl p-6 space-y-4">
          <label className="block text-sm font-medium">Customer<select className="mt-1.5 w-full border rounded-lg h-10 px-3" value={customerId} onChange={e=>chooseCustomer(e.target.value)}><option value="">Select customer</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name} — {c.email}</option>)}</select></label>
          <div className="grid grid-cols-3 gap-2">{(['email','whatsapp','sms'] as const).map(x=><button type="button" key={x} onClick={()=>{setChannel(x); const c=customers.find(c=>c.id===customerId); setRecipient(x==='email'?c?.email||'':c?.phone||'')}} className={`border rounded-lg py-2 text-xs capitalize ${channel===x?'border-primary bg-primary/5':''}`}>{x==='email'?<Mail className="mx-auto w-4 h-4 mb-1"/>:x==='whatsapp'?<MessageCircle className="mx-auto w-4 h-4 mb-1"/>:<Smartphone className="mx-auto w-4 h-4 mb-1"/>}{x}</button>)}</div>
          <label className="block text-sm font-medium">Recipient<input className="mt-1.5 w-full border rounded-lg h-10 px-3" value={recipient} onChange={e=>setRecipient(e.target.value)} required/></label>
          {channel==='email' && <label className="block text-sm font-medium">Subject<input className="mt-1.5 w-full border rounded-lg h-10 px-3" value={subject} onChange={e=>setSubject(e.target.value)}/></label>}
          <label className="block text-sm font-medium">Message<textarea className="mt-1.5 w-full border rounded-lg p-3 min-h-36" value={message} onChange={e=>setMessage(e.target.value)} required/></label>
          <button disabled={saving || !customerId} className="w-full h-10 rounded-lg bg-primary-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"><Send className="w-4 h-4"/>{saving?'Queuing…':'Queue Message'}</button>
          <p className="text-xs text-gray-500">Provider delivery is intentionally decoupled. Queued messages are not falsely reported as sent.</p>
        </form>
        <div className="bg-white border rounded-xl overflow-hidden"><div className="p-5 border-b"><h2 className="font-semibold">Recent outbox</h2></div><div className="divide-y">{outbox.length?outbox.map(x=><div key={x.id} className="p-4"><div className="flex justify-between gap-3"><span className="text-xs uppercase tracking-wide font-semibold">{x.channel}</span><span className="text-xs capitalize text-gray-500">{x.status}</span></div><p className="text-sm font-medium mt-1">{x.recipient}</p>{x.subject&&<p className="text-sm text-gray-700">{x.subject}</p>}<p className="text-xs text-gray-500 mt-1 line-clamp-2">{x.message}</p>{(x.status==='queued'||x.status==='failed')&&<div className="mt-3 flex gap-2">{x.status==='failed'&&<button type="button" className="text-xs font-medium text-primary hover:underline" onClick={async()=>{try{await retryCustomerMessage(x.id);await load();}catch(e){toast({title:'Retry failed',description:e instanceof Error?e.message:'Unable to retry.',variant:'destructive'});}}}>Retry</button>}{x.status==='queued'&&<button type="button" className="text-xs font-medium text-destructive hover:underline" onClick={async()=>{try{await cancelCustomerMessage(x.id);await load();}catch(e){toast({title:'Cancel failed',description:e instanceof Error?e.message:'Unable to cancel.',variant:'destructive'});}}}>Cancel</button>}</div>}</div>):<p className="p-6 text-sm text-gray-500">No outbound messages queued yet.</p>}</div></div>
      </div>
    </div>
  </AdminLayout>;
}
