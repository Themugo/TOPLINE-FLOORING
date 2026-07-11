import { useState, useEffect } from 'react';
import { Eye, EyeOff, Settings2, Save, Plus, Trash2 } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/ui/image-upload';
import type { HomepageSection } from '@/lib/types';

export default function AdminHomepageBuilder() {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    const { data } = await supabase.from('homepage_sections').select('*').order('display_order');
    setSections(data || []);
    setLoading(false);
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await supabase.from('homepage_sections').update({ is_active: !isActive }).eq('id', id);
    fetchSections();
  };

  const updateSection = async (id: string, updates: Partial<HomepageSection>) => {
    const { error } = await supabase.from('homepage_sections').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      toast({ title: 'Failed to save section', variant: 'destructive' });
      return;
    }
    fetchSections();
    toast({ title: 'Section updated - changes are live on your homepage now' });
    setEditing(null);
  };

  const moveSection = async (id: string, direction: 'up' | 'down') => {
    const idx = sections.findIndex(s => s.id === id);
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sections.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const current = sections[idx];
    const swap = sections[swapIdx];

    await supabase.from('homepage_sections').update({ display_order: swap.display_order }).eq('id', current.id);
    await supabase.from('homepage_sections').update({ display_order: current.display_order }).eq('id', swap.id);
    fetchSections();
  };

  const sectionTypeLabels: Record<string, string> = {
    hero: 'Hero Slider',
    services: 'Services',
    about: 'About Us',
    products: 'Products/Materials',
    testimonials: 'Testimonials',
    partners: 'Partners',
    cta: 'Call to Action',
  };

  if (loading) return <AdminLayout title="Homepage Builder"><div className="text-center py-12">Loading...</div></AdminLayout>;

  return (
    <AdminLayout title="Homepage Builder">
      <div className="max-w-3xl">
        <div className="mb-6 bg-blue-50 text-blue-700 text-sm rounded-lg p-4">
          This controls everything on your live homepage - text, photos, colors, and the order sections
          appear in. Click the gear icon on any section to edit it. Changes save instantly to the site.
        </div>

        <div className="space-y-3">
          {sections.map((section, idx) => (
            <div
              key={section.id}
              className={`bg-white rounded-xl border p-4 flex items-center gap-4 transition-all ${
                !section.is_active ? 'opacity-60' : ''
              }`}
            >
              {section.background_image && (
                <img src={section.background_image} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0 hidden sm:block" />
              )}

              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveSection(section.id, 'up')}
                  disabled={idx === 0}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <span className="text-xs">up</span>
                </button>
                <button
                  onClick={() => moveSection(section.id, 'down')}
                  disabled={idx === sections.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <span className="text-xs">dn</span>
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {sectionTypeLabels[section.section_type] || section.section_type}
                  </span>
                  <span className="text-xs text-gray-400">Order: {section.display_order}</span>
                </div>
                <h3 className="font-medium text-gray-900 mt-1 truncate">{section.title || 'Untitled'}</h3>
                {section.subtitle && <p className="text-sm text-gray-500 truncate">{section.subtitle}</p>}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setEditing(editing === section.id ? null : section.id)}
                  className="p-2 text-gray-400 hover:text-gray-700"
                  title="Edit section"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleActive(section.id, section.is_active)}
                  className="p-2 text-gray-400 hover:text-gray-700"
                  title={section.is_active ? 'Hide from homepage' : 'Show on homepage'}
                >
                  {section.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Edit Modal */}
        {editing && (() => {
          const section = sections.find(s => s.id === editing);
          if (!section) return null;
          return <SectionEditor section={section} onSave={(updates) => updateSection(section.id, updates)} onClose={() => setEditing(null)} />;
        })()}
      </div>
    </AdminLayout>
  );
}

interface AboutStat {
  value: string;
  label: string;
}

function SectionEditor({ section, onSave, onClose }: { section: HomepageSection; onSave: (u: Partial<HomepageSection>) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    title: section.title || '',
    subtitle: section.subtitle || '',
    background_color: section.background_color || '',
    background_image: section.background_image || '',
    padding: section.padding || 'py-16',
    content: section.content || {},
  });

  const aboutStats: AboutStat[] = Array.isArray(form.content.stats) ? form.content.stats : [];

  const updateAboutStat = (index: number, field: keyof AboutStat, value: string) => {
    const next = [...aboutStats];
    next[index] = { ...next[index], [field]: value };
    setForm({ ...form, content: { ...form.content, stats: next } });
  };

  const addAboutStat = () => {
    setForm({ ...form, content: { ...form.content, stats: [...aboutStats, { value: '', label: '' }] } });
  };

  const removeAboutStat = (index: number) => {
    setForm({ ...form, content: { ...form.content, stats: aboutStats.filter((_, i) => i !== index) } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-semibold text-lg mb-4">Edit Section</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {section.section_type === 'about' ? 'Heading' : 'Title'}
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subtitle {section.section_type === 'cta' && '(shown under the heading)'}
            </label>
            <input
              type="text"
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              className="input"
            />
          </div>

          {/* About-specific content */}
          {section.section_type === 'about' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Paragraph</label>
                <textarea
                  value={form.content.paragraph_1 || ''}
                  onChange={(e) => setForm({ ...form, content: { ...form.content, paragraph_1: e.target.value } })}
                  className="input min-h-[80px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Second Paragraph</label>
                <textarea
                  value={form.content.paragraph_2 || ''}
                  onChange={(e) => setForm({ ...form, content: { ...form.content, paragraph_2: e.target.value } })}
                  className="input min-h-[80px]"
                />
              </div>
              <ImageUpload
                label="About Photo"
                value={form.content.image_url || ''}
                onChange={(url) => setForm({ ...form, content: { ...form.content, image_url: url } })}
                folder="homepage"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Stats (e.g. "10+ Years")</label>
                <div className="space-y-2">
                  {aboutStats.map((stat, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        placeholder="Value (10+)"
                        value={stat.value}
                        onChange={(e) => updateAboutStat(i, 'value', e.target.value)}
                        className="input flex-1"
                      />
                      <input
                        placeholder="Label (Years)"
                        value={stat.label}
                        onChange={(e) => updateAboutStat(i, 'label', e.target.value)}
                        className="input flex-1"
                      />
                      <button type="button" onClick={() => removeAboutStat(i)} className="p-2 text-red-500 flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addAboutStat} className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add Stat
                </button>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
            <div className="flex items-center gap-3">
              <select
                value={form.background_color}
                onChange={(e) => setForm({ ...form, background_color: e.target.value })}
                className="input flex-1"
              >
                <option value="">None (transparent)</option>
                <option value="#ffffff">White</option>
                <option value="#f9fafb">Gray 50</option>
                <option value="#f3f4f6">Gray 100</option>
                <option value="#c9971f">Primary Gold</option>
                <option value="#141a26">Navy Dark</option>
              </select>
              <input
                type="color"
                value={form.background_color || '#ffffff'}
                onChange={(e) => setForm({ ...form, background_color: e.target.value })}
                className="w-10 h-10 rounded border cursor-pointer flex-shrink-0"
                title="Pick a custom color"
              />
            </div>
          </div>

          <ImageUpload
            label="Background Image (optional - overlays the color above)"
            value={form.background_image}
            onChange={(url) => setForm({ ...form, background_image: url })}
            folder="homepage"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Padding</label>
            <select
              value={form.padding}
              onChange={(e) => setForm({ ...form, padding: e.target.value })}
              className="input"
            >
              <option value="py-0">None</option>
              <option value="py-8">Small</option>
              <option value="py-12">Medium</option>
              <option value="py-16">Large</option>
              <option value="py-24">Extra Large</option>
            </select>
          </div>

          {section.section_type === 'hero' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slide Interval (ms)</label>
                <input
                  type="number"
                  value={form.content.slide_interval || 6000}
                  onChange={(e) => setForm({ ...form, content: { ...form.content, slide_interval: parseInt(e.target.value) } })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Overlay Opacity (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.content.overlay_opacity || 60}
                  onChange={(e) => setForm({ ...form, content: { ...form.content, overlay_opacity: parseInt(e.target.value) } })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transition</label>
                <select
                  value={form.content.transition || 'fade'}
                  onChange={(e) => setForm({ ...form, content: { ...form.content, transition: e.target.value } })}
                  className="input"
                >
                  <option value="fade">Fade</option>
                  <option value="slide">Slide</option>
                </select>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.content.show_featured_products !== false}
                  onChange={(e) => setForm({ ...form, content: { ...form.content, show_featured_products: e.target.checked } })}
                />
                <span className="text-sm">Show Featured Products</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.content.show_featured_services !== false}
                  onChange={(e) => setForm({ ...form, content: { ...form.content, show_featured_services: e.target.checked } })}
                />
                <span className="text-sm">Show Featured Services</span>
              </label>
            </>
          )}

          {section.section_type === 'products' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Products to Show</label>
              <select
                value={form.content.limit || 6}
                onChange={(e) => setForm({ ...form, content: { ...form.content, limit: parseInt(e.target.value) } })}
                className="input"
              >
                <option value={3}>3</option>
                <option value={6}>6</option>
                <option value={9}>9</option>
                <option value={12}>12</option>
              </select>
            </div>
          )}

          {section.section_type === 'cta' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
                <input
                  type="text"
                  value={form.content.cta_text || ''}
                  onChange={(e) => setForm({ ...form, content: { ...form.content, cta_text: e.target.value } })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Button Link</label>
                <input
                  type="text"
                  value={form.content.cta_link || ''}
                  onChange={(e) => setForm({ ...form, content: { ...form.content, cta_link: e.target.value } })}
                  className="input"
                  placeholder="/quotation"
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={() => onSave(form)} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
