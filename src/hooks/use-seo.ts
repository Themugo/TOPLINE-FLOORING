import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const DEFAULT_TITLE = 'Topline Flooring & Waterproofing';
const DEFAULT_DESCRIPTION = 'Professional flooring and waterproofing solutions for industrial, commercial, and residential projects across Kenya.';
const SITE_URL = 'https://toplineflooring.co.ke';

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
 * meta tags including Open Graph and Twitter Card tags.
 * Falls back to sensible site-wide defaults if no row exists yet.
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
      const image = data?.og_image || fallback?.image;
      const canonicalUrl = data?.canonical_url || `${SITE_URL}${window.location.pathname}`;

      document.title = title;

      // Standard meta
      setMetaTag('name', 'description', description);
      setMetaTag('name', 'keywords', data?.meta_keywords);
      setMetaTag('name', 'author', 'Topline Flooring and Waterproofing');

      // Robots
      const robotsParts: string[] = [];
      robotsParts.push(data?.no_index ? 'noindex' : 'index');
      robotsParts.push(data?.no_follow ? 'nofollow' : 'follow');
      setMetaTag('name', 'robots', robotsParts.join(', '));

      // Open Graph
      setMetaTag('property', 'og:title', data?.og_title || title);
      setMetaTag('property', 'og:description', data?.og_description || description);
      setMetaTag('property', 'og:image', image ? (image.startsWith('http') ? image : `${SITE_URL}${image}`) : undefined);
      setMetaTag('property', 'og:type', 'website');
      setMetaTag('property', 'og:url', canonicalUrl);
      setMetaTag('property', 'og:site_name', 'Topline Flooring & Waterproofing');
      setMetaTag('property', 'og:locale', 'en_KE');

      // Twitter Card
      setMetaTag('name', 'twitter:card', 'summary_large_image');
      setMetaTag('name', 'twitter:title', data?.og_title || title);
      setMetaTag('name', 'twitter:description', data?.og_description || description);
      if (image) {
        const twitterImage = image.startsWith('http') ? image : `${SITE_URL}${image}`;
        setMetaTag('name', 'twitter:image', twitterImage);
      }

      // Canonical
      setCanonical(canonicalUrl);
    }

    apply();

    return () => {
      cancelled = true;
    };
  }, [pageType, pageId, fallback?.title, fallback?.description, fallback?.image]);
}
