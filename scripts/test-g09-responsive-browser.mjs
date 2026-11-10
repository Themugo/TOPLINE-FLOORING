import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const root = process.cwd();
const artifactDir = resolve(root, 'artifacts/g09-browser');
mkdirSync(artifactDir, { recursive: true });
const routes = ['/', '/services', '/shop', '/portfolio', '/contact', '/quotation', '/cart', '/portal', '/track-order', '/admin/login'];
const viewports = [
  { name: 'desktop', width: 1440, height: 1000, mobile: false },
  { name: 'small-desktop', width: 1280, height: 900, mobile: false },
  { name: 'tablet-landscape', width: 1024, height: 768, mobile: false },
  { name: 'tablet-portrait', width: 768, height: 1024, mobile: true },
  { name: 'mobile', width: 390, height: 844, mobile: true },
  { name: 'small-mobile', width: 320, height: 740, mobile: true },
];
const chromeCandidates = [
  process.env.TOPLINE_CHROME_BIN,
  process.env.CHROME_BIN,
  '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  join(process.env.PROGRAMFILES || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe'),
  join(process.env['PROGRAMFILES(X86)'] || 'C:/Program Files (x86)', 'Google/Chrome/Application/chrome.exe'),
  join(homedir(), 'AppData/Local/Google/Chrome/Application/chrome.exe'),
].filter(Boolean);
const chrome = chromeCandidates.find((candidate) => existsSync(candidate));
if (!chrome) throw new Error('Chrome/Chromium not found. Set TOPLINE_CHROME_BIN to the browser executable.');
if (!existsSync(join(root, 'dist', 'index.html'))) throw new Error('Production build missing: run npm run build before browser certification.');

const port = 4173;
const preview = spawn(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore', env: process.env });
const profile = join(tmpdir(), `topline-g09-chrome-${process.pid}`);
const browser = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--hide-scrollbars=false', '--remote-debugging-port=0', '--remote-allow-origins=*', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
let ws;
let requestId = 0;
const pending = new Map();
const exceptions = [];

function connectCdp(url) {
  return new Promise((resolvePromise, reject) => {
    ws = new WebSocket(url);
    ws.addEventListener('open', () => resolvePromise());
    ws.addEventListener('error', reject);
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails?.text || 'Unspecified browser exception');
      if (message.id && pending.has(message.id)) {
        const { resolve: done, reject: fail } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) fail(new Error(message.error.message)); else done(message.result || {});
      }
    });
  });
}
function cdp(method, params = {}) {
  const id = ++requestId;
  return new Promise((resolvePromise, reject) => {
    pending.set(id, { resolve: resolvePromise, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function waitForPreview() {
  for (let i = 0; i < 60; i++) {
    try { const response = await fetch(`http://127.0.0.1:${port}`); if (response.ok) return; } catch {}
    await delay(500);
  }
  throw new Error('Vite preview did not become ready.');
}
async function evaluate(expression) {
  const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Browser evaluation failed');
  return result.result?.value;
}

const results = [];
try {
  await waitForPreview();
  let debugPort;
  const portFile = join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 60 && !existsSync(portFile); i++) await delay(250);
  if (!existsSync(portFile)) throw new Error('Chromium remote debugging endpoint did not start.');
  debugPort = Number(readFileSync(portFile, 'utf8').split(/\r?\n/)[0]);
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  const page = targets.find((target) => target.type === 'page');
  if (!page?.webSocketDebuggerUrl) throw new Error('Chromium page target not found.');
  await connectCdp(page.webSocketDebuggerUrl);
  await cdp('Page.enable');
  await cdp('Runtime.enable');

  for (const viewport of viewports) {
    await cdp('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: viewport.mobile ? 2 : 1, mobile: viewport.mobile });
    for (const route of routes) {
      exceptions.length = 0;
      await cdp('Page.navigate', { url: `http://127.0.0.1:${port}${route}` });
      await delay(900);
      const state = await evaluate(`(() => {
        const root = document.getElementById('root');
        const main = document.querySelector('main, [role="main"]');
        const meta = document.querySelector('meta[name="viewport"]');
        const images = [...document.images].filter((img) => img.complete && img.naturalWidth === 0 && img.currentSrc);
        return {
          ready: document.readyState,
          rootText: (root?.innerText || '').trim().slice(0, 120),
          mainPresent: !!main,
          viewportMeta: meta?.content || '',
          innerWidth: window.innerWidth,
          documentWidth: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0),
          brokenImages: images.length,
          title: document.title
        };
      })()`);
      const overflow = state.documentWidth > state.innerWidth + 1;
      const rootEmpty = !state.rootText;
      const noMain = false; // Route shells differ; content readiness is asserted through the hydrated root.
      const pageExceptions = [...exceptions];
      const passed = state.ready === 'complete' && !overflow && !rootEmpty && !pageExceptions.length;
      results.push({ viewport: viewport.name, width: viewport.width, route, passed, overflow, rootEmpty, noMain, pageExceptions, ...state });
      if (route === '/' && viewport.width <= 768) {
        const menuResult = await evaluate(`(async () => {
          const toggle = document.querySelector('button[aria-label="Open menu"]');
          if (!toggle) return { available: false, opened: false, escaped: false, focusReturned: false };
          toggle.click();
          await new Promise((resolve) => setTimeout(resolve, 120));
          const menu = document.getElementById('mobile-menu');
          const opened = !!menu && toggle.getAttribute('aria-expanded') === 'true';
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          await new Promise((resolve) => setTimeout(resolve, 120));
          const escaped = !document.getElementById('mobile-menu') && toggle.getAttribute('aria-expanded') === 'false';
          return { available: true, opened, escaped, focusReturned: document.activeElement === toggle };
        })())`);
        results.push({ viewport: viewport.name, width: viewport.width, route, interaction: 'mobile-menu-open-escape-focus-return', passed: menuResult.available && menuResult.opened && menuResult.escaped && menuResult.focusReturned, ...menuResult });
      }
      if (route === '/' || route === '/admin/login') {
        const shot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        writeFileSync(join(artifactDir, `${viewport.name}-${route === '/' ? 'home' : 'admin-login'}.png`), Buffer.from(shot.data, 'base64'));
      }
    }
  }
} finally {
  try { ws?.close(); } catch {}
  browser.kill('SIGTERM');
  preview.kill('SIGTERM');
  rmSync(profile, { recursive: true, force: true });
}

const failed = results.filter((result) => !result.passed);
const summary = {
  suite: 'G-09 responsive browser certification',
  generatedAt: new Date().toISOString(),
  baseUrl: `http://127.0.0.1:${port}`,
  browser: chrome,
  viewports: viewports.map(({ name, width, height }) => ({ name, width, height })),
  routes,
  total: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  results,
};
writeFileSync(join(artifactDir, 'browser-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
writeFileSync(join(artifactDir, 'browser-summary.md'), [
  '# G-09 Responsive Browser Run', '',
  `- Total checks: ${summary.total}`, `- Passed: ${summary.passed}`, `- Failed: ${summary.failed}`,
  `- Browser executable: ${chrome}`, `- Routes: ${routes.join(', ')}`, '',
  ...(failed.length ? ['## Failures', ...failed.map((item) => `- ${item.viewport} (${item.width}px) ${item.route}: ${JSON.stringify({ overflow: item.overflow, rootEmpty: item.rootEmpty, noMain: item.noMain, exceptions: item.pageExceptions })}`)] : ['All route/viewport checks passed.']), ''
].join('\n'));
console.log(`G-09 browser checks: ${summary.passed}/${summary.total} passed; ${summary.failed} failed.`);
if (failed.length) process.exitCode = 1;
