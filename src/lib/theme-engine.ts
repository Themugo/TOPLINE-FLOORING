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

// Target lightness for each shade step, calibrated to feel like a
// normal Tailwind-style ramp regardless of the input hue.
const LIGHTNESS_STEPS: Record<string, number> = {
  '50': 96,
  '100': 91,
  '200': 82,
  '300': 70,
  '400': 58,
  '500': 47,
  '600': 38,
  '700': 30,
  '800': 24,
  '900': 20,
  '950': 12,
};

export function generateColorRamp(baseHex: string): Record<string, string> {
  let hsl: HSL;
  try {
    hsl = rgbToHsl(hexToRgb(baseHex));
  } catch {
    hsl = { h: 42, s: 65, l: 47 }; // fallback to the default brand gold's hue
  }

  const ramp: Record<string, string> = {};
  for (const [step, lightness] of Object.entries(LIGHTNESS_STEPS)) {
    // Slightly reduce saturation at the extremes so very light/dark
    // steps don't look neon or muddy.
    const satAdjust = lightness > 85 || lightness < 20 ? hsl.s * 0.85 : hsl.s;
    ramp[step] = hslToHex({ h: hsl.h, s: Math.min(satAdjust, 90), l: lightness });
  }
  return ramp;
}

/** Applies a generated ramp to the document as CSS custom properties
 * and injects override rules for every primary-* utility class actually
 * used across the site, so the admin's color choice takes effect
 * immediately without a rebuild. */
export function applyPrimaryColorRamp(baseHex: string) {
  if (typeof document === 'undefined') return;
  const ramp = generateColorRamp(baseHex);

  const styleId = 'dynamic-theme-overrides';
  let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = styleId;
    document.head.appendChild(styleTag);
  }

  const rules: string[] = [];
  for (const [step, hex] of Object.entries(ramp)) {
    rules.push(`.bg-primary-${step}{background-color:${hex} !important}`);
    rules.push(`.text-primary-${step}{color:${hex} !important}`);
    rules.push(`.border-primary-${step}{border-color:${hex} !important}`);
    rules.push(`.ring-primary-${step}{--tw-ring-color:${hex} !important}`);
    rules.push(`.hover\\:bg-primary-${step}:hover{background-color:${hex} !important}`);
    rules.push(`.hover\\:text-primary-${step}:hover{color:${hex} !important}`);
    rules.push(`.focus\\:ring-primary-${step}:focus{--tw-ring-color:${hex} !important}`);
    rules.push(`.from-primary-${step}{--tw-gradient-from:${hex} !important}`);
  }

  styleTag.textContent = rules.join('\n');
}

export function resetPrimaryColorOverrides() {
  if (typeof document === 'undefined') return;
  const styleTag = document.getElementById('dynamic-theme-overrides');
  if (styleTag) styleTag.textContent = '';
}
