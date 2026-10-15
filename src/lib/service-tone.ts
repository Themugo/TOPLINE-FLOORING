/**
 * Service colour coding used across the public site: flooring, waterproofing and roofing each have one colour,
 * so a visitor can tell the service at a glance on cards, filters and project tags.
 * Tones are inferred from the service's own name/slug/category, so new catalogue entries are coloured automatically
 * and unknown ones fall back to a neutral tone. Nothing is stored or changed in the database.
 */
export type ServiceTone = 'flooring' | 'waterproofing' | 'roofing' | 'general';

export const TONE_HEX: Record<ServiceTone, string> = {
  flooring: '#3F5E8A',
  waterproofing: '#0E8A93',
  roofing: '#8F5B3E',
  general: '#5F6B78',
};

export const TONE_LABEL: Record<ServiceTone, string> = {
  flooring: 'Flooring',
  waterproofing: 'Waterproofing',
  roofing: 'Roofing',
  general: 'General',
};

export function serviceTone(...parts: Array<string | null | undefined>): ServiceTone {
  const text = parts.filter(Boolean).join(' ').toLowerCase();
  // Order matters: "waterproofing" contains the letters "roof", so waterproofing is tested first and roofing uses word boundaries.
  if (/waterproof|damp|leak|seal|membrane|basement|tank|moisture|\bwater\b/.test(text)) return 'waterproofing';
  if (/\broof|\bgutter|shingle|cladding/.test(text)) return 'roofing';
  if (/floor|epoxy|screed|resin|polish|concrete|terrazzo|vinyl|coating|tile/.test(text)) return 'flooring';
  return 'general';
}
