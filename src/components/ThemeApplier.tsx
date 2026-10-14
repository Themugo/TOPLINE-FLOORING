import { useEffect } from 'react';
import { useThemeSettings } from '@/hooks/use-data';
import { applyTheme, DEFAULT_APPLIED_THEME, isSafeDesignTokenValue, validateCustomCss } from '@/lib/theme-engine';
import { loadSiteDesignTokens } from '@/lib/site-control';
import { publicSupabase } from '@/lib/supabase';

const DEFAULT_THEME = DEFAULT_APPLIED_THEME;

/** Applies the governed CMS theme as CSS custom properties at the app root. */
export function ThemeApplier() {
  const { theme } = useThemeSettings();

  useEffect(() => {
    applyTheme({ ...DEFAULT_THEME, ...theme });
    void loadSiteDesignTokens().then((tokens) => {
      const root = document.documentElement;
      tokens.forEach((token) => {
        if (!/^[a-zA-Z][a-zA-Z0-9_.-]{0,63}$/.test(token.token_key) || !isSafeDesignTokenValue(token.token_value)) return;
        const property = `--${token.token_key.replace(/[._]/g, '-').replace(/[^a-zA-Z0-9-]/g, '-')}`;
        root.style.setProperty(property, token.token_value);
      });
    }, () => undefined);
    void publicSupabase.from('site_settings').select('setting_value').eq('setting_key', 'custom_css').maybeSingle().then(({ data }) => {
      const raw = data?.setting_value as unknown;
      const customCss = typeof raw === 'string' ? raw : (raw && typeof raw === 'object' && 'css' in raw ? String((raw as { css?: unknown }).css || '') : '');
      const id = 'admin-custom-css';
      let style = document.getElementById(id) as HTMLStyleElement | null;
      if (!style) { style = document.createElement('style'); style.id = id; document.head.appendChild(style); }
      const validation = validateCustomCss(customCss);
      style.textContent = validation.valid ? customCss : '';
      if (!validation.valid) console.warn(`Stored custom CSS was not applied: ${validation.reason}`);
    }, () => undefined);
  }, [theme]);

  return null;
}
