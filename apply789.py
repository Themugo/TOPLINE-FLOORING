from pathlib import Path
root=Path('/mnt/data/comm789')
# migration
mig=root/'supabase/migrations/20261002160000_communications_comm_07_09_customer_admin_360.sql'
mig.write_text(r'''-- Communications COMM-07 through COMM-09
-- Customer communication experience, Admin Communication Center 360, and Customer 360 communications.

-- COMM-09: customer-safe communication history. The browser never supplies a customer_id.
CREATE OR REPLACE FUNCTION public.get_customer_communications_self_service_360()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  cid uuid := public.get_current_customer_id();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF cid IS NULL THEN RAISE EXCEPTION 'Customer portal account is not linked'; END IF;
  RETURN jsonb_build_object(
    'customer_id', cid,
    'timeline', COALESCE((
      SELECT jsonb_agg(x ORDER BY x.created_at DESC)
      FROM (
        SELECT c.id,c.channel,c.direction,c.subject,c.message,c.status,c.external_reference,c.created_at
        FROM public.customer_communications c WHERE c.customer_id=cid
        UNION ALL
        SELECT o.id,o.channel,'outbound'::text,o.subject,o.message,
               COALESCE(o.delivery_status,o.status),o.provider_reference,o.created_at
        FROM public.communication_outbox o
        WHERE o.customer_id=cid
          AND NOT EXISTS (SELECT 1 FROM public.customer_communications cc WHERE cc.external_reference=o.provider_message_id AND cc.customer_id=cid)
      ) x
    ),'[]'::jsonb)
  );
END; $$;
REVOKE ALL ON FUNCTION public.get_customer_communications_self_service_360() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_customer_communications_self_service_360() TO authenticated;

-- COMM-08: staff-facing control-plane RPC. Keep sensitive communication reads behind staff permission
-- rather than relying on broad browser table reads for the operational view.
CREATE OR REPLACE FUNCTION public.get_communications_center_360(
  p_days integer DEFAULT 30,
  p_channel text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_days integer:=greatest(1,least(coalesce(p_days,30),365));
BEGIN
  PERFORM private.require_staff_permission('customers','read');
  RETURN jsonb_build_object(
    'period_days',v_days,
    'outbound',COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC) FROM (
      SELECT o.id,o.customer_id,c.name customer_name,o.channel,o.recipient,o.subject,o.message,o.status,o.delivery_status,
             o.provider,o.provider_reference,o.provider_message_id,o.last_provider_event,o.error_message,o.attempt_count,o.created_at,o.sent_at
      FROM public.communication_outbox o LEFT JOIN public.customers c ON c.id=o.customer_id
      WHERE o.created_at >= now()-make_interval(days=>v_days)
        AND (p_channel IS NULL OR o.channel=p_channel)
        AND (p_status IS NULL OR o.status=p_status OR o.delivery_status=p_status)
        AND (p_customer_id IS NULL OR o.customer_id=p_customer_id)
      LIMIT 200
    ) x),'[]'::jsonb),
    'inbound',COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.received_at DESC) FROM (
      SELECT i.id,i.customer_id,c.name customer_name,i.channel,i.sender,i.subject,i.message,i.provider,
             i.match_status,i.match_reason,i.received_at,i.processed_at
      FROM public.communication_inbound i LEFT JOIN public.customers c ON c.id=i.customer_id
      WHERE i.received_at >= now()-make_interval(days=>v_days)
        AND (p_channel IS NULL OR i.channel=p_channel)
        AND (p_customer_id IS NULL OR i.customer_id=p_customer_id)
      LIMIT 200
    ) x),'[]'::jsonb),
    'customers',COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.name) FROM (
      SELECT id,name,email,phone FROM public.customers ORDER BY name LIMIT 500
    ) x),'[]'::jsonb)
  );
END; $$;
REVOKE ALL ON FUNCTION public.get_communications_center_360(integer,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_communications_center_360(integer,text,text,uuid) TO authenticated;

COMMENT ON FUNCTION public.get_customer_communications_self_service_360() IS 'Customer-bound communications timeline. Customer identity is resolved server-side from authenticated portal mapping.';
COMMENT ON FUNCTION public.get_communications_center_360(integer,text,text,uuid) IS 'Staff communications control-plane read model with customer names, provider state and inbound match status.';
''')
# customer self service lib
p=root/'src/lib/customer-self-service.ts'
s=p.read_text()
s += '''\n\nexport interface CustomerCommunicationTimelineItem {\n  id: string; channel: string; direction: string; subject: string | null; message: string;\n  status: string; external_reference: string | null; created_at: string;\n}\n\nexport async function getCustomerCommunicationsSelfService360(): Promise<{ customer_id: string; timeline: CustomerCommunicationTimelineItem[] }> {\n  const { data, error } = await supabase.rpc('get_customer_communications_self_service_360');\n  if (error) throw error;\n  return (data || { customer_id: '', timeline: [] }) as { customer_id: string; timeline: CustomerCommunicationTimelineItem[] };\n}\n'''
p.write_text(s)
# portal imports and state/load
p=root/'src/pages/portal.tsx'; s=p.read_text()
s=s.replace("getCustomerPortalDocuments, getCustomerPortalPreferences, updateCustomerNotificationPreferences, type CustomerNotificationPreferences, type CustomerPortalDocument", "getCustomerPortalDocuments, getCustomerPortalPreferences, updateCustomerNotificationPreferences, getCustomerCommunicationsSelfService360, type CustomerNotificationPreferences, type CustomerPortalDocument, type CustomerCommunicationTimelineItem")
s=s.replace("const [prefsMessage, setPrefsMessage] = useState<string | null>(null);", "const [prefsMessage, setPrefsMessage] = useState<string | null>(null);\n  const [communications, setCommunications] = useState<CustomerCommunicationTimelineItem[]>([]);")
# find dashboard load start and add promise call after preferences
needle="const loadDashboard = useCallback(async () => {"
idx=s.find(needle)
if idx!=-1:
    end=s.find("}, [", idx)
    # inject after existing Promise.all? safer locate getCustomerPortalDocuments
    s=s.replace("const [portalResult, journeyResult, documentsResult, prefsResult] = await Promise.all([", "const [portalResult, journeyResult, documentsResult, prefsResult, communicationsResult] = await Promise.all([")
    s=s.replace("getCustomerPortalPreferences(),\n    ]);", "getCustomerPortalPreferences(),\n      getCustomerCommunicationsSelfService360(),\n    ]);")
    s=s.replace("setNotificationPrefs(prefsResult.notification_preferences);", "setNotificationPrefs(prefsResult.notification_preferences);\n      setCommunications(communicationsResult.timeline || []);")
# add card before Activity Timeline
marker='<Card><CardHeader><CardTitle>Activity Timeline</CardTitle></CardHeader>'
card='''<Card><CardHeader><CardTitle>Communication history</CardTitle></CardHeader><CardContent>{communications.length ? <div className="space-y-3 max-h-[28rem] overflow-y-auto">{communications.slice(0,30).map(item => <div key={`${item.id}-${item.created_at}`} className="border rounded-md p-4"><div className="flex items-center justify-between gap-3"><span className="text-xs uppercase font-semibold">{item.channel} · {item.direction}</span><span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString('en-KE')}</span></div>{item.subject ? <p className="font-medium mt-1">{item.subject}</p> : null}<p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{item.message}</p><p className="text-xs text-muted-foreground mt-2 capitalize">Status: {item.status}</p></div>)}</div> : <p className="text-sm text-muted-foreground">Your communication history will appear here as messages are sent or received.</p>}<p className="text-xs text-muted-foreground mt-4">Only communications belonging to your authenticated customer account are shown.</p></CardContent></Card>\n            '''
s=s.replace(marker, card+marker)
p.write_text(s)
# admin page rewrite cleanly
p=root/'src/pages/admin/communications.tsx'
p.write_text('''import { useCallback, useEffect, useMemo, useState } from 'react';\nimport { Mail, MessageCircle, RefreshCw, Send, Smartphone } from 'lucide-react';\nimport { AdminLayout } from './dashboard';\nimport { supabase } from '@/lib/supabase';\nimport { queueCustomerMessage, retryCustomerMessage, cancelCustomerMessage } from '@/lib/communications';\nimport { useToast } from '@/hooks/use-toast';\n\ntype Customer={id:string;name:string;email:string;phone:string};\ntype Outbox=Record<string,any> & {id:string};\ntype Inbound=Record<string,any> & {id:string};\n\nexport default function AdminCommunications(){\n const {toast}=useToast(); const [customers,setCustomers]=useState<Customer[]>([]); const [outbox,setOutbox]=useState<Outbox[]>([]); const [inbound,setInbound]=useState<Inbound[]>([]); const [summary,setSummary]=useState<Record<string,number>>({});\n const [customerId,setCustomerId]=useState(''); const [channel,setChannel]=useState<'email'|'whatsapp'|'sms'>('email'); const [recipient,setRecipient]=useState(''); const [subject,setSubject]=useState(''); const [message,setMessage]=useState(''); const [saving,setSaving]=useState(false); const [loading,setLoading]=useState(true); const [days,setDays]=useState(30); const [filterChannel,setFilterChannel]=useState(''); const [filterStatus,setFilterStatus]=useState('');\n const load=useCallback(async()=>{setLoading(true); try{ const [{data:c},{data:s},{data:journey}]=await Promise.all([supabase.from('customers').select('id,name,email,phone').order('name').limit(500),supabase.rpc('get_communication_operations_summary'),supabase.rpc('get_communications_center_360',{p_days:days,p_channel:filterChannel||null,p_status:filterStatus||null,p_customer_id:customerId||null})]); setCustomers((c||[]) as Customer[]); setSummary((s||{}) as Record<string,number>); setOutbox((journey?.outbound||[]) as Outbox[]); setInbound((journey?.inbound||[]) as Inbound[]);}catch(e){toast({title:'Unable to load communications',description:e instanceof Error?e.message:'Please try again.',variant:'destructive'});}finally{setLoading(false);}},[days,filterChannel,filterStatus,customerId,toast]);\n useEffect(()=>{void load()},[load]);\n const choose=(id:string)=>{setCustomerId(id);const c=customers.find(x=>x.id===id);setRecipient(channel==='email'?c?.email||'':c?.phone||'')};\n const submit=async(e:React.FormEvent)=>{e.preventDefault();if(!customerId||!recipient||!message.trim())return;setSaving(true);try{await queueCustomerMessage({customerId,channel,recipient,message,subject});toast({title:'Message queued',description:'The message is now in the durable communication outbox.'});setMessage('');setSubject('');await load()}catch(err){toast({title:'Unable to queue message',description:err instanceof Error?err.message:'Please try again.',variant:'destructive'})}finally{setSaving(false)}};\n const retry=async(id:string)=>{try{await retryCustomerMessage(id);toast({title:'Message retry queued'});await load()}catch(e){toast({title:'Retry failed',description:e instanceof Error?e.message:'Unable to retry.',variant:'destructive'})}};\n const cancel=async(id:string)=>{if(!window.confirm('Cancel this queued message?'))return;try{await cancelCustomerMessage(id);toast({title:'Message cancelled'});await load()}catch(e){toast({title:'Cancel failed',description:e instanceof Error?e.message:'Unable to cancel.',variant:'destructive'})}};\n const cards=[['Queued','queued'],['Sent','sent'],['Failed','failed'],['Delivered','delivered'],['Pending delivery','pending_delivery'],['Inbound replies','inbound_responses'],['Unmatched inbound','unmatched_inbound'],['Suppressed workflows','suppressed_workflows']];\n return <AdminLayout><div className="max-w-7xl mx-auto p-6 space-y-6">\n  <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-primary-600 font-semibold">Customer communications</p><h1 className="text-2xl font-bold text-navy-900">Communication Center 360</h1><p className="text-sm text-gray-500 mt-1">Compose, monitor, reconcile and review customer communications without confusing queue state with provider delivery.</p></div><button className="border rounded-lg px-4 py-2 text-sm flex items-center gap-2" onClick={()=>void load()} disabled={loading}><RefreshCw className="w-4 h-4"/>{loading?'Refreshing…':'Refresh'}</button></div>\n  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">{cards.map(([label,key])=><div key={key} className="bg-white border rounded-xl p-4"><p className="text-[10px] uppercase tracking-wider text-gray-500">{label}</p><p className="text-2xl font-bold mt-1">{summary[key]??0}</p></div>)}</div>\n  <div className="flex flex-wrap gap-3 bg-white border rounded-xl p-4"><select className="border rounded-lg h-10 px-3" value={days} onChange={e=>setDays(Number(e.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select><select className="border rounded-lg h-10 px-3" value={filterChannel} onChange={e=>setFilterChannel(e.target.value)}><option value="">All channels</option><option value="email">Email</option><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option></select><select className="border rounded-lg h-10 px-3" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="">All states</option><option value="queued">Queued</option><option value="sent">Accepted</option><option value="delivered">Delivered</option><option value="failed">Failed</option><option value="unknown">Unknown</option></select><select className="border rounded-lg h-10 px-3 min-w-64" value={customerId} onChange={e=>choose(e.target.value)}><option value="">All customers</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name} — {c.email}</option>)}</select></div>\n  <div className="grid lg:grid-cols-[1fr_1.35fr] gap-6">\n   <form onSubmit={submit} className="bg-white border rounded-xl p-6 space-y-4"><h2 className="font-semibold">Send a customer message</h2><p className="text-xs text-gray-500">Messages are queued first. Provider acceptance and delivery are tracked separately.</p><label className="block text-sm font-medium">Customer<select required className="mt-1.5 w-full border rounded-lg h-10 px-3" value={customerId} onChange={e=>choose(e.target.value)}><option value="">Select customer</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name} — {c.email}</option>)}</select></label><div className="grid grid-cols-3 gap-2">{(['email','whatsapp','sms'] as const).map(x=><button type="button" key={x} onClick={()=>{setChannel(x);const c=customers.find(c=>c.id===customerId);setRecipient(x==='email'?c?.email||'':c?.phone||'')}} className={`border rounded-lg py-2 text-xs capitalize ${channel===x?'border-primary bg-primary/5':''}`}>{x==='email'?<Mail className="mx-auto w-4 h-4 mb-1"/>:x==='whatsapp'?<MessageCircle className="mx-auto w-4 h-4 mb-1"/>:<Smartphone className="mx-auto w-4 h-4 mb-1"/>}{x}</button>)}</div><label className="block text-sm font-medium">Recipient<input className="mt-1.5 w-full border rounded-lg h-10 px-3" value={recipient} onChange={e=>setRecipient(e.target.value)} required/></label>{channel==='email'&&<label className="block text-sm font-medium">Subject<input className="mt-1.5 w-full border rounded-lg h-10 px-3" value={subject} onChange={e=>setSubject(e.target.value)}/></label>}<label className="block text-sm font-medium">Message<textarea className="mt-1.5 w-full border rounded-lg p-3 min-h-36" maxLength={4000} value={message} onChange={e=>setMessage(e.target.value)} required/></label><button disabled={saving||!customerId} className="w-full h-10 rounded-lg bg-primary-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"><Send className="w-4 h-4"/>{saving?'Queuing…':'Queue Message'}</button></form>\n   <div className="space-y-6"><section className="bg-white border rounded-xl overflow-hidden"><div className="p-5 border-b"><h2 className="font-semibold">Outbound communications</h2><p className="text-xs text-gray-500 mt-1">{outbox.length} records in the selected view.</p></div><div className="divide-y max-h-[38rem] overflow-y-auto">{outbox.length?outbox.map(x=><div key={x.id} className="p-4"><div className="flex justify-between gap-3"><div><span className="text-xs uppercase tracking-wide font-semibold">{x.channel}</span><span className="text-xs text-gray-500 ml-2">{x.customer_name||'Customer'}</span></div><span className="text-xs capitalize text-gray-500">{x.delivery_status||x.status}</span></div><p className="text-sm font-medium mt-1">{x.recipient}</p>{x.subject&&<p className="text-sm">{x.subject}</p>}<p className="text-xs text-gray-500 mt-1 line-clamp-2">{x.message}</p>{x.error_message&&<p className="text-xs text-destructive mt-1">{x.error_message}</p>}<div className="mt-3 flex gap-3 text-xs">{x.status==='failed'&&<button className="text-primary font-medium" onClick={()=>void retry(x.id)}>Retry</button>}{x.status==='queued'&&<button className="text-destructive font-medium" onClick={()=>void cancel(x.id)}>Cancel</button>}</div></div>):<p className="p-8 text-center text-sm text-gray-500">No outbound communications match the current filters.</p>}</div></section>\n   <section className="bg-white border rounded-xl overflow-hidden"><div className="p-5 border-b"><h2 className="font-semibold">Inbound customer responses</h2><p className="text-xs text-gray-500 mt-1">Ambiguous and unmatched responses remain visible for staff review.</p></div><div className="divide-y max-h-[28rem] overflow-y-auto">{inbound.length?inbound.map(x=><div key={x.id} className="p-4"><div className="flex justify-between gap-3"><span className="text-xs uppercase font-semibold">{x.channel} · {x.match_status||'matched'}</span><span className="text-xs text-gray-500">{new Date(x.received_at).toLocaleString()}</span></div><p className="text-sm font-medium mt-1">{x.customer_name||x.sender}</p>{x.match_reason&&<p className="text-xs text-amber-700 mt-1">{x.match_reason}</p>}<p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{x.message}</p></div>):<p className="p-8 text-center text-sm text-gray-500">No inbound responses match the current filters.</p>}</div></section></div>\n  </div>\n </div></AdminLayout>\n}\n''')
# verifier
v=root/'scripts/verify-communications-comm-07-09.mjs'
v.write_text(r'''import fs from 'node:fs'; import path from 'node:path';
const root=process.cwd(); const fail=m=>{throw new Error(m)}; const ok=m=>console.log(`PASS ${m}`);
const mig=fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql'));
const latest=mig.find(f=>f.startsWith('20261002160000_communications_comm_07_09_')); if(!latest) fail('COMM-07-09 migration missing');
const sql=fs.readFileSync(path.join(root,'supabase/migrations',latest),'utf8');
for(const x of ['get_customer_communications_self_service_360','get_communications_center_360','get_current_customer_id','require_staff_permission']) sql.includes(x)?ok(`${x} contract present`):fail(`${x} contract missing`);
const portal=fs.readFileSync(path.join(root,'src/pages/portal.tsx'),'utf8');
for(const x of ['getCustomerCommunicationsSelfService360','Communication history','Only communications belonging to your authenticated customer account']) portal.includes(x)?ok(`Customer portal communication contract: ${x}`):fail(`Customer portal communication contract missing: ${x}`);
const admin=fs.readFileSync(path.join(root,'src/pages/admin/communications.tsx'),'utf8');
for(const x of ['get_communications_center_360','Communication Center 360','Unmatched inbound responses','Outbound communications']) admin.includes(x)?ok(`Admin Communication Center contract: ${x}`):fail(`Admin Communication Center contract missing: ${x}`);
ok('COMM-07-09 static sweep complete');
''')
# package script
import json
pkg=root/'package.json'; d=json.loads(pkg.read_text()); d['scripts']['verify:communications-comm-07-09']='node scripts/verify-communications-comm-07-09.mjs'; pkg.write_text(json.dumps(d,indent=2)+'\n')
