import { useCallback, useEffect, useState } from 'react';
import { History, Palette, RotateCcw, Save } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useCMS } from '@/context/CMSContext';
import type { ThemeSetting } from '@/lib/types';

const presets = [
  { name: 'Professional', primary: '#0369a1', secondary: '#f59e0b', accent: '#0369a1' },
  { name: 'Modern Blue', primary: '#1e40af', secondary: '#3b82f6', accent: '#1d4ed8' },
  { name: 'Earthy', primary: '#78350f', secondary: '#a16207', accent: '#92400e' },
  { name: 'Forest', primary: '#14532d', secondary: '#22c55e', accent: '#166534' },
  { name: 'Royal', primary: '#4c1d95', secondary: '#a855f7', accent: '#6b21a8' },
  { name: 'Slate', primary: '#1e293b', secondary: '#64748b', accent: '#334155' },
];
const fonts = ['Inter', 'Space Grotesk', 'Montserrat', 'Open Sans', 'Poppins', 'Roboto', 'Playfair Display', 'Source Sans Pro'];
const buttonStyles = ['rounded', 'pill', 'square'];
const spacingOptions = [6, 8, 10, 12];

type ThemeVersion = {
  id: string;
  version_number: number;
  theme_snapshot: ThemeSetting;
  change_type: 'save' | 'rollback';
  change_note: string | null;
  created_at: string;
};

type GovernanceResponse = { theme: ThemeSetting | null; versions: ThemeVersion[] };

export default function AdminTheme() {
  const [theme, setTheme] = useState<ThemeSetting | null>(null);
  const [versions, setVersions] = useState<ThemeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rollingBack, setRollingBack] = useState<string | null>(null);
  const [changeNote, setChangeNote] = useState('');
  const { toast } = useToast();
  const { refetch: refetchCms } = useCMS();

  const loadGovernance = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_theme_brand_governance_360');
      if (error) throw error;
      const result = (data ?? { theme: null, versions: [] }) as GovernanceResponse;
      setTheme(result.theme);
      setVersions(result.versions ?? []);
    } catch (error) {
      toast({ title: 'Unable to load governed theme', description: error instanceof Error ? error.message : 'Theme governance is unavailable.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void loadGovernance(); }, [loadGovernance]);

  const updateTheme = (updates: Partial<ThemeSetting>) => {
    setTheme((current) => current ? { ...current, ...updates } : current);
  };

  const applyPreset = (preset: typeof presets[number]) => updateTheme({ primary_color: preset.primary, secondary_color: preset.secondary, accent_color: preset.accent, preset: preset.name });

  const handleSave = async () => {
    if (!theme) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('save_theme_brand_version', { p_theme: theme, p_change_note: changeNote || null });
      if (error) throw error;
      const result = data as { theme: ThemeSetting; version_number: number };
      setTheme(result.theme);
      setChangeNote('');
      await Promise.all([refetchCms(), loadGovernance()]);
      toast({ title: `Theme saved as version ${result.version_number}` });
    } catch (error) {
      toast({ title: 'Failed to save governed theme', description: error instanceof Error ? error.message : 'The theme was not saved.', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleRollback = async (version: ThemeVersion) => {
    if (!window.confirm(`Rollback the live theme to version ${version.version_number}?`)) return;
    setRollingBack(version.id);
    try {
      const { error } = await supabase.rpc('rollback_theme_brand_version', { p_version_id: version.id, p_change_note: `Admin rollback to version ${version.version_number}` });
      if (error) throw error;
      await Promise.all([refetchCms(), loadGovernance()]);
      toast({ title: `Theme rolled back to version ${version.version_number}` });
    } catch (error) {
      toast({ title: 'Rollback failed', description: error instanceof Error ? error.message : 'The theme was not changed.', variant: 'destructive' });
    } finally { setRollingBack(null); }
  };

  if (loading) return <AdminLayout title="Theme Settings"><div className="text-center py-12">Loading governed theme...</div></AdminLayout>;
  if (!theme) return <AdminLayout title="Theme Settings"><div className="p-6 bg-white rounded-xl border">No active theme is configured.</div></AdminLayout>;

  return (
    <AdminLayout title="Theme Settings">
      <div className="max-w-5xl space-y-6">
        <div className="bg-white rounded-xl border p-6 flex items-start justify-between gap-4">
          <div><div className="flex items-center gap-2"><Palette className="w-5 h-5" /><h2 className="font-semibold">Theme & Brand Governance</h2></div><p className="text-sm text-gray-500 mt-1">Changes are versioned, auditable, and reversible.</p></div>
          <span className="text-xs font-semibold rounded-full px-3 py-1 bg-green-100 text-green-700">GOVERNED</span>
        </div>

        <section className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">Color Presets</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            {presets.map((preset) => <button key={preset.name} type="button" onClick={() => applyPreset(preset)} className="group"><div className="h-16 rounded-lg shadow-sm ring-2 ring-transparent group-hover:ring-primary-500 transition-all" style={{ background: `linear-gradient(135deg, ${preset.primary} 0 50%, ${preset.secondary} 50% 100%)` }} /><p className="text-xs text-center mt-2 text-gray-600">{preset.name}</p></button>)}
          </div>
        </section>

        <section className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-1">Custom Colors</h2><p className="text-sm text-gray-500 mb-4">All three brand colors are live and governed.</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {([['Primary Color','primary_color','#0369a1'],['Secondary Color','secondary_color','#f59e0b'],['Accent Color','accent_color','#0369a1']] as const).map(([label,key,fallback]) => <div key={key}><label className="block text-sm font-medium text-gray-700 mb-2">{label}</label><div className="flex gap-3"><input type="color" value={theme[key] || fallback} onChange={(e) => updateTheme({ [key]: e.target.value })} className="w-12 h-12 rounded border cursor-pointer" /><input type="text" value={theme[key] || fallback} onChange={(e) => updateTheme({ [key]: e.target.value })} className="input flex-1 font-mono text-sm" /></div></div>)}
          </div>
        </section>

        <section className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">Typography & Layout</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <label className="text-sm font-medium text-gray-700">Heading Font<select value={theme.heading_font} onChange={(e) => updateTheme({ heading_font: e.target.value })} className="input mt-2 w-full">{fonts.map((font) => <option key={font}>{font}</option>)}</select></label>
            <label className="text-sm font-medium text-gray-700">Body Font<select value={theme.body_font} onChange={(e) => updateTheme({ body_font: e.target.value })} className="input mt-2 w-full">{fonts.map((font) => <option key={font}>{font}</option>)}</select></label>
            <label className="text-sm font-medium text-gray-700">Button Style<select value={theme.button_style} onChange={(e) => updateTheme({ button_style: e.target.value })} className="input mt-2 w-full">{buttonStyles.map((style) => <option key={style}>{style}</option>)}</select></label>
            <label className="text-sm font-medium text-gray-700">Spacing Scale<select value={theme.spacing_scale} onChange={(e) => updateTheme({ spacing_scale: Number(e.target.value) })} className="input mt-2 w-full">{spacingOptions.map((value) => <option key={value} value={value}>{value}px</option>)}</select></label>
          </div>
          <label className="block text-sm font-medium text-gray-700 mt-5">Border Radius<input type="number" min={0} max={32} value={theme.border_radius} onChange={(e) => updateTheme({ border_radius: Number(e.target.value) })} className="input mt-2 max-w-xs" /></label>
        </section>

        <section className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-3"><Save className="w-5 h-5" /><h2 className="font-semibold">Publish Governed Theme</h2></div>
          <label className="block text-sm font-medium text-gray-700">Change note<textarea value={changeNote} onChange={(e) => setChangeNote(e.target.value)} placeholder="Describe why this theme change is being published" className="input mt-2 min-h-20 w-full" /></label>
          <button type="button" onClick={() => void handleSave()} disabled={saving} className="btn-primary mt-4 inline-flex items-center gap-2"><Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Theme Version'}</button>
        </section>

        <section className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-4"><History className="w-5 h-5" /><h2 className="font-semibold">Theme Version History</h2></div>
          {versions.length === 0 ? <p className="text-sm text-gray-500">No theme versions have been recorded yet.</p> : <div className="divide-y">{versions.map((version) => <div key={version.id} className="py-4 flex items-center justify-between gap-4"><div><p className="font-medium">Version {version.version_number} <span className="text-xs uppercase text-gray-500 ml-2">{version.change_type}</span></p><p className="text-sm text-gray-500">{version.change_note || 'No change note'} · {new Date(version.created_at).toLocaleString()}</p></div><button type="button" onClick={() => void handleRollback(version)} disabled={rollingBack !== null} className="inline-flex items-center gap-2 px-3 py-2 rounded border text-sm hover:bg-gray-50"><RotateCcw className="w-4 h-4" />{rollingBack === version.id ? 'Rolling back...' : 'Rollback'}</button></div>)}</div>}
        </section>
      </div>
    </AdminLayout>
  );
}
