import { useState, useEffect } from 'react';
import { Palette } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
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

export default function AdminTheme() {
  const [theme, setTheme] = useState<ThemeSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTheme();
  }, []);

  const fetchTheme = async () => {
    const { data } = await supabase.from('theme_settings').select('*').eq('is_active', true).single();
    setTheme(data || null);
    setLoading(false);
  };

  const applyPreset = (preset: typeof presets[0]) => {
    if (theme) {
      setTheme({ ...theme, primary_color: preset.primary, secondary_color: preset.secondary, accent_color: preset.accent });
    }
  };

  const handleSave = async () => {
    if (!theme) return;
    setSaving(true);
    try {
      await supabase.from('theme_settings').update({ ...theme, updated_at: new Date().toISOString() }).eq('id', theme.id);
      toast({ title: 'Theme saved successfully' });
    } catch {
      toast({ title: 'Failed to save theme', variant: 'destructive' });
    }
    setSaving(false);
  };

  const updateTheme = (updates: Partial<ThemeSetting>) => {
    if (theme) setTheme({ ...theme, ...updates });
  };

  if (loading) return <AdminLayout title="Theme Settings"><div className="text-center py-12">Loading...</div></AdminLayout>;

  return (
    <AdminLayout title="Theme Settings">
      <div className="max-w-4xl">
        {/* Color Presets */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Color Presets</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            {presets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="relative group"
              >
                <div
                  className="h-16 rounded-lg overflow-hidden shadow-sm ring-2 ring-transparent hover:ring-primary-500 transition-all"
                  style={{ background: `linear-gradient(135deg, ${preset.primary} 0%, ${preset.primary} 50%, ${preset.secondary} 50%, ${preset.secondary} 100%)` }}
                />
                <p className="text-xs text-center mt-2 text-gray-600">{preset.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Colors */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-semibold text-gray-900">Custom Colors</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            <strong className="text-green-700">Primary Color is live</strong> - it updates buttons, links, and
            accents across the whole site (and admin) immediately on save. Secondary and Accent
            are saved for future use but not yet applied anywhere.
          </p>
          <div className="grid sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                Primary Color
                <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">LIVE</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={theme?.primary_color || '#0369a1'}
                  onChange={(e) => updateTheme({ primary_color: e.target.value })}
                  className="w-12 h-12 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={theme?.primary_color || '#0369a1'}
                  onChange={(e) => updateTheme({ primary_color: e.target.value })}
                  className="input flex-1 font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={theme?.secondary_color || '#f59e0b'}
                  onChange={(e) => updateTheme({ secondary_color: e.target.value })}
                  className="w-12 h-12 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={theme?.secondary_color || '#f59e0b'}
                  onChange={(e) => updateTheme({ secondary_color: e.target.value })}
                  className="input flex-1 font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={theme?.accent_color || '#0369a1'}
                  onChange={(e) => updateTheme({ accent_color: e.target.value })}
                  className="w-12 h-12 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={theme?.accent_color || '#0369a1'}
                  onChange={(e) => updateTheme({ accent_color: e.target.value })}
                  className="input flex-1 font-mono text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Typography */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-1">Typography</h2>
          <p className="text-sm text-gray-500 mb-4">
            Saved for future use - not yet applied to the live site, which currently uses a
            fixed font pairing chosen to match your brand.
          </p>
          <div className="grid sm:grid-cols-2 gap-6 opacity-60 pointer-events-none">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Heading Font</label>
              <select
                value={theme?.heading_font || 'Space Grotesk'}
                onChange={(e) => updateTheme({ heading_font: e.target.value })}
                className="input"
              >
                {fonts.map((font) => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Body Font</label>
              <select
                value={theme?.body_font || 'Inter'}
                onChange={(e) => updateTheme({ body_font: e.target.value })}
                className="input"
              >
                {fonts.map((font) => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Layout */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Layout & Styling</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                Button Style
                <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">LIVE</span>
              </label>
              <select
                value={theme?.button_style || 'rounded'}
                onChange={(e) => updateTheme({ button_style: e.target.value })}
                className="input"
              >
                {buttonStyles.map((style) => (
                  <option key={style} value={style}>{style.charAt(0).toUpperCase() + style.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="opacity-60 pointer-events-none">
              <label className="block text-sm font-medium text-gray-700 mb-2">Border Radius</label>
              <input
                type="number"
                min={0}
                max={24}
                value={theme?.border_radius || 8}
                onChange={(e) => updateTheme({ border_radius: parseInt(e.target.value) })}
                className="input"
              />
              <p className="text-xs text-gray-500 mt-1">Not yet applied - use Button Style above instead</p>
            </div>
            <div className="opacity-60 pointer-events-none">
              <label className="block text-sm font-medium text-gray-700 mb-2">Spacing Scale</label>
              <select
                value={theme?.spacing_scale || 8}
                onChange={(e) => updateTheme({ spacing_scale: parseInt(e.target.value) })}
                className="input"
              >
                {spacingOptions.map((s) => (
                  <option key={s} value={s}>{s}px</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Not yet applied to the live site</p>
            </div>
          </div>
        </div>

        {/* Homepage Layout */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-1">Homepage Layout</h2>
          <p className="text-sm text-gray-500 mb-4">
            Switch how the Services and Materials Shop sections are arranged on your homepage.
            Changes apply instantly to the live site.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <button
              onClick={() => updateTheme({ layout_style: 'classic' })}
              className={`text-left rounded-xl border-2 p-4 transition-all ${
                (theme?.layout_style || 'classic') === 'classic' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="grid grid-cols-4 gap-1 mb-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-navy-200 rounded" />
                ))}
              </div>
              <p className="font-medium text-sm text-gray-900">Classic Grid</p>
              <p className="text-xs text-gray-500">Even tile grid - clean and familiar</p>
            </button>

            <button
              onClick={() => updateTheme({ layout_style: 'showcase' })}
              className={`text-left rounded-xl border-2 p-4 transition-all ${
                theme?.layout_style === 'showcase' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex gap-1 mb-3">
                <div className="w-1/3 aspect-[3/4] bg-navy-300 rounded" />
                <div className="flex-1 grid grid-cols-2 gap-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="aspect-square bg-navy-200 rounded" />
                  ))}
                </div>
              </div>
              <p className="font-medium text-sm text-gray-900">Showcase</p>
              <p className="text-xs text-gray-500">Horizontal scroll services + featured-first product grid</p>
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Live Preview</h2>
          <div className="rounded-lg border p-4" style={{ fontFamily: theme?.body_font }}>
            <h3 className="text-lg font-semibold mb-3" style={{ fontFamily: theme?.heading_font, color: theme?.primary_color }}>
              Sample Heading
            </h3>
            <p className="text-gray-600 mb-4">This is how your body text will look. The theme settings change the overall appearance of your website.</p>
            <div className="flex gap-3">
              <button
                className="px-4 py-2 text-white font-medium"
                style={{
                  backgroundColor: theme?.primary_color,
                  borderRadius: theme?.button_style === 'pill' ? 9999 : theme?.button_style === 'square' ? 0 : `${theme?.border_radius}px`
                }}
              >
                Primary Button
              </button>
              <button
                className="px-4 py-2 text-white font-medium"
                style={{
                  backgroundColor: theme?.secondary_color,
                  borderRadius: theme?.button_style === 'pill' ? 9999 : theme?.button_style === 'square' ? 0 : `${theme?.border_radius}px`
                }}
              >
                Secondary Button
              </button>
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            <Palette className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Theme'}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
