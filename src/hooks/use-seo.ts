import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const DEFAULT_TITLE = 'Topline Flooring & Waterproofing';
const DEFAULT_DESCRIPTION = 'Professional flooring and waterproofing solutions for industrial, commercial, and residential projects across Kenya.';

function setMetaTag(attr: 'name' | 'property', key: string, content: string | null | undefined) {
  if (!content) return;
  let tag = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function setCanonical(url: string | null | undefined) {
  if (!url) return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

/**
 * Fetches the SEO settings an admin configured for this page (via
 * Admin -> SEO Manager) and applies them to the document title and
 * meta tags. Falls back to sensible site-wide defaults if no row
 * exists yet for this page_type/page_id, so nothing ever ships with
 * a blank title or description.
 *
 * `fallback` lets a page supply its own dynamic title/description
 * (e.g. a product's own name) to use instead of the generic site
 * default when no dedicated SEO row exists for it yet - useful for
 * pages like product details where seeding a row per item ahead of
 * time isn't practical, but a generic "Topline Flooring" title would
 * be a worse fallback than just using the product's real name.
 */
export function useSeoMeta(
  pageType: string,
  pageId?: string | null,
  fallback?: { title?: string; description?: string; image?: string }
) {
  useEffect(() => {
    let cancelled = false;

    async function apply() {
      let query = supabase.from('seo_pages').select('*').eq('page_type', pageType);
      query = pageId ? query.eq('page_id', pageId) : query.is('page_id', null);
      const { data } = await query.maybeSingle();

      if (cancelled) return;

      const title = data?.meta_title || fallback?.title || DEFAULT_TITLE;
      const description = data?.meta_description || fallback?.description || DEFAULT_DESCRIPTION;

      document.title = title;
      setMetaTag('name', 'description', description);
      setMetaTag('name', 'keywords', data?.meta_keywords);
      setMetaTag('property', 'og:title', data?.og_title || title);
      setMetaTag('property', 'og:description', data?.og_description || description);
      setMetaTag('property', 'og:image', data?.og_image || fallback?.image);
      setCanonical(data?.canonical_url);

      const robotsParts: string[] = [];
      robotsParts.push(data?.no_index ? 'noindex' : 'index');
      robotsParts.push(data?.no_follow ? 'nofollow' : 'follow');
      setMetaTag('name', 'robots', robotsParts.join(', '));
    }

    apply();

    return () => {
      cancelled = true;
    };
  }, [pageType, pageId, fallback?.title, fallback?.description, fallback?.image]);
}
