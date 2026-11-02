/** Lower-case URL slug; never empty, never starts/ends with a dash. */
export function slugify(value: string, fallback = 'item'): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || fallback;
}

/**
 * Slugs are public URLs and unique in the database. An existing record keeps its slug when edited
 * (so links never break); a new record gets `-2`, `-3`... until it no longer collides.
 */
export function uniqueSlug(title: string, taken: Iterable<string | null | undefined>, existingSlug?: string | null, fallback = 'item'): string {
  if (existingSlug) return existingSlug;
  const used = new Set<string>();
  for (const slug of taken) if (slug) used.add(slug);
  const base = slugify(title, fallback);
  let candidate = base;
  for (let suffix = 2; used.has(candidate); suffix += 1) candidate = `${base}-${suffix}`;
  return candidate;
}
