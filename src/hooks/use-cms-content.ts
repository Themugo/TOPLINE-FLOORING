/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCMS } from '@/context/CMSContext';

export function useCmsContent(page: string) {
  const { cms, loading } = useCMS();

  let mapped: Record<string, any> = {};

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
    mapped = cms[page as keyof typeof cms] as any;
  }

  return { content: mapped, loading };
}
