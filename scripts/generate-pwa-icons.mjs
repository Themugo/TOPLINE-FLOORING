#!/usr/bin/env node
/**
 * Regenerates the installable-app icons in public/icons from public/topline-brand-mark.svg.
 *
 *   node scripts/generate-pwa-icons.mjs
 *
 * Needs Playwright (any version with Chromium) purely as a rasteriser; it is NOT a project dependency
 * because the generated PNGs are committed. Install temporarily with `npm i --no-save playwright`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  try {
    // Falls back to CommonJS resolution so a globally installed Playwright (NODE_PATH) also works.
    ({ chromium } = createRequire(path.join(process.cwd(), 'noop.js'))('playwright'));
  } catch {
    chromium = undefined;
  }
}
if (!chromium) {
  console.error('playwright is not installed. Run: npm i --no-save playwright && npx playwright install chromium');
  process.exit(1);
}

const root = process.cwd();
const svg = fs.readFileSync(path.join(root, 'public/topline-brand-mark.svg'), 'utf8')
  .replace(/<svg /, '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" ');
const outDir = path.join(root, 'public/icons');
fs.mkdirSync(outDir, { recursive: true });

const CREAM = '#F7F6F3';
// `scale` is the fraction of the canvas the mark may occupy. Maskable icons must keep the mark inside the
// central 80% "safe zone" because launchers crop to circles / squircles; iOS rounds corners itself.
const targets = [
  { file: 'icon-192.png', size: 192, scale: 0.7, radius: 0.22 },
  { file: 'icon-512.png', size: 512, scale: 0.7, radius: 0.22 },
  { file: 'icon-maskable-192.png', size: 192, scale: 0.56, radius: 0 },
  { file: 'icon-maskable-512.png', size: 512, scale: 0.56, radius: 0 },
  { file: 'apple-touch-icon.png', size: 180, scale: 0.64, radius: 0 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size });
  const markW = Math.round(t.size * t.scale);
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">
    <div style="width:${t.size}px;height:${t.size}px;background:${CREAM};border-radius:${Math.round(t.size * t.radius)}px;display:flex;align-items:center;justify-content:center">
      <div style="width:${markW}px;height:${markW}px">${svg}</div>
    </div></body></html>`);
  await page.screenshot({ path: path.join(outDir, t.file), omitBackground: t.radius > 0, clip: { x: 0, y: 0, width: t.size, height: t.size } });
  console.log('wrote', path.join('public/icons', t.file));
}
await browser.close();
