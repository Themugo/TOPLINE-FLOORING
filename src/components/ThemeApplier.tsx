import { useEffect } from 'react';
import { useThemeSettings } from '@/hooks/use-data';
import { applyTheme } from '@/lib/theme-engine';
import { loadSiteDesignTokens } from '@/lib/site-control';
import { publicSupabase } from '@/lib/supabase';

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
    void loadSiteDesignTokens().then((tokens) => {
      const root = document.documentElement;
      tokens.forEach((token) => root.style.setProperty(`--${token.token_key.replace(/[^a-zA-Z0-9_-]/g, '-')}`, token.token_value));
    }).catch(() => undefined);
    void supabase.from('site_settings').select('setting_value').eq('setting_key', 'custom_css').maybeSingle().then(({ data }) => {
      const raw = data?.setting_value as unknown;
      const customCss = typeof raw === 'string' ? raw : (raw && typeof raw === 'object' && 'css' in raw ? String((raw as { css?: unknown }).css || '') : '');
      const id = 'admin-custom-css';
      let style = document.getElementById(id) as HTMLStyleElement | null;
      if (!style) { style = document.createElement('style'); style.id = id; document.head.appendChild(style); }
      style.textContent = customCss;
    }).catch(() => undefined);
  }, [theme]);

  return null;
}
