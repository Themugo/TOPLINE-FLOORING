import { useState } from 'react';
import { Eye, EyeOff, Settings2, Save, Plus, Trash2, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { useHomepageSections } from '@/hooks/use-data';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/ui/image-upload';
import type { HomepageSection } from '@/lib/types';

const SECTION_TYPES: { value: string; label: string }[] = [
  { value: 'hero', label: 'Hero Slider' },
  { value: 'services', label: 'Services' },
  { value: 'about', label: 'About Us' },
  { value: 'products', label: 'Products/Materials' },
  { value: 'testimonials', label: 'Testimonials' },
  { value: 'partners', label: 'Partners' },
  { value: 'cta', label: 'Call to Action' },
];

const SECTION_DEFAULTS: Record<string, Partial<HomepageSection>> = {
  hero: { title: 'Hero Slider', content: { slide_interval: 6000, overlay_opacity: 60, transition: 'fade', show_featured_products: true, show_featured_services: true } },
  services: { title: 'Our Services', subtitle: 'Professional flooring and waterproofing solutions', content: { max_items: 8 } },
  about: { title: 'Who We Are', subtitle: '', content: { paragraph_1: '', paragraph_2: '', image_url: '', stats: [] } },
  products: { title: 'Materials Shop', subtitle: 'Premium materials from trusted brands', content: { limit: 6 } },
  testimonials: { title: 'What Clients Say', subtitle: '', content: { max_items: 4 } },
  partners: { title: 'Our Certified Partners', subtitle: '', content: { max_items: 10 } },
  cta: { title: 'Ready to Start Your Project?', subtitle: 'Get in touch with our team for a free consultation and quotation.', content: { cta_text: 'Get Free Quote', cta_link: '/quotation' } },
};

export default function AdminHomepageBuilder() {
  const { sections, loading, error, updateSection, createSection, deleteSection, refetch } = useHomepageSections();
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const { toast } = useToast();

  const handleToggleActive = async (id: string, isActive: boolean) => {
    setSaving(id);
    try {
      await updateSection(id, { is_active: !isActive });
      toast({ title: isActive ? 'Section hidden from homepage' : 'Section now visible on homepage' });
    } catch {
      toast({ title: 'Failed to update visibility', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const idx = sections.findIndex(s => s.id === id);
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sections.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const current = sections[idx];
    const swap = sections[swapIdx];

    setSaving(id);
    try {
      await updateSection(current.id, { display_order: swap.display_order });
      await updateSection(swap.id, { display_order: current.display_order });
      await refetch();
    } catch {
      toast({ title: 'Failed to reorder sections', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const handleSave = async (id: string, updates: Partial<HomepageSection>) => {
    setSaving(id);
    try {
      await updateSection(id, updates);
      toast({ title: 'Section updated - changes are live on your homepage now' });
      setEditing(null);
    } catch {
      toast({ title: 'Failed to save section', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const handleAdd = async (sectionType: string) => {
    const maxOrder = sections.length > 0 ? Math.max(...sections.map(s => s.display_order)) : 0;
    const defaults = SECTION_DEFAULTS[sectionType] || {};
    try {
      await createSection({
        section_type: sectionType,
        title: defaults.title || sectionType,
        subtitle: defaults.subtitle || '',
        is_active: true,
        display_order: maxOrder + 1,
        background_color: '',
        background_image: '',
        padding: 'py-16',
        content: defaults.content || {},
      });
      toast({ title: `${SECTION_TYPES.find(t => t.value === sectionType)?.label || sectionType} section added` });
      setShowAddMenu(false);
    } catch {
      toast({ title: 'Failed to add section', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Delete the "${label}" section? This cannot be undone.`)) return;
    try {
      await deleteSection(id);
      toast({ title: 'Section deleted' });
      if (editing === id) setEditing(null);
    } catch {
      toast({ title: 'Failed to delete section', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Homepage Builder">
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading sections...
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Homepage Builder">
        <div className="bg-red-50 text-red-700 text-sm rounded-lg p-4">{error}</div>
      </AdminLayout>
    );
  }

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
              } ${saving === section.id ? 'pointer-events-none opacity-70' : ''}`}
            >
              {section.background_image && (
                <img src={section.background_image} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0 hidden sm:block" />
              )}

              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button
                  onClick={() => handleMove(section.id, 'up')}
                  disabled={idx === 0 || saving !== null}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  title="Move up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleMove(section.id, 'down')}
                  disabled={idx === sections.length - 1 || saving !== null}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  title="Move down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {SECTION_TYPES.find(t => t.value === section.section_type)?.label || section.section_type}
                  </span>
                  <span className="text-xs text-gray-400">Order: {section.display_order}</span>
                </div>
                <h3 className="font-medium text-gray-900 mt-1 truncate">{section.title || 'Untitled'}</h3>
                {section.subtitle && <p className="text-sm text-gray-500 truncate">{section.subtitle}</p>}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {saving === section.id && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                <button
                  onClick={() => setEditing(editing === section.id ? null : section.id)}
                  className="p-2 text-gray-400 hover:text-gray-700"
                  title="Edit section"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleToggleActive(section.id, section.is_active)}
                  className="p-2 text-gray-400 hover:text-gray-700"
                  title={section.is_active ? 'Hide from homepage' : 'Show on homepage'}
                >
                  {section.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleDelete(section.id, section.title || section.section_type)}
                  className="p-2 text-gray-400 hover:text-red-600"
                  title="Delete section"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Section */}
        <div className="mt-4 relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            <Plus className="w-4 h-4" /> Add Section
          </button>
          {showAddMenu && (
            <div className="absolute top-full left-0 mt-2 bg-white border rounded-xl shadow-lg p-2 z-20 w-56">
              {SECTION_TYPES.filter(t => !sections.some(s => s.section_type === t.value)).map(t => (
                <button
                  key={t.value}
                  onClick={() => handleAdd(t.value)}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {t.label}
                </button>
              ))}
              {SECTION_TYPES.every(t => sections.some(s => s.section_type === t.value)) && (
                <p className="px-3 py-2 text-sm text-gray-400">All section types already added</p>
              )}
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {editing && (() => {
          const section = sections.find(s => s.id === editing);
          if (!section) return null;
          return (
            <SectionEditor
              section={section}
              onSave={(updates) => handleSave(section.id, updates)}
              onClose={() => setEditing(null)}
              saving={saving === section.id}
            />
          );
        })()}
      </div>
    </AdminLayout>
  );
}

interface AboutStat {
  value: string;
  label: string;
}

function SectionEditor({ section, onSave, onClose, saving }: { section: HomepageSection; onSave: (u: Partial<HomepageSection>) => void; onClose: () => void; saving: boolean }) {
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
        <h2 className="font-semibold text-lg mb-4">
          Edit {SECTION_TYPES.find(t => t.value === section.section_type)?.label || section.section_type}
        </h2>
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

          {/* Hero-specific */}
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
                <span className="text-sm">Show Featured Products in Hero</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.content.show_featured_services !== false}
                  onChange={(e) => setForm({ ...form, content: { ...form.content, show_featured_services: e.target.checked } })}
                />
                <span className="text-sm">Show Featured Services in Hero</span>
              </label>
            </>
          )}

          {/* About-specific */}
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

          {/* Services-specific */}
          {section.section_type === 'services' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Services to Show</label>
              <select
                value={form.content.max_items || 8}
                onChange={(e) => setForm({ ...form, content: { ...form.content, max_items: parseInt(e.target.value) } })}
                className="input"
              >
                <option value={4}>4</option>
                <option value={6}>6</option>
                <option value={8}>8</option>
                <option value={12}>12</option>
              </select>
            </div>
          )}

          {/* Testimonials-specific */}
          {section.section_type === 'testimonials' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Testimonials to Show</label>
              <select
                value={form.content.max_items || 4}
                onChange={(e) => setForm({ ...form, content: { ...form.content, max_items: parseInt(e.target.value) } })}
                className="input"
              >
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={6}>6</option>
              </select>
            </div>
          )}

          {/* Partners-specific */}
          {section.section_type === 'partners' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Partners to Show</label>
              <select
                value={form.content.max_items || 10}
                onChange={(e) => setForm({ ...form, content: { ...form.content, max_items: parseInt(e.target.value) } })}
                className="input"
              >
                <option value={5}>5</option>
                <option value={8}>8</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
              </select>
            </div>
          )}

          {/* Products-specific */}
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

          {/* CTA-specific */}
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

          {/* Common: Background Color */}
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

          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="btn-secondary flex-1" disabled={saving}>Cancel</button>
            <button onClick={() => onSave(form)} className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
