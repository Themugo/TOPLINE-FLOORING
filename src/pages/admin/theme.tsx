import { useState, useEffect } from 'react';
import { Palette, Check, Eye, X, Plus } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ThemeSetting } from '@/lib/types';

const presets = [
  { name: 'Corporate', primary: '#1e40af', secondary: '#3b82f6', accent: '#1d4ed8' },
  { name: 'Modern', primary: '#0f172a', secondary: '#6366f1', accent: '#4338ca' },
  { name: 'Industrial', primary: '#451a03', secondary: '#ea580c', accent: '#c2410c' },
  { name: 'Construction', primary: '#713f12', secondary: '#eab308', accent: '#a16207' },
  { name: 'Elegant', primary: '#1a1a2e', secondary: '#cbd5e1', accent: '#4f46e5' },
  { name: 'Premium', primary: '#3f0e40', secondary: '#d946ef', accent: '#9333ea' },
];

const fonts = ['Inter', 'Space Grotesk', 'Montserrat', 'Open Sans', 'Poppins', 'Roboto', 'Playfair Display', 'Source Sans Pro'];
const buttonStyles = ['rounded', 'pill', 'square'];
const spacingOptions = [6, 8, 10, 12];

export default function AdminTheme() {
  const [theme, setTheme] = useState<ThemeSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [customPresets, setCustomPresets] = useState<{ name: string; primary: string; secondary: string; accent: string }[]>([]);
  const [savingPreset, setSavingPreset] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showPresetInput, setShowPresetInput] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    fetchTheme();
    loadCustomPresets();
  }, [supabase]);

  const fetchTheme = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('theme_settings').select('*').eq('is_active', true).single();
    setTheme(data || null);
    setLoading(false);
  };

  const loadCustomPresets = () => {
    try {
      const stored = localStorage.getItem('theme_custom_presets');
      if (stored) setCustomPresets(JSON.parse(stored));
    } catch {}
  };

  const saveCustomPresets = (presets: { name: string; primary: string; secondary: string; accent: string }[]) => {
    setCustomPresets(presets);
    localStorage.setItem('theme_custom_presets', JSON.stringify(presets));
  };

  const applyPreset = (preset: typeof presets[0]) => {
    if (theme) {
      setTheme({ ...theme, primary_color: preset.primary, secondary_color: preset.secondary, accent_color: preset.accent });
    }
  };

  const handleSavePreset = () => {
    if (!presetName.trim() || !theme) return;
    const newPreset = {
      name: presetName.trim(),
      primary: theme.primary_color,
      secondary: theme.secondary_color,
      accent: theme.accent_color,
    };
    const updated = [...customPresets, newPreset];
    saveCustomPresets(updated);
    setPresetName('');
    setShowPresetInput(false);
    toast({ title: `Preset "${newPreset.name}" saved` });
  };

  const handleSave = async () => {
    if (!theme || !supabase) return;
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

  const allPresets = [...presets, ...customPresets];

  if (loading) return <AdminLayout title="Theme Settings"><div className="text-center py-12">Loading...</div></AdminLayout>;

  return (
    <AdminLayout title="Theme Settings">
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div />
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Color Presets</h2>
            <div className="flex items-center gap-2">
              {showPresetInput ? (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Preset name..."
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    className="h-9 w-40"
                  />
                  <Button size="sm" onClick={handleSavePreset} disabled={!presetName.trim()}>
                    <Check className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowPresetInput(false); setPresetName(''); }}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setShowPresetInput(true)}>
                  <Plus className="w-3 h-3 mr-1" />
                  Save as New Preset
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            {allPresets.map((preset) => (
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

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Custom Colors</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={theme?.primary_color || '#1e40af'}
                  onChange={(e) => updateTheme({ primary_color: e.target.value })}
                  className="w-12 h-12 rounded border cursor-pointer"
                />
                <Input
                  type="text"
                  value={theme?.primary_color || '#1e40af'}
                  onChange={(e) => updateTheme({ primary_color: e.target.value })}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={theme?.secondary_color || '#3b82f6'}
                  onChange={(e) => updateTheme({ secondary_color: e.target.value })}
                  className="w-12 h-12 rounded border cursor-pointer"
                />
                <Input
                  type="text"
                  value={theme?.secondary_color || '#3b82f6'}
                  onChange={(e) => updateTheme({ secondary_color: e.target.value })}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={theme?.accent_color || '#1d4ed8'}
                  onChange={(e) => updateTheme({ accent_color: e.target.value })}
                  className="w-12 h-12 rounded border cursor-pointer"
                />
                <Input
                  type="text"
                  value={theme?.accent_color || '#1d4ed8'}
                  onChange={(e) => updateTheme({ accent_color: e.target.value })}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Typography</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Heading Font</label>
              <Select
                value={theme?.heading_font || 'Space Grotesk'}
                onValueChange={(value) => updateTheme({ heading_font: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select font" />
                </SelectTrigger>
                <SelectContent>
                  {fonts.map((font) => (
                    <SelectItem key={font} value={font}>{font}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Body Font</label>
              <Select
                value={theme?.body_font || 'Inter'}
                onValueChange={(value) => updateTheme({ body_font: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select font" />
                </SelectTrigger>
                <SelectContent>
                  {fonts.map((font) => (
                    <SelectItem key={font} value={font}>{font}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Layout & Styling</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Button Style</label>
              <Select
                value={theme?.button_style || 'rounded'}
                onValueChange={(value) => updateTheme({ button_style: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent>
                  {buttonStyles.map((style) => (
                    <SelectItem key={style} value={style}>{style.charAt(0).toUpperCase() + style.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Border Radius</label>
              <Input
                type="number"
                min={0}
                max={24}
                value={theme?.border_radius || 8}
                onChange={(e) => updateTheme({ border_radius: parseInt(e.target.value) })}
              />
              <p className="text-xs text-gray-500 mt-1">Pixels</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Spacing Scale</label>
              <Select
                value={String(theme?.spacing_scale || 8)}
                onValueChange={(value) => updateTheme({ spacing_scale: parseInt(value) })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select spacing" />
                </SelectTrigger>
                <SelectContent>
                  {spacingOptions.map((s) => (
                    <SelectItem key={s} value={String(s)}>{s}px</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Palette className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Theme'}
          </Button>
        </div>
      </div>

      {showPreview && theme && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto">
          <div className="relative w-full max-w-5xl mx-auto my-8">
            <div className="sticky top-0 z-10 flex items-center justify-between bg-white border-b px-6 py-3 rounded-t-xl">
              <h2 className="font-semibold text-gray-900">Theme Preview</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div
              className="bg-white p-8 rounded-b-xl shadow-2xl"
              style={{
                fontFamily: theme.body_font,
                '--preview-primary': theme.primary_color,
                '--preview-secondary': theme.secondary_color,
                '--preview-accent': theme.accent_color,
                '--preview-radius': theme.button_style === 'pill' ? '9999px' : theme.button_style === 'square' ? '0px' : `${theme.border_radius}px`,
                '--preview-spacing': `${theme.spacing_scale}px`,
              } as React.CSSProperties}
            >
              <div style={{ fontFamily: theme.heading_font, color: theme.primary_color }} className="text-4xl font-bold mb-2">
                Welcome to Topline Flooring
              </div>
              <p className="text-gray-600 text-lg mb-8" style={{ paddingBottom: `${theme.spacing_scale}px` }}>
                Premium flooring solutions for your space.
              </p>

              <div className="grid md:grid-cols-2 gap-8 mb-10">
                <div className="rounded-xl overflow-hidden shadow-md" style={{ borderRadius: `${theme.border_radius}px` }}>
                  <div className="h-48" style={{ backgroundColor: theme.primary_color }} />
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2" style={{ fontFamily: theme.heading_font, color: theme.primary_color }}>
                      Luxury Vinyl Planks
                    </h3>
                    <p className="text-gray-600 mb-4">Durable, waterproof, and beautiful flooring for every room.</p>
                    <div className="flex gap-3">
                      <button
                        style={{
                          backgroundColor: theme.primary_color,
                          color: '#fff',
                          borderRadius: theme.button_style === 'pill' ? 9999 : theme.button_style === 'square' ? 0 : `${theme.border_radius}px`,
                          padding: `${theme.spacing_scale}px ${theme.spacing_scale * 2}px`,
                        }}
                        className="font-medium text-sm"
                      >
                        Shop Now
                      </button>
                      <button
                        style={{
                          backgroundColor: 'transparent',
                          color: theme.primary_color,
                          border: `2px solid ${theme.primary_color}`,
                          borderRadius: theme.button_style === 'pill' ? 9999 : theme.button_style === 'square' ? 0 : `${theme.border_radius}px`,
                          padding: `${theme.spacing_scale}px ${theme.spacing_scale * 2}px`,
                        }}
                        className="font-medium text-sm"
                      >
                        Learn More
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl overflow-hidden shadow-md" style={{ borderRadius: `${theme.border_radius}px` }}>
                  <div className="h-48" style={{ backgroundColor: theme.secondary_color }} />
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2" style={{ fontFamily: theme.heading_font, color: theme.primary_color }}>
                      Hardwood Collection
                    </h3>
                    <p className="text-gray-600 mb-4">Timeless elegance with modern durability.</p>
                    <div className="flex gap-3">
                      <button
                        style={{
                          backgroundColor: theme.secondary_color,
                          color: '#fff',
                          borderRadius: theme.button_style === 'pill' ? 9999 : theme.button_style === 'square' ? 0 : `${theme.border_radius}px`,
                          padding: `${theme.spacing_scale}px ${theme.spacing_scale * 2}px`,
                        }}
                        className="font-medium text-sm"
                      >
                        Shop Now
                      </button>
                      <button
                        style={{
                          backgroundColor: 'transparent',
                          color: theme.secondary_color,
                          border: `2px solid ${theme.secondary_color}`,
                          borderRadius: theme.button_style === 'pill' ? 9999 : theme.button_style === 'square' ? 0 : `${theme.border_radius}px`,
                          padding: `${theme.spacing_scale}px ${theme.spacing_scale * 2}px`,
                        }}
                        className="font-medium text-sm"
                      >
                        Learn More
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl p-8 text-white text-center" style={{ backgroundColor: theme.accent_color }}>
                <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: theme.heading_font }}>
                  Get a Free Quote Today
                </h2>
                <p className="mb-6 opacity-90">Contact us for professional installation and pricing.</p>
                <button
                  style={{
                    backgroundColor: '#fff',
                    color: theme.accent_color,
                    fontWeight: 600,
                    borderRadius: theme.button_style === 'pill' ? 9999 : theme.button_style === 'square' ? 0 : `${theme.border_radius}px`,
                    padding: `${theme.spacing_scale}px ${theme.spacing_scale * 3}px`,
                  }}
                  className="text-sm"
                >
                  Contact Us
                </button>
              </div>

              <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-500">
                <span>Primary: {theme.primary_color}</span>
                <span>Secondary: {theme.secondary_color}</span>
                <span>Accent: {theme.accent_color}</span>
                <span>Font: {theme.body_font}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
