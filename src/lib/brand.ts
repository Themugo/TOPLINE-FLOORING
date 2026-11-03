/**
 * Single source of truth for the brand identity shown across the site, admin and browser tab.
 * Staff edit these in Admin > Site Settings (General and Appearance); these values are only the defaults
 * used until something is saved, and the fallback when a field is left empty.
 */
export const DEFAULT_BRAND = {
  siteName: 'Topline Flooring & Waterproofing',
  wordmark: 'Topline',
  descriptor: 'FLOORING & WATERPROOFING',
  promise: 'Professional Solutions for Lasting Spaces',
  logoUrl: '/topline-brand-mark.svg',
  faviconUrl: '/favicon.svg',
  showText: true,
} as const;

export interface Brand {
  siteName: string;
  wordmark: string;
  descriptor: string;
  promise: string;
  logoUrl: string;
  faviconUrl: string;
  showText: boolean;
  /** True when staff uploaded their own logo (so layout must adapt to an unknown aspect ratio). */
  customLogo: boolean;
}

interface SiteInfoLike {
  name?: string;
  logo_url?: string;
  favicon_url?: string;
  brand_wordmark?: string;
  brand_descriptor?: string;
  brand_promise?: string;
  show_brand_text?: boolean;
}

const clean = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export function resolveBrand(info?: SiteInfoLike | null): Brand {
  const logo = clean(info?.logo_url);
  return {
    siteName: clean(info?.name) || DEFAULT_BRAND.siteName,
    wordmark: clean(info?.brand_wordmark) || DEFAULT_BRAND.wordmark,
    descriptor: clean(info?.brand_descriptor) || DEFAULT_BRAND.descriptor,
    // The slogan can be deliberately cleared, so only fall back when the field was never set.
    promise: info?.brand_promise === undefined ? DEFAULT_BRAND.promise : clean(info.brand_promise),
    logoUrl: logo || DEFAULT_BRAND.logoUrl,
    faviconUrl: clean(info?.favicon_url) || DEFAULT_BRAND.faviconUrl,
    showText: info?.show_brand_text !== false,
    customLogo: Boolean(logo) && logo !== DEFAULT_BRAND.logoUrl,
  };
}
