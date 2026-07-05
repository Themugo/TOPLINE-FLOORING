import { useState, useEffect } from 'react';
import { GripVertical, Eye, EyeOff, Settings2, Save } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
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
    await supabase.from('homepage_sections').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    fetchSections();
    toast({ title: 'Section updated' });
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
    hero: 'Hero Section',
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
          Drag sections to reorder. Click the gear icon to configure each section. Toggle visibility with the eye icon.
        </div>

        <div className="space-y-3">
          {sections.map((section, idx) => (
            <div
              key={section.id}
              className={`bg-white rounded-xl border p-4 flex items-center gap-4 transition-all ${
                !section.is_active ? 'opacity-60' : ''
              }`}
            >
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

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {sectionTypeLabels[section.section_type] || section.section_type}
                  </span>
                  <span className="text-xs text-gray-400">Order: {section.display_order}</span>
                </div>
                <h3 className="font-medium text-gray-900 mt-1">{section.title || 'Untitled'}</h3>
                {section.subtitle && <p className="text-sm text-gray-500">{section.subtitle}</p>}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditing(editing === section.id ? null : section.id)}
                  className="p-2 text-gray-400 hover:text-gray-700"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleActive(section.id, section.is_active)}
                  className="p-2 text-gray-400 hover:text-gray-700"
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

function SectionEditor({ section, onSave, onClose }: { section: HomepageSection; onSave: (u: Partial<HomepageSection>) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    title: section.title || '',
    subtitle: section.subtitle || '',
    background_color: section.background_color || '',
    padding: section.padding || 'py-16',
    content: section.content || {},
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="font-semibold text-lg mb-4">Edit Section</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
            <input
              type="text"
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
            <select
              value={form.background_color}
              onChange={(e) => setForm({ ...form, background_color: e.target.value })}
              className="input"
            >
              <option value="">None (transparent)</option>
              <option value="#ffffff">White</option>
              <option value="#f9fafb">Gray 50</option>
              <option value="#f3f4f6">Gray 100</option>
              <option value="#0369a1">Primary Blue</option>
              <option value="#1e293b">Dark</option>
            </select>
          </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">CTA Text</label>
                <input
                  type="text"
                  value={form.content.cta_text || ''}
                  onChange={(e) => setForm({ ...form, content: { ...form.content, cta_text: e.target.value } })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CTA Link</label>
                <input
                  type="text"
                  value={form.content.cta_link || ''}
                  onChange={(e) => setForm({ ...form, content: { ...form.content, cta_link: e.target.value } })}
                  className="input"
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
