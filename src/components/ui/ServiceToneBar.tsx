import { serviceTone, TONE_HEX } from '@/lib/service-tone';

/** A 4px colour edge along the bottom of a service tile: flooring, waterproofing or roofing at a glance. */
export function ServiceToneBar({ service }: { service: { name: string; slug?: string | null; short_description?: string | null } }) {
  const tone = serviceTone(service.name, service.slug, service.short_description);
  if (tone === 'general') return null;
  return <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1" style={{ backgroundColor: TONE_HEX[tone] }} />;
}
