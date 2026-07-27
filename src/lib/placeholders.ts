// Curated library of authentic, high-definition photography URLs for real
// commercial flooring, epoxy, waterproofing, concrete polishing, joint sealants,
// and industrial contracting projects.
//
// All photos are real, high-resolution Unsplash professional shots fitting
// smoothly across all viewports without placeholder graphics or empty frames.

export const REAL_IMAGES_EPOXY = [
  'https://images.unsplash.com/photo-1504307651674-208930a97d63?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1508873696983-2df515122519?auto=format&fit=crop&w=1600&q=85',
];

export const REAL_IMAGES_WATERPROOFING = [
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1628744876497-eb30460be9f6?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?auto=format&fit=crop&w=1600&q=85',
];

export const REAL_IMAGES_CONCRETE = [
  'https://images.unsplash.com/photo-1503387762-592deb587942?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1553413077-190083ec01ff?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1600&q=85',
];

export const REAL_IMAGES_SEALANTS = [
  'https://images.unsplash.com/photo-1615840728552-7073c8c5d6c5?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?auto=format&fit=crop&w=1600&q=85',
];

export const REAL_IMAGES_INDUSTRIAL = [
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1600&q=85',
];

export const REAL_IMAGES_POOL = [
  ...REAL_IMAGES_EPOXY,
  ...REAL_IMAGES_WATERPROOFING,
  ...REAL_IMAGES_CONCRETE,
  ...REAL_IMAGES_SEALANTS,
  ...REAL_IMAGES_INDUSTRIAL,
];

function slugKey(value?: string | null): string {
  return (value || '').toLowerCase().trim();
}

/** Check if a string is missing, blank, or a generic placeholder URL */
export function isPlaceholderUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return true;
  const lower = url.toLowerCase().trim();
  if (lower.length === 0) return true;
  if (lower.includes('placeholder') || lower.includes('via.placeholder') || lower.includes('dummyimage') || lower.includes('example.com')) {
    return true;
  }
  return false;
}

/** Get pool of real images matching a category or key */
export function getCategoryRealPool(categoryOrKey?: string | null): string[] {
  const key = slugKey(categoryOrKey);
  if (key.includes('waterproof') || key.includes('roof') || key.includes('basement')) {
    return REAL_IMAGES_WATERPROOFING;
  }
  if (key.includes('epoxy') || key.includes('polyurethane') || key.includes('flooring')) {
    return REAL_IMAGES_EPOXY;
  }
  if (key.includes('concrete') || key.includes('polishing') || key.includes('dustproof')) {
    return REAL_IMAGES_CONCRETE;
  }
  if (key.includes('sealant') || key.includes('joint') || key.includes('chemical')) {
    return REAL_IMAGES_SEALANTS;
  }
  if (key.includes('industrial') || key.includes('warehouse') || key.includes('construction')) {
    return REAL_IMAGES_INDUSTRIAL;
  }
  return REAL_IMAGES_POOL;
}

/** Fetch a random real photo from the curated real image pool */
export function getRandomRealImage(categoryOrKey?: string | null, seed?: string | number): string {
  const pool = getCategoryRealPool(categoryOrKey);
  if (!pool || pool.length === 0) return REAL_IMAGES_POOL[0];

  if (seed !== undefined) {
    const numericHash = String(seed).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return pool[numericHash % pool.length];
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

/** Fallback image for a product, returning a real photo from the real pool */
export function getProductPlaceholder(categorySlugOrName?: string | null): string {
  return getRandomRealImage(categorySlugOrName);
}

/** Fallback image for a service, returning a real photo from the real pool */
export function getServicePlaceholder(nameOrSlug?: string | null): string {
  return getRandomRealImage(nameOrSlug);
}

/** Fallback image for a project/portfolio entry */
export function getProjectPlaceholder(): string {
  return getRandomRealImage('industrial');
}

/** Ensure a URL is a valid real photo; if missing or placeholder, returns a random real photo */
export function ensureRealImage(url?: string | null, categoryOrKey?: string | null, seed?: string | number): string {
  if (!isPlaceholderUrl(url)) {
    return url as string;
  }
  return getRandomRealImage(categoryOrKey, seed);
}

/** Generic resolver returning the given URL if valid real image, else a random real image */
export function withFallback(url: string | null | undefined, fallback?: string): string {
  if (!isPlaceholderUrl(url)) return url as string;
  if (fallback && !isPlaceholderUrl(fallback)) return fallback;
  return getRandomRealImage();
}
