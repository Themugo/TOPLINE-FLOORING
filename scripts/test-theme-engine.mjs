import { generateColorRamp, normalizeAppliedTheme, validateAppliedTheme, validateCustomCss, isSafeDesignTokenValue, applyTheme } from '../src/lib/theme-engine.ts';

const checks = [];
const check = (name, fn) => {
  try { fn(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: error instanceof Error ? error.message : String(error) }); }
};

check('selected color remains the 500 shade', () => {
  if (generateColorRamp('#153f69')['500'].toLowerCase() !== '#153f69') throw new Error('Selected color was not preserved.');
});
check('color ramp contains eleven shade steps', () => {
  if (Object.keys(generateColorRamp('#153f69')).length !== 11) throw new Error('Expected 11 shade steps.');
});
check('invalid theme color normalizes safely', () => {
  if (normalizeAppliedTheme({ primary_color: 'red' }).primary_color !== '#153f69') throw new Error('Invalid color did not fall back.');
});
check('low-contrast persisted theme normalizes to safe brand colors', () => {
  const normalized = normalizeAppliedTheme({ primary_color: '#c9971f', accent_color: '#3b82f6' });
  if (normalized.primary_color !== '#153f69' || normalized.accent_color !== '#0369a1') throw new Error('Low-contrast persisted color did not fall back safely.');
});
check('unsafe low-contrast primary is rejected', () => {
  const errors = validateAppliedTheme({ primary_color: '#ffffff', secondary_color: '#c9971f', accent_color: '#0369a1', heading_font: 'Inter', body_font: 'Inter', button_style: 'rounded', border_radius: 8, spacing_scale: 8 });
  if (!errors.some((error) => error.includes('Primary color'))) throw new Error('Low-contrast primary was accepted.');
});
check('unsafe low-contrast accent is rejected', () => {
  const errors = validateAppliedTheme({ primary_color: '#153f69', secondary_color: '#c9971f', accent_color: '#3b82f6', heading_font: 'Inter', body_font: 'Inter', button_style: 'rounded', border_radius: 8, spacing_scale: 8 });
  if (!errors.some((error) => error.includes('Supporting accent'))) throw new Error('Low-contrast accent was accepted.');
});
check('valid theme passes validation', () => {
  const errors = validateAppliedTheme({ primary_color: '#153f69', secondary_color: '#c9971f', accent_color: '#0369a1', heading_font: 'Inter', body_font: 'Inter', button_style: 'rounded', border_radius: 8, spacing_scale: 8 });
  if (errors.length) throw new Error(errors.join(' '));
});
check('keyboard focus outline cannot be removed by custom CSS', () => {
  if (validateCustomCss('*:focus { outline: none; }').valid) throw new Error('Focus-removing CSS was accepted.');
});
check('application root cannot be hidden by custom CSS', () => {
  if (validateCustomCss('body { display: none; }').valid) throw new Error('Root-hiding CSS was accepted.');
});
check('document root cannot be hidden by custom CSS', () => {
  if (validateCustomCss(':root { visibility: hidden; }').valid) throw new Error('Document-root-hiding CSS was accepted.');
});
check('valid CSS customizations remain supported', () => {
  if (!validateCustomCss('.custom-banner { border-color: #153f69; }').valid) throw new Error('Safe CSS was rejected.');
});
check('safe shadow token remains supported', () => {
  if (!isSafeDesignTokenValue('0 10px 30px rgba(15,23,42,.08)')) throw new Error('Safe shadow token was rejected.');
});
check('external URL token is rejected', () => {
  if (isSafeDesignTokenValue('url(https://example.com/image.png)')) throw new Error('External URL token was accepted.');
});
check('empty design token value is rejected', () => {
  if (isSafeDesignTokenValue('   ')) throw new Error('Empty design token was accepted.');
});
check('design tokens reject control characters without regex control ranges', () => {
  if (isSafeDesignTokenValue('safe\nunsafe') || isSafeDesignTokenValue('safe\u0000unsafe') || isSafeDesignTokenValue('safe\u001funsafe')) throw new Error('Control character in design token was accepted.');
  if (!isSafeDesignTokenValue('safe token value')) throw new Error('Ordinary design token was rejected.');
});
check('theme values are clamped to supported bounds', () => {
  const normalized = normalizeAppliedTheme({ primary_color: 'red', heading_font: '<bad>', button_style: 'weird', border_radius: 100, spacing_scale: 0 });
  if (normalized.primary_color !== '#153f69' || normalized.heading_font !== 'Space Grotesk' || normalized.button_style !== 'rounded' || normalized.border_radius !== 32 || normalized.spacing_scale !== 6) throw new Error('Normalization did not apply safe defaults/bounds.');
});
check('applyTheme updates semantic variables and preserves both dynamic ramps', () => {
  const vars = new Map();
  const elements = new Map();
  const fakeDocument = {
    documentElement: { style: { setProperty: (key, value) => vars.set(key, value) } },
    getElementById: (id) => elements.get(id) ?? null,
    createElement: () => ({ id: '', dataset: {}, textContent: '' }),
    head: { appendChild: (element) => elements.set(element.id, element) },
  };
  globalThis.document = fakeDocument;
  applyTheme({ primary_color: '#153f69', secondary_color: '#c9971f', accent_color: '#0369a1', heading_font: 'Space Grotesk', body_font: 'Inter', button_style: 'rounded', border_radius: 10, spacing_scale: 8 });
  const style = elements.get('dynamic-theme-overrides');
  if (vars.get('--topline-brand-primary') !== '#153f69' || vars.get('--topline-brand-accent') !== '#c9971f') throw new Error('Brand variables were not applied.');
  if (vars.get('--layout-section-gap') !== '64px' || vars.get('--layout-content-gap') !== '24px' || vars.get('--theme-border-radius') !== '10px') throw new Error('Layout tokens were not applied.');
  if (!style?.textContent.includes('.bg-primary-500{background-color:#153f69 !important}') || !style.textContent.includes('.bg-accent-500{background-color:#0369a1 !important}')) throw new Error('Primary and accent ramps were not both retained.');
  delete globalThis.document;
});

const failed = checks.filter((item) => !item.passed);
if (failed.length) {
  console.error(`Theme engine runtime tests FAILED: ${checks.length - failed.length}/${checks.length} passed.`);
  for (const item of failed) console.error(`- ${item.name}: ${item.error}`);
  process.exit(1);
}
console.log(`Theme engine runtime tests passed (${checks.length}/${checks.length}).`);
