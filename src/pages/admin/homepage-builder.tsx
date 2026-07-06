import { useState, useEffect } from 'react';
import { GripVertical, Eye, EyeOff, Settings2, Save, Plus, Trash2 } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { HomepageSection } from '@/lib/types';

const LUCIDE_ICONS = [
  'ShieldCheck', 'Truck', 'Star', 'ThumbsUp', 'Wrench', 'Paintbrush',
  'DollarSign', 'Clock', 'Leaf', 'Home', 'Building2', 'Award',
  'CheckCircle', 'Heart', 'Sparkles', 'Hammer', 'Ruler', 'Palette',
];

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
    'why-choose-us': 'Why Choose Us',
    statistics: 'Statistics',
    faq: 'FAQ',
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

  const setContent = (updater: (prev: Record<string, any>) => Record<string, any>) => {
    setForm(prev => ({ ...prev, content: updater(prev.content) }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="font-semibold text-lg mb-4">Edit Section</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
            <Input
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
            <select
              value={form.background_color}
              onChange={(e) => setForm({ ...form, background_color: e.target.value })}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm md:text-sm"
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
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm md:text-sm"
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
                <Input
                  type="number"
                  value={form.content.slide_interval || 6000}
                  onChange={(e) => setContent(prev => ({ ...prev, slide_interval: parseInt(e.target.value) }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Overlay Opacity (%)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.content.overlay_opacity || 60}
                  onChange={(e) => setContent(prev => ({ ...prev, overlay_opacity: parseInt(e.target.value) }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transition</label>
                <select
                  value={form.content.transition || 'fade'}
                  onChange={(e) => setContent(prev => ({ ...prev, transition: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm md:text-sm"
                >
                  <option value="fade">Fade</option>
                  <option value="slide">Slide</option>
                </select>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.content.show_featured_products !== false}
                  onChange={(e) => setContent(prev => ({ ...prev, show_featured_products: e.target.checked }))}
                />
                <span className="text-sm">Show Featured Products</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.content.show_featured_services !== false}
                  onChange={(e) => setContent(prev => ({ ...prev, show_featured_services: e.target.checked }))}
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
                onChange={(e) => setContent(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm md:text-sm"
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
                <Input
                  value={form.content.cta_text || ''}
                  onChange={(e) => setContent(prev => ({ ...prev, cta_text: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CTA Link</label>
                <Input
                  value={form.content.cta_link || ''}
                  onChange={(e) => setContent(prev => ({ ...prev, cta_link: e.target.value }))}
                />
              </div>
            </>
          )}

          {section.section_type === 'why-choose-us' && <WhyChooseUsEditor content={form.content} setContent={setContent} />}
          {section.section_type === 'statistics' && <StatisticsEditor content={form.content} setContent={setContent} />}
          {section.section_type === 'faq' && <FaqEditor content={form.content} setContent={setContent} />}

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={() => onSave(form)} className="flex-1 flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WhyChooseUsEditor({ content, setContent }: { content: Record<string, any>; setContent: (updater: (prev: Record<string, any>) => Record<string, any>) => void }) {
  const reasons = content.reasons?.length ? content.reasons : [
    { icon: 'ShieldCheck', title: 'Quality Materials', description: 'We use only the finest flooring materials sourced from trusted manufacturers.' },
    { icon: 'Truck', title: 'Free Delivery', description: 'Complimentary delivery within our service area for all orders over $500.' },
  ];

  const addReason = () => {
    setContent(prev => ({ ...prev, reasons: [...reasons, { icon: 'Star', title: '', description: '' }] }));
  };

  const removeReason = (idx: number) => {
    setContent(prev => ({ ...prev, reasons: reasons.filter((_: any, i: number) => i !== idx) }));
  };

  const updateReason = (idx: number, field: string, value: string) => {
    setContent(prev => ({
      ...prev,
      reasons: reasons.map((r: any, i: number) => i === idx ? { ...r, [field]: value } : r),
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">Reasons</label>
        <Button type="button" variant="outline" size="sm" onClick={addReason}>
          <Plus className="w-3 h-3 mr-1" /> Add Reason
        </Button>
      </div>
      {reasons.map((reason: any, idx: number) => (
        <div key={idx} className="border rounded-lg p-3 space-y-2 relative">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute top-1 right-1 text-red-500 hover:text-red-700"
            onClick={() => removeReason(idx)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Icon</label>
            <select
              value={reason.icon}
              onChange={(e) => updateReason(idx, 'icon', e.target.value)}
              className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm"
            >
              {LUCIDE_ICONS.map(icon => (
                <option key={icon} value={icon}>{icon}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Title</label>
            <Input
              value={reason.title}
              onChange={(e) => updateReason(idx, 'title', e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Description</label>
            <Textarea
              value={reason.description}
              onChange={(e) => updateReason(idx, 'description', e.target.value)}
              className="min-h-[60px] text-sm"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatisticsEditor({ content, setContent }: { content: Record<string, any>; setContent: (updater: (prev: Record<string, any>) => Record<string, any>) => void }) {
  const stats = content.stats?.length ? content.stats : [
    { label: 'Years of Experience', value: 15, suffix: '+' },
    { label: 'Projects Completed', value: 2500, suffix: '+' },
    { label: 'Happy Clients', value: 1800, suffix: '+' },
    { label: 'Products Available', value: 500, suffix: '+' },
  ];

  const addStat = () => {
    setContent(prev => ({ ...prev, stats: [...stats, { label: '', value: 0, suffix: '' }] }));
  };

  const removeStat = (idx: number) => {
    setContent(prev => ({ ...prev, stats: stats.filter((_: any, i: number) => i !== idx) }));
  };

  const updateStat = (idx: number, field: string, value: any) => {
    setContent(prev => ({
      ...prev,
      stats: stats.map((s: any, i: number) => i === idx ? { ...s, [field]: value } : s),
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">Statistics</label>
        <Button type="button" variant="outline" size="sm" onClick={addStat}>
          <Plus className="w-3 h-3 mr-1" /> Add Stat
        </Button>
      </div>
      {stats.map((stat: any, idx: number) => (
        <div key={idx} className="border rounded-lg p-3 space-y-2 relative">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute top-1 right-1 text-red-500 hover:text-red-700"
            onClick={() => removeStat(idx)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Label</label>
            <Input
              value={stat.label}
              onChange={(e) => updateStat(idx, 'label', e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-0.5">Value</label>
              <Input
                type="number"
                value={stat.value}
                onChange={(e) => updateStat(idx, 'value', parseInt(e.target.value) || 0)}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-0.5">Suffix</label>
              <Input
                value={stat.suffix}
                onChange={(e) => updateStat(idx, 'suffix', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FaqEditor({ content, setContent }: { content: Record<string, any>; setContent: (updater: (prev: Record<string, any>) => Record<string, any>) => void }) {
  const faqs = content.faqs?.length ? content.faqs : [
    { question: 'What types of flooring do you offer?', answer: 'We offer a wide range including hardwood, laminate, vinyl, tile, and carpet.' },
    { question: 'Do you provide installation services?', answer: 'Yes, we offer professional installation services for all our flooring products.' },
  ];

  const addFaq = () => {
    setContent(prev => ({ ...prev, faqs: [...faqs, { question: '', answer: '' }] }));
  };

  const removeFaq = (idx: number) => {
    setContent(prev => ({ ...prev, faqs: faqs.filter((_: any, i: number) => i !== idx) }));
  };

  const updateFaq = (idx: number, field: string, value: string) => {
    setContent(prev => ({
      ...prev,
      faqs: faqs.map((f: any, i: number) => i === idx ? { ...f, [field]: value } : f),
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">FAQ Items</label>
        <Button type="button" variant="outline" size="sm" onClick={addFaq}>
          <Plus className="w-3 h-3 mr-1" /> Add Question
        </Button>
      </div>
      {faqs.map((faq: any, idx: number) => (
        <div key={idx} className="border rounded-lg p-3 space-y-2 relative">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute top-1 right-1 text-red-500 hover:text-red-700"
            onClick={() => removeFaq(idx)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Question</label>
            <Input
              value={faq.question}
              onChange={(e) => updateFaq(idx, 'question', e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Answer</label>
            <Textarea
              value={faq.answer}
              onChange={(e) => updateFaq(idx, 'answer', e.target.value)}
              className="min-h-[60px] text-sm"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
