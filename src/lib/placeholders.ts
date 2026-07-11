// Curated, categorized fallback images. Used whenever a product, service,
// or project doesn't have its own photo yet, so the storefront never shows
// a broken image icon or an empty box - it shows something on-brand
// instead, until the admin uploads a real photo via Media Library.
//
// All images are free-to-use Unsplash photos, requested at a fixed size
// via their URL params (no separate hosting needed).

const FLOORING_PLACEHOLDER = 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80';
const EPOXY_PLACEHOLDER = 'https://images.unsplash.com/photo-1504307651674-208930a97d63?auto=format&fit=crop&w=800&q=80';
const WATERPROOFING_PLACEHOLDER = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80';
const SEALANT_PLACEHOLDER = 'https://images.unsplash.com/photo-1615840728552-7073c8c5d6c5?auto=format&fit=crop&w=800&q=80';
const CONCRETE_PLACEHOLDER = 'https://images.unsplash.com/photo-1503387762-592deb587942?auto=format&fit=crop&w=800&q=80';
const CONSTRUCTION_PLACEHOLDER = 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80';
const WAREHOUSE_PLACEHOLDER = 'https://images.unsplash.com/photo-1553413077-190083ec01ff?auto=format&fit=crop&w=800&q=80';

const CATEGORY_PLACEHOLDERS: Record<string, string> = {
  waterproofing: WATERPROOFING_PLACEHOLDER,
  'waterproofing-systems': WATERPROOFING_PLACEHOLDER,
  epoxy: EPOXY_PLACEHOLDER,
  'epoxy-flooring': EPOXY_PLACEHOLDER,
  polyurethane: FLOORING_PLACEHOLDER,
  'polyurethane-flooring': FLOORING_PLACEHOLDER,
  sealant: SEALANT_PLACEHOLDER,
  'joint-sealants': SEALANT_PLACEHOLDER,
  concrete: CONCRETE_PLACEHOLDER,
  'concrete-sealers': CONCRETE_PLACEHOLDER,
  flooring: FLOORING_PLACEHOLDER,
  industrial: WAREHOUSE_PLACEHOLDER,
  construction: CONSTRUCTION_PLACEHOLDER,
};

const DEFAULT_PRODUCT_PLACEHOLDER = FLOORING_PLACEHOLDER;
const DEFAULT_SERVICE_PLACEHOLDER = CONSTRUCTION_PLACEHOLDER;
const DEFAULT_PROJECT_PLACEHOLDER = WAREHOUSE_PLACEHOLDER;

function slugKey(value?: string | null): string {
  return (value || '').toLowerCase().trim();
}

/** Fallback image for a product, based on its category slug/name if known. */
export function getProductPlaceholder(categorySlugOrName?: string | null): string {
  const key = slugKey(categorySlugOrName);
  for (const [k, url] of Object.entries(CATEGORY_PLACEHOLDERS)) {
    if (key.includes(k)) return url;
  }
  return DEFAULT_PRODUCT_PLACEHOLDER;
}

/** Fallback image for a service, based on its name/slug if known. */
export function getServicePlaceholder(nameOrSlug?: string | null): string {
  const key = slugKey(nameOrSlug);
  for (const [k, url] of Object.entries(CATEGORY_PLACEHOLDERS)) {
    if (key.includes(k)) return url;
  }
  return DEFAULT_SERVICE_PLACEHOLDER;
}

/** Fallback image for a portfolio/project entry. */
export function getProjectPlaceholder(): string {
  return DEFAULT_PROJECT_PLACEHOLDER;
}

/** Generic resolver: returns the given url if present/non-empty, otherwise a placeholder. */
export function withFallback(url: string | null | undefined, fallback: string): string {
  return url && url.trim().length > 0 ? url : fallback;
}
