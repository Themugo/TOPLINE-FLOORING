// Generates a full Tailwind-style 50-950 color ramp from a single base
// hex color, using HSL lightness interpolation. This is what makes the
// admin's "Primary Color" picker in Theme settings actually usable:
// picking one color needs to produce a full range of tints (for light
// backgrounds/badges) and shades (for hover states, dark text) that
// stay visually consistent with each other - not one flat color forced
// onto every utility class regardless of its role.

interface RGB { r: number; g: number; b: number; }
interface HSL { h: number; s: number; l: number; }

function hexToRgb(hex: string): RGB {
  if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) throw new Error('Invalid theme color');
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

  if (d !== 0) {
    switch (max) {
      case rn: h = ((gn - bn) / d) % 6; break;
      case gn: h = (bn - rn) / d + 2; break;
      case bn: h = (rn - gn) / d + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s: s * 100, l: l * 100 };
}

function hslToHex({ h, s, l }: HSL): string {
  const sn = s / 100, ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let r = 0, g = 0, b = 0;

  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const toHex = (v: number) => {
    const hex = Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Shade positions are generated around the selected color, keeping the selected
// value at step 500. This avoids the previous behavior where the picker color was
// discarded in favor of a fixed 47% lightness ramp.
const LIGHTER_STEPS: Record<string, number> = { '50': 0.95, '100': 0.80, '200': 0.60, '300': 0.38, '400': 0.16 };
const DARKER_STEPS: Record<string, number> = { '600': 0.16, '700': 0.34, '800': 0.54, '900': 0.76, '950': 0.92 };

export function generateColorRamp(baseHex: string): Record<string, string> {
  let base: HSL;
  try {
    base = rgbToHsl(hexToRgb(baseHex));
  } catch {
    // Invalid or absent persisted values must never generate malformed CSS.
    base = rgbToHsl(hexToRgb('#12396D'));
  }
  const ramp: Record<string, string> = { '500': hslToHex(base) };
  for (const [step, fraction] of Object.entries(LIGHTER_STEPS)) {
    const lightness = base.l + (98 - base.l) * fraction;
    const saturation = lightness > 85 ? base.s * 0.85 : base.s;
    ramp[step] = hslToHex({ h: base.h, s: Math.min(saturation, 90), l: lightness });
  }
  for (const [step, fraction] of Object.entries(DARKER_STEPS)) {
    const lightness = base.l - (base.l - 8) * fraction;
    const saturation = lightness < 20 ? base.s * 0.85 : base.s;
    ramp[step] = hslToHex({ h: base.h, s: Math.min(saturation, 90), l: lightness });
  }
  return ramp;
}

function buildRampRules(prefix: 'primary' | 'accent', baseHex: string): string[] {
  const ramp = generateColorRamp(baseHex);
  const rules: string[] = [];
  for (const [step, hex] of Object.entries(ramp)) {
    rules.push(`.bg-${prefix}-${step}{background-color:${hex} !important}`);
    rules.push(`.text-${prefix}-${step}{color:${hex} !important}`);
    rules.push(`.border-${prefix}-${step}{border-color:${hex} !important}`);
    rules.push(`.ring-${prefix}-${step}{--tw-ring-color:${hex} !important}`);
    rules.push(`.hover\\:bg-${prefix}-${step}:hover{background-color:${hex} !important}`);
    rules.push(`.hover\\:text-${prefix}-${step}:hover{color:${hex} !important}`);
    rules.push(`.focus\\:ring-${prefix}-${step}:focus{--tw-ring-color:${hex} !important}`);
    rules.push(`.hover\\:border-${prefix}-${step}:hover{border-color:${hex} !important}`);
    rules.push(`.focus\\:border-${prefix}-${step}:focus{border-color:${hex} !important}`);
    rules.push(`.from-${prefix}-${step}{--tw-gradient-from:${hex} !important}`);
    rules.push(`.via-${prefix}-${step}{--tw-gradient-via:${hex} !important}`);
    rules.push(`.to-${prefix}-${step}{--tw-gradient-to:${hex} !important}`);
  }
  return rules;
}

function updateDynamicColorRamp(kind: 'primary' | 'accent', baseHex: string) {
  if (typeof document === 'undefined') return;
  const styleId = 'dynamic-theme-overrides';
  let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = styleId;
    document.head.appendChild(styleTag);
  }
  styleTag.dataset[`${kind}Hex`] = normalizeThemeColor(baseHex, kind === 'primary' ? '#12396D' : '#0E6B78', true);
  const rules: string[] = [];
  const primaryHex = styleTag.dataset.primaryHex;
  const accentHex = styleTag.dataset.accentHex;
  if (primaryHex) rules.push(...buildRampRules('primary', primaryHex));
  if (accentHex) rules.push(...buildRampRules('accent', accentHex));
  styleTag.textContent = rules.join('\n');
}

/** Applies the administrator-governed primary color ramp to existing utility classes. */
export function applyPrimaryColorRamp(baseHex: string) {
  updateDynamicColorRamp('primary', baseHex);
}

/** Applies the administrator-governed supporting accent ramp without replacing the primary ramp. */
export function applyAccentColorRamp(baseHex: string) {
  updateDynamicColorRamp('accent', baseHex);
}

export function resetPrimaryColorOverrides() {
  if (typeof document === 'undefined') return;
  const styleTag = document.getElementById('dynamic-theme-overrides');
  if (styleTag) {
    styleTag.textContent = '';
    delete styleTag.dataset.primaryHex;
    delete styleTag.dataset.accentHex;
  }
}


export interface AppliedTheme {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  heading_font: string;
  body_font: string;
  button_style: string;
  border_radius: number;
  spacing_scale: number;
}

export const DEFAULT_APPLIED_THEME: AppliedTheme = {
  primary_color: '#0c2d57', secondary_color: '#b4e33d', accent_color: '#0e6b78',
  heading_font: 'Sora', body_font: 'Manrope', button_style: 'rounded', border_radius: 8, spacing_scale: 8,
};

export const ALLOWED_THEME_FONTS = ['Sora', 'Manrope', 'Inter', 'Space Grotesk', 'Montserrat', 'Open Sans', 'Poppins', 'Roboto', 'Playfair Display', 'Source Sans Pro'] as const;

export function isValidThemeColor(value: unknown): value is string {
  return typeof value === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

function normalizeThemeColor(value: unknown, fallback: string, requireWhiteTextContrast = false): string {
  if (!isValidThemeColor(value)) return fallback;
  const clean = value.trim().toLowerCase();
  const normalized = clean.length === 4 ? `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}` : clean;
  return requireWhiteTextContrast && contrastRatio(normalized, '#ffffff') < 4.5 ? fallback : normalized;
}

export function normalizeAppliedTheme(theme: Partial<AppliedTheme> | null | undefined): AppliedTheme {
  const candidate = theme ?? {};
  const font = (value: unknown, fallback: string) => typeof value === 'string' && (ALLOWED_THEME_FONTS as readonly string[]).includes(value) ? value : fallback;
  const radius = Number(candidate.border_radius), spacing = Number(candidate.spacing_scale);
  return {
    primary_color: normalizeThemeColor(candidate.primary_color, DEFAULT_APPLIED_THEME.primary_color, true),
    secondary_color: normalizeThemeColor(candidate.secondary_color, DEFAULT_APPLIED_THEME.secondary_color),
    accent_color: normalizeThemeColor(candidate.accent_color, DEFAULT_APPLIED_THEME.accent_color, true),
    heading_font: font(candidate.heading_font, DEFAULT_APPLIED_THEME.heading_font),
    body_font: font(candidate.body_font, DEFAULT_APPLIED_THEME.body_font),
    button_style: candidate.button_style === 'square' || candidate.button_style === 'pill' ? candidate.button_style : 'rounded',
    border_radius: Number.isFinite(radius) ? Math.min(32, Math.max(0, radius)) : DEFAULT_APPLIED_THEME.border_radius,
    spacing_scale: Number.isFinite(spacing) ? Math.min(12, Math.max(6, spacing)) : DEFAULT_APPLIED_THEME.spacing_scale,
  };
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(normalizeThemeColor(hex, '#12396D'));
  const channels = [rgb.r, rgb.g, rgb.b].map((value) => value / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground), b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function validateAppliedTheme(theme: Partial<AppliedTheme>): string[] {
  const errors: string[] = [];
  for (const key of ['primary_color', 'secondary_color', 'accent_color'] as const) {
    if (!isValidThemeColor(theme[key])) errors.push(`${key.replace('_', ' ')} must be a valid 3- or 6-digit hexadecimal color.`);
  }
  if (isValidThemeColor(theme.primary_color) && contrastRatio(theme.primary_color, '#ffffff') < 4.5) errors.push('Primary color must provide at least 4.5:1 contrast with white button text.');
  if (isValidThemeColor(theme.accent_color) && contrastRatio(theme.accent_color, '#ffffff') < 4.5) errors.push('Supporting accent must provide at least 4.5:1 contrast with white button text.');
  for (const key of ['heading_font', 'body_font'] as const) {
    if (typeof theme[key] !== 'string' || !(ALLOWED_THEME_FONTS as readonly string[]).includes(theme[key])) errors.push(`${key.replace('_', ' ')} is not an approved font option.`);
  }
  if (!['square', 'rounded', 'pill'].includes(String(theme.button_style))) errors.push('Button style must be square, rounded, or pill.');
  if (!Number.isFinite(Number(theme.border_radius)) || Number(theme.border_radius) < 0 || Number(theme.border_radius) > 32) errors.push('Border radius must be between 0 and 32 pixels.');
  if (!Number.isFinite(Number(theme.spacing_scale)) || Number(theme.spacing_scale) < 6 || Number(theme.spacing_scale) > 12) errors.push('Spacing scale must be between 6 and 12 pixels.');
  return errors;
}

export function validateCustomCss(css: string): { valid: boolean; reason?: string } {
  if (css.length > 40000) return { valid: false, reason: 'Custom CSS must be 40,000 characters or fewer.' };
  if (/@import|url\s*\(|expression\s*\(|javascript\s*:|behavior\s*:|-moz-binding/i.test(css)) return { valid: false, reason: 'External imports, URL loading and executable CSS constructs are not permitted.' };
  if (/outline\s*:\s*(?:none|0)(?:\s*!important)?/i.test(css)) return { valid: false, reason: 'Custom CSS cannot remove visible keyboard focus outlines.' };
  if (/(?:^|})\s*(?:html|:root|body|#root|main|\*)\s*\{[^}]*?(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(css)) return { valid: false, reason: 'Custom CSS cannot hide the application root or all page content.' };
  return { valid: true };
}

function containsDisallowedControlCharacter(value: string): boolean {
  // Use code-point checks instead of a control-character regex so ESLint's
  // no-control-regex rule stays enabled without weakening token validation.
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f) return true;
  }
  return false;
}

export function isSafeDesignTokenValue(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 256 && !/[;{}<>]/.test(value) && !containsDisallowedControlCharacter(value) && !/@import|url\s*\(|expression\s*\(|javascript\s*:|behavior\s*:|-moz-binding/i.test(value);
}

const RADIUS_BY_BUTTON_STYLE: Record<string, string> = {
  square: '0.25rem',
  rounded: '0.5rem',
  pill: '9999px',
};

// Self-hosted brand fonts register as "<Name> Variable"; other approved fonts are system or user-installed.
const FONT_FAMILY: Record<string, string> = { Sora: '"Sora Variable", "Sora"', Manrope: '"Manrope Variable", "Manrope"' };
const fontStack = (name: string) => `${FONT_FAMILY[name] ?? `"${name}"`}, system-ui, sans-serif`;

export function applyTheme(theme: AppliedTheme) {
  if (typeof document === 'undefined') return;
  const safeTheme = normalizeAppliedTheme(theme);
  const root = document.documentElement;
  root.style.setProperty('--topline-brand-primary', safeTheme.primary_color);
  root.style.setProperty('--topline-brand-accent', safeTheme.secondary_color);
  root.style.setProperty('--topline-brand-accent-strong', generateColorRamp(safeTheme.secondary_color)['700']);
  root.style.setProperty('--theme-secondary', safeTheme.secondary_color);
  root.style.setProperty('--theme-accent', safeTheme.accent_color);
  root.style.setProperty('--topline-focus', safeTheme.primary_color);
  root.style.setProperty('--theme-heading-font', fontStack(safeTheme.heading_font));
  root.style.setProperty('--theme-body-font', fontStack(safeTheme.body_font));
  root.style.setProperty('--theme-border-radius', `${safeTheme.border_radius}px`);
  root.style.setProperty('--theme-spacing-scale', `${safeTheme.spacing_scale}px`);
  // Runtime theme settings provide layout defaults; active site-design tokens load later and take precedence.
  root.style.setProperty('--layout-section-gap', `${safeTheme.spacing_scale * 8}px`);
  root.style.setProperty('--layout-content-gap', `${safeTheme.spacing_scale * 3}px`);
  root.style.setProperty('--theme-btn-radius', RADIUS_BY_BUTTON_STYLE[safeTheme.button_style] ?? RADIUS_BY_BUTTON_STYLE.rounded);
  applyPrimaryColorRamp(safeTheme.primary_color);
  applyAccentColorRamp(safeTheme.accent_color);
}
