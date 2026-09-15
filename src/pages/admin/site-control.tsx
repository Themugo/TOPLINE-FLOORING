import { useCallback, useEffect, useState } from 'react';
import { Code2, MailCheck, Save, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

type Token = { id: string; token_key: string; token_value: string; token_type: string; description: string | null; is_active: boolean };
type Flag = { id: string; flag_key: string; label: string; description: string | null; is_enabled: boolean; config: Record<string, unknown> };
type Integration = { id: string; integration_key: string; channel: string; provider: string; is_enabled: boolean; public_config: Record<string, unknown>; required_secret_env: string | null; secret_configured: boolean; status: string; last_tested_at: string | null; last_test_message: string | null };

const CSS_BLOCKED = /@import|url\s*\(|expression\s*\(|javascript\s*:|behavior\s*:|-moz-binding/i;

export default function AdminSiteControl() {
  const [tab, setTab] = useState<'design'|'integrations'|'features'>('design');
  const [tokens, setTokens] = useState<Token[]>([]);
  const [css, setCss] = useState('');
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [testingBrevo, setTestingBrevo] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tokenRes, cssRes, intRes, flagRes] = await Promise.all([
        supabase.from('site_design_tokens').select('*').order('token_key'),
        supabase.from('site_settings').select('setting_value').eq('setting_key', 'custom_css').maybeSingle(),
        supabase.from('site_integration_configs').select('*').order('channel').order('integration_key'),
        supabase.from('site_feature_flags').select('*').order('flag_key'),
      ]);
      if (tokenRes.error) throw tokenRes.error;
      if (cssRes.error) throw cssRes.error;
      if (intRes.error) throw intRes.error;
      if (flagRes.error) throw flagRes.error;
      setTokens((tokenRes.data ?? []) as Token[]);
      const rawCss = cssRes.data?.setting_value;
      setCss(typeof rawCss === 'string' ? rawCss : (rawCss?.css ?? ''));
      setIntegrations((intRes.data ?? []) as Integration[]);
      setFlags((flagRes.data ?? []) as Flag[]);
    } catch (error) {
      toast({ title: 'Unable to load site control plane', description: error instanceof Error ? error.message : 'Access denied or unavailable.', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const saveToken = async (token: Token) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('site_design_tokens').update({ token_value: token.token_value, is_active: token.is_active, updated_at: new Date().toISOString() }).eq('id', token.id);
      if (error) throw error;
      toast({ title: `${token.token_key} saved` });
    } catch (error) { toast({ title: 'Token save failed', description: error instanceof Error ? error.message : 'Unable to save.', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const saveCss = async () => {
    if (CSS_BLOCKED.test(css)) { toast({ title: 'Unsafe CSS rejected', description: 'External imports, URL loading and executable CSS constructs are not permitted.', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('site_settings').upsert({ setting_key: 'custom_css', setting_value: { css }, updated_at: new Date().toISOString() }, { onConflict: 'setting_key' });
      if (error) throw error;
      toast({ title: 'Custom CSS published', description: 'The public site will use the new stylesheet on its next load.' });
    } catch (error) { toast({ title: 'Custom CSS save failed', description: error instanceof Error ? error.message : 'Unable to save.', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const saveIntegration = async (item: Integration) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('site_integration_configs').update({ provider: item.provider, is_enabled: item.is_enabled, public_config: item.public_config, status: item.is_enabled ? item.status : 'disabled', updated_at: new Date().toISOString() }).eq('id', item.id);
      if (error) throw error;
      toast({ title: `${item.integration_key} saved` });
    } catch (error) { toast({ title: 'Integration save failed', description: error instanceof Error ? error.message : 'Unable to save.', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const testBrevo = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testRecipient.trim())) {
      toast({ title: 'Enter a valid test recipient', variant: 'destructive' });
      return;
    }
    setTestingBrevo(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Admin session is no longer available.');
      const { data, error } = await supabase.functions.invoke('brevo-test-email', {
        body: { recipient: testRecipient.trim().toLowerCase() },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Brevo test failed.');
      toast({ title: 'Brevo test accepted', description: data.message_id ? `Provider message ID: ${data.message_id}` : 'Check the recipient mailbox.' });
    } catch (error) {
      toast({ title: 'Brevo test failed', description: error instanceof Error ? error.message : 'Provider unavailable.', variant: 'destructive' });
    } finally { setTestingBrevo(false); }
  };

  const saveFlag = async (item: Flag) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('site_feature_flags').update({ is_enabled: item.is_enabled, config: item.config, updated_at: new Date().toISOString() }).eq('id', item.id);
      if (error) throw error;
      toast({ title: `${item.label} updated` });
    } catch (error) { toast({ title: 'Feature flag save failed', description: error instanceof Error ? error.message : 'Unable to save.', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  if (loading) return <AdminLayout title="Site Control Center"><div className="py-16 text-center text-gray-500">Loading control plane...</div></AdminLayout>;

  return <AdminLayout title="Site Control Center" subtitle="No-code design, integrations and feature controls">
    <div className="max-w-6xl space-y-6">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
        This is the safe no-code boundary: business content, structured layouts, design tokens, provider metadata and feature switches can be changed here. Provider secrets remain in the deployment secret store and are never exposed to browser code.
      </div>
      <div className="flex gap-2 border-b">
        {([['design','Design & CSS',Code2],['integrations','Payments & Messaging',ShieldCheck],['features','Features',SlidersHorizontal]] as const).map(([id,label,Icon]) => <button key={id} onClick={() => setTab(id)} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab===id?'border-primary-600 text-primary-700':'border-transparent text-gray-500'}`}><Icon className="inline w-4 h-4 mr-2" />{label}</button>)}
      </div>

      {tab === 'design' && <div className="space-y-6">
        <section className="bg-white border rounded-xl p-6">
          <h2 className="font-semibold mb-1">Design Tokens</h2><p className="text-sm text-gray-500 mb-5">Change global spacing, width, radius and surface behavior without rebuilding the application.</p>
          <div className="grid md:grid-cols-2 gap-4">{tokens.map((token) => <div key={token.id} className="border rounded-lg p-4"><label className="text-sm font-medium">{token.token_key}</label><p className="text-xs text-gray-500 mb-2">{token.description}</p><div className="flex gap-2"><input value={token.token_value} onChange={e=>setTokens(prev=>prev.map(x=>x.id===token.id?{...x,token_value:e.target.value}:x))} className="input flex-1"/><button disabled={saving} onClick={()=>void saveToken(token)} className="btn-secondary"><Save className="w-4 h-4"/></button></div></div>)}</div>
        </section>
        <section className="bg-white border rounded-xl p-6">
          <h2 className="font-semibold mb-1">Advanced Custom CSS</h2><p className="text-sm text-gray-500 mb-3">For advanced visual redesign. External resource loading and executable CSS constructs are blocked.</p>
          <textarea value={css} onChange={e=>setCss(e.target.value)} className="input font-mono text-xs min-h-[280px]" placeholder=".site-custom-class { ... }" spellCheck={false}/>
          <button disabled={saving} onClick={()=>void saveCss()} className="btn-primary mt-3 inline-flex items-center gap-2"><Save className="w-4 h-4"/>Publish CSS</button>
        </section>
      </div>}

      {tab === 'integrations' && <div className="space-y-4">{integrations.map(item => <section key={item.id} className="bg-white border rounded-xl p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold capitalize">{item.channel}: {item.integration_key}</h2><p className="text-sm text-gray-500 mt-1">Provider configuration is editable here; secret values are intentionally kept outside the browser.</p></div><span className={`text-xs rounded-full px-3 py-1 ${item.is_enabled?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}`}>{item.is_enabled?'ENABLED':'DISABLED'}</span></div><div className="grid md:grid-cols-3 gap-4 mt-5"><label className="text-sm font-medium">Provider<input value={item.provider} onChange={e=>setIntegrations(prev=>prev.map(x=>x.id===item.id?{...x,provider:e.target.value}:x))} className="input mt-1"/></label><label className="text-sm font-medium">Required secret<input value={item.required_secret_env || ''} readOnly className="input mt-1 bg-gray-50 font-mono text-xs"/></label><label className="flex items-center gap-2 text-sm mt-7"><input type="checkbox" checked={item.is_enabled} onChange={e=>setIntegrations(prev=>prev.map(x=>x.id===item.id?{...x,is_enabled:e.target.checked}:x))}/><span>Enable provider</span></label></div><label className="block text-sm font-medium mt-4">Public configuration JSON<textarea value={JSON.stringify(item.public_config ?? {}, null, 2)} onChange={e=>{try{const parsed=JSON.parse(e.target.value);setIntegrations(prev=>prev.map(x=>x.id===item.id?{...x,public_config:parsed}:x));}catch{/* wait for valid JSON */}}} className="input font-mono text-xs min-h-[110px] mt-1"/></label><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div className="text-xs text-gray-500">Secret status: <strong>{item.secret_configured?'configured':'not confirmed'}</strong> · Last test: {item.last_tested_at ? new Date(item.last_tested_at).toLocaleString() : 'never'}</div><div className="flex flex-wrap gap-2">{item.integration_key==='communications.email' && <><input type="email" value={testRecipient} onChange={e=>setTestRecipient(e.target.value)} placeholder="test recipient@example.com" className="input w-64"/><button disabled={testingBrevo} onClick={()=>void testBrevo()} className="btn-secondary"><MailCheck className="w-4 h-4 inline mr-2"/>{testingBrevo?'Testing…':'Test Brevo'}</button></>}<button disabled={saving} onClick={()=>void saveIntegration(item)} className="btn-primary"><Save className="w-4 h-4 inline mr-2"/>Save</button></div></div></section>)}</div>}

      {tab === 'features' && <div className="grid md:grid-cols-2 gap-4">{flags.map(item=><section key={item.id} className="bg-white border rounded-xl p-5"><div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold">{item.label}</h2><p className="text-sm text-gray-500 mt-1">{item.description}</p></div><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={item.is_enabled} onChange={e=>{const next={...item,is_enabled:e.target.checked};setFlags(prev=>prev.map(x=>x.id===item.id?next:x));void saveFlag(next);}}/><span className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"/></label></div></section>)}</div>}
    </div>
  </AdminLayout>;
}
