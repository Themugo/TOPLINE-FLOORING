import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json'));
const app = read('src/App.tsx');
const html = read('index.html');
const css = read('src/index.css');
const browser = read('scripts/test-g09-responsive-browser.mjs');
const workflow = read('.github/workflows/ci.yml');
const runbook = read('docs/G-09-UI-MOBILE-BROWSER-CERTIFICATION-UAT-RUNBOOK.md');
const checks = [
  ['package static verifier command', pkg.scripts['verify:g09-responsive-certification'] === 'node scripts/verify-g09-responsive-certification.mjs'],
  ['package browser certification command', pkg.scripts['test:g09-responsive-browser'] === 'node scripts/test-g09-responsive-browser.mjs'],
  ['CI registers G-09 source verifier', workflow.includes('npm run verify:g09-responsive-certification')],
  ['CI runs G-09 browser suite after production build', workflow.includes('npm run test:g09-responsive-browser') && workflow.indexOf('npm run build') < workflow.indexOf('npm run test:g09-responsive-browser')],
  ['viewport metadata supports safe areas and responsive layout', /name="viewport" content="width=device-width, initial-scale=1\.0, viewport-fit=cover"/.test(html)],
  ['global keyboard focus treatment exists', css.includes(':focus-visible')],
  ['reduced motion preference is respected', css.includes('prefers-reduced-motion: reduce')],
  ['mobile menu safe-area padding exists', css.includes('env(safe-area-inset-bottom)')],
  ['route matrix covers public and privileged entrypoints', ['/','/services','/shop','/portfolio','/contact','/quotation','/cart','/portal','/track-order','/admin/login'].every((route) => browser.includes(`'${route}'`))],
  ['viewport matrix covers desktop tablet and mobile widths', [1440,1280,1024,768,390,320].every((width) => browser.includes(`width: ${width}`))],
  ['browser checks document overflow', browser.includes('document.documentElement.scrollWidth') && browser.includes('state.documentWidth > state.innerWidth + 1')],
  ['browser exercises mobile menu open, Escape close and focus return', browser.includes('mobile-menu-open-escape-focus-return') && browser.includes('document.activeElement === toggle')],
  ['browser checks runtime exceptions', browser.includes('Runtime.exceptionThrown') && browser.includes('pageExceptions.length')],
  ['browser captures responsive screenshots', browser.includes('Page.captureScreenshot') && browser.includes('writeFileSync(join(artifactDir')],
  ['browser produces machine-readable evidence', browser.includes("browser-summary.json")],
  ['browser runbook distinguishes CI/browser from real-device testing', runbook.includes('physical-device') && runbook.includes('not run')],
  ['application route definitions retain customer and admin paths', app.includes("location === '/shop'") && app.includes("location === '/admin/login'")],
];
let failures = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  if (!passed) failures++;
}
console.log(`G-09 responsive source verifier: ${checks.length - failures}/${checks.length} passed.`);
if (failures) process.exitCode = 1;
