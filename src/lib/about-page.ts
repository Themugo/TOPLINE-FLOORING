import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface AboutValue { label: string; desc: string }
export interface AboutPageSettings {
  eyebrow: string;
  title: string;
  subtitle: string;
  team_title: string;
  mission: string;
  vision: string;
  closing: string;
  image_url: string;
  values_title: string;
  values_subtitle: string;
  values: AboutValue[];
  cta_title: string;
  cta_text: string;
  cta_button: string;
}

/** Shown while the business has not uploaded its own photo to storage. Admin can copy it into the bucket with one click. */
export const DEFAULT_ABOUT_IMAGE = 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=80';

export const DEFAULT_ABOUT_PAGE: AboutPageSettings = {
  eyebrow: 'About Us',
  title: 'Who We Are',
  subtitle: 'Building Trust and Protection, One Surface at a Time',
  team_title: 'The People Behind the Work',
  mission: 'Topline Flooring & Waterproofing provides professional flooring and waterproofing solutions, from assessment and material selection to installation and handover.',
  vision: '',
  closing: 'From industrial warehouses to commercial spaces and residential properties, we have the expertise to handle projects of any scale.',
  image_url: '',
  values_title: 'Our Values',
  values_subtitle: 'The principles that guide every project we undertake',
  values: [
    { label: 'Durable', desc: 'Long-lasting solutions built to withstand the harshest conditions' },
    { label: 'Cost-Effective', desc: 'Competitive pricing without compromising on quality' },
    { label: 'Professional', desc: 'Skilled team with years of industry expertise' },
    { label: 'Integrity', desc: 'Honest, transparent business practices' },
    { label: 'Innovation', desc: 'Modern techniques and cutting-edge materials' },
    { label: 'Excellence', desc: 'Commitment to superior quality and results' },
  ],
  cta_title: 'Certified & Trusted',
  cta_text: 'We partner with leading global brands to bring you the best materials and systems',
  cta_button: 'Get in Touch',
};

export function normalizeAboutPage(raw: unknown): AboutPageSettings {
  const v = (raw && typeof raw === 'object' ? raw : {}) as Partial<AboutPageSettings>;
  const str = (x: unknown, d: string) => (typeof x === 'string' ? x : d);
  const values = Array.isArray(v.values)
    ? v.values.filter((i): i is AboutValue => !!i && typeof i.label === 'string' && i.label.trim() !== '').map((i) => ({ label: i.label, desc: typeof i.desc === 'string' ? i.desc : '' }))
    : DEFAULT_ABOUT_PAGE.values;
  return {
    eyebrow: str(v.eyebrow, DEFAULT_ABOUT_PAGE.eyebrow), title: str(v.title, DEFAULT_ABOUT_PAGE.title) || DEFAULT_ABOUT_PAGE.title,
    subtitle: str(v.subtitle, DEFAULT_ABOUT_PAGE.subtitle), team_title: str(v.team_title, DEFAULT_ABOUT_PAGE.team_title),
    mission: str(v.mission, DEFAULT_ABOUT_PAGE.mission), vision: str(v.vision, ''), closing: str(v.closing, DEFAULT_ABOUT_PAGE.closing),
    image_url: str(v.image_url, ''), values_title: str(v.values_title, DEFAULT_ABOUT_PAGE.values_title),
    values_subtitle: str(v.values_subtitle, DEFAULT_ABOUT_PAGE.values_subtitle), values: values.length ? values : DEFAULT_ABOUT_PAGE.values,
    cta_title: str(v.cta_title, DEFAULT_ABOUT_PAGE.cta_title), cta_text: str(v.cta_text, DEFAULT_ABOUT_PAGE.cta_text), cta_button: str(v.cta_button, DEFAULT_ABOUT_PAGE.cta_button),
  };
}

/** null = the About page has never been saved from admin, so the website keeps its existing wording. */
export async function loadSavedAboutPage(): Promise<AboutPageSettings | null> {
  try {
    const { data } = await supabase.from('site_settings').select('setting_value').eq('setting_key', 'about_page').maybeSingle();
    return data?.setting_value ? normalizeAboutPage(data.setting_value) : null;
  } catch { return null; }
}
export async function loadAboutPage(): Promise<AboutPageSettings> {
  return (await loadSavedAboutPage()) ?? DEFAULT_ABOUT_PAGE;
}

export function useSavedAboutPage(): { saved: AboutPageSettings | null; loaded: boolean } {
  const [state, setState] = useState<{ saved: AboutPageSettings | null; loaded: boolean }>({ saved: null, loaded: false });
  useEffect(() => { let live = true; loadSavedAboutPage().then((a) => { if (live) setState({ saved: a, loaded: true }); }); return () => { live = false; }; }, []);
  return state;
}
