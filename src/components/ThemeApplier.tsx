import { useEffect } from 'react';
import { useThemeSettings } from '@/hooks/use-data';
import { applyPrimaryColorRamp } from '@/lib/theme-engine';

const DEFAULT_PRIMARY = '#c9971f';

const RADIUS_BY_BUTTON_STYLE: Record<string, string> = {
  square: '0.25rem',
  rounded: '0.5rem',
  pill: '9999px',
};

/**
 * Applies the parts of Admin -> Theme that are genuinely wired up to
 * the live site: the primary brand color (as a full generated tint/
 * shade ramp, not a flat override) and button corner style. Mounted
 * once near the app root so it applies everywhere - storefront and
 * admin - without every page needing to know about it.
 *
 * Font and spacing controls in the Theme page are saved but not yet
 * applied here - see the note in that admin screen.
 */
export function ThemeApplier() {
  const { theme } = useThemeSettings();

  useEffect(() => {
    const primary = theme?.primary_color || DEFAULT_PRIMARY;
    applyPrimaryColorRamp(primary);
  }, [theme?.primary_color]);

  useEffect(() => {
    const radius = RADIUS_BY_BUTTON_STYLE[theme?.button_style || 'rounded'];
    document.documentElement.style.setProperty('--theme-btn-radius', radius);
  }, [theme?.button_style]);

  return null;
}
