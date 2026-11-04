import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { AdminLayout } from './dashboard';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/db';
import { ImageUpload } from '@/components/ui/image-upload';
import { MoveToStorageButton } from '@/components/admin/MoveToStorageButton';
import { DEFAULT_ABOUT_IMAGE, DEFAULT_ABOUT_PAGE, loadAboutPage, type AboutPageSettings } from '@/lib/about-page';

export default function AdminAboutPage() {
  const { toast } = useToast();
  const [form, setForm] = useState<AboutPageSettings>(DEFAULT_ABOUT_PAGE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { loadAboutPage().then((a) => { setForm(a); setLoading(false); }); }, []);
  const set = <K extends keyof AboutPageSettings>(k: K, v: AboutPageSettings[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.from('site_settings')
        .upsert({ setting_key: 'about_page', setting_value: form, updated_at: new Date().toISOString() }, { onConflict: 'setting_key' })
        .select('setting_value').maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('The change was not saved. Check that you have content permission.');
      toast({ title: 'About page saved', description: 'It is live on the website now.' });
    } catch (e) { toast({ title: 'Could not save', description: errorMessage(e), variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const field = (label: string, key: keyof AboutPageSettings, multiline = false) => (
    <label className="block text-sm font-medium text-gray-700">{label}
      {multiline
        ? <textarea className="input mt-1 min-h-[90px]" value={String(form[key] ?? '')} onChange={(e) => set(key, e.target.value as never)} />
        : <input className="input mt-1" value={String(form[key] ?? '')} onChange={(e) => set(key, e.target.value as never)} />}
    </label>
  );

  if (loading) return <AdminLayout title="About page"><div className="py-12 text-center">Loading…</div></AdminLayout>;
  return (
    <AdminLayout title="About page" subtitle="Edit the About Us page. Nothing is removed: empty fields keep the built-in wording.">
      <div className="max-w-3xl space-y-6">
        <section className="bg-white rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold">Heading</h2>
          {field('Small label above the title', 'eyebrow')}
          {field('Title', 'title')}
          {field('Subtitle', 'subtitle')}
        </section>
        <section className="bg-white rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold">Story & photo</h2>
          <ImageUpload label="Team / company photo (stored in your bucket)" value={form.image_url} onChange={(u) => set('image_url', u)} folder="about" />
          {!form.image_url && <MoveToStorageButton sourceUrl={DEFAULT_ABOUT_IMAGE} folder="about" onDone={(u) => set('image_url', u)} />}
          {!form.image_url && <p className="text-xs text-gray-500">The website currently shows the built-in photo. Upload your own or copy it into your storage so it stays under your control.</p>}
          {field('Story heading', 'team_title')}
          {field('Our story / mission', 'mission', true)}
          {field('Vision (optional)', 'vision', true)}
          {field('Closing paragraph', 'closing', true)}
        </section>
        <section className="bg-white rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold">Values</h2>
          {field('Section title', 'values_title')}
          {field('Section subtitle', 'values_subtitle')}
          {form.values.map((v, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-2 items-start">
              <input className="input" value={v.label} placeholder="Name" onChange={(e) => set('values', form.values.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <input className="input" value={v.desc} placeholder="Short description" onChange={(e) => set('values', form.values.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)))} />
              <button type="button" className="p-2 text-red-600" aria-label="Remove value" onClick={() => set('values', form.values.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <button type="button" className="btn-secondary text-xs inline-flex items-center gap-1" onClick={() => set('values', [...form.values, { label: '', desc: '' }])}><Plus className="w-3.5 h-3.5" /> Add a value</button>
        </section>
        <section className="bg-white rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold">Closing call-to-action</h2>
          {field('Title', 'cta_title')}
          {field('Text', 'cta_text', true)}
          {field('Button label', 'cta_button')}
        </section>
        <button type="button" onClick={() => void save()} disabled={saving} className="btn-primary inline-flex items-center gap-2"><Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save About page'}</button>
      </div>
    </AdminLayout>
  );
}
