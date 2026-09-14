import { useCMS } from '@/context/CMSContext';

export interface CMSPageContent {
  hero?: { title?: string; subtitle?: string; background_image?: string };
  story?: { heading?: string; paragraph_1?: string; paragraph_2?: string; image_url?: string };
  mission?: { title?: string; description?: string; text?: string; vision?: string };
  values?: { items?: string | Array<unknown> };
  team?: { title?: string; members?: Array<{ name: string; role: string; bio: string; avatar_url: string }> };
  company?: { name?: string };
  contact?: { phone?: string; email?: string; address?: string; whatsapp?: string };
  social_links?: { facebook?: string; instagram?: string; linkedin?: string; twitter?: string; whatsapp?: string };
  vision?: { title?: string; description?: string };
  core_values?: Array<{ title: string; description: string; icon: string }>;
  stats?: Array<{ value: string; label: string }>;
  hero_slides?: unknown[];
  value_props?: unknown[];
  banner?: unknown;
  header?: unknown;
  offices?: unknown[];
  map_settings?: unknown;
  [key: string]: unknown;
}

export function useCmsContent(page: string): { content: CMSPageContent; loading: boolean } {
  const { cms, loading } = useCMS();

  let mapped: CMSPageContent = {};

  if (page === 'about') {
    mapped = {
      hero: cms.about.hero,
      story: cms.about.story,
      mission: cms.about.mission,
      vision: cms.about.vision,
      core_values: cms.about.core_values,
      stats: cms.about.stats,
    };
  } else if (page === 'home') {
    mapped = {
      hero_slides: cms.homepage.hero_slides,
      value_props: cms.homepage.value_props,
      banner: cms.homepage.banner,
    };
  } else if (page === 'contact') {
    mapped = {
      header: cms.contact.header,
      offices: cms.contact.offices,
      map_settings: cms.contact.map_settings,
    };
  } else if (cms[page as keyof typeof cms]) {
    mapped = cms[page as keyof typeof cms] as unknown as CMSPageContent;
  }

  return { content: mapped, loading };
}
