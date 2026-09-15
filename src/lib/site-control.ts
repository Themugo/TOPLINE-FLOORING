import { publicSupabase, supabase } from '@/lib/supabase';

export type SitePage = {
  id: string; slug: string; title: string; seo_title: string | null; seo_description: string | null;
  status: 'draft'|'published'|'archived'; template: 'standard'|'landing'|'full_width'; display_order: number;
  is_indexable: boolean; created_at: string; updated_at: string;
};

export type SitePageBlock = {
  id: string; page_id: string; block_type: string; block_key: string; title: string | null;
  content: Record<string, unknown>; display_order: number; is_active: boolean;
  style: Record<string, unknown>; created_at: string; updated_at: string;
};

export async function loadPublishedPage(slug: string) {
  const { data, error } = await publicSupabase.rpc('get_published_site_page', { p_slug: slug });
  if (error) throw error;
  return data as { page: SitePage; blocks: SitePageBlock[] } | null;
}

export async function loadSiteDesignTokens() {
  const { data, error } = await publicSupabase.from('site_design_tokens').select('token_key,token_value,token_type').eq('is_active', true);
  if (error) throw error;
  return (data ?? []) as Array<{ token_key: string; token_value: string; token_type: string }>;
}

export async function loadPublicSiteContent(route: string) {
  const { data, error } = await publicSupabase.rpc('get_public_site_content', { p_route: route });
  if (error) throw error;
  return (data ?? {}) as Record<string, unknown>;
}

export function publicCopy(content: Record<string, unknown>, key: string, fallback: string): string {
  const value = content[key];
  return typeof value === 'string' && value.trim() ? value : fallback;
}
