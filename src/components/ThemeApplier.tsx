import { useEffect } from 'react';
import { useThemeSettings } from '@/hooks/use-data';
import { applyTheme } from '@/lib/theme-engine';

const DEFAULT_THEME = {
  primary_color: '#c9971f',
  secondary_color: '#f59e0b',
  accent_color: '#0369a1',
  heading_font: 'Space Grotesk',
  body_font: 'Inter',
  button_style: 'rounded',
  border_radius: 8,
  spacing_scale: 8,
};

/** Applies the governed CMS theme as CSS custom properties at the app root. */
export function ThemeApplier() {
  const { theme } = useThemeSettings();

  useEffect(() => {
    applyTheme({ ...DEFAULT_THEME, ...theme });
  }, [theme]);

  return null;
}
