// Guards the 2026-11-02 browser-audit fixes (axe-core + real Chromium) against regression.
// Static, so it cannot replace a browser run, but it catches the specific patterns that caused each defect.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) walk(rel, out); else if (/\.(tsx|css)$/.test(e.name)) out.push(rel);
  }
  return out;
};
const sources = walk('src');
const failures = [];
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` ${detail}`}`); if (!ok) failures.push(name); };

// 1. In this theme primary-300 is a mid-lightness blue (the ramp is generated from a very dark brand navy), so it
//    fails contrast on every dark surface. Use primary-200/100 for text on dark.
const primary300 = sources.filter((f) => /text-primary-300\b/.test(read(f)));
check('no text-primary-300 (fails contrast on dark surfaces)', primary300.length === 0, primary300.join(', '));

// 2. A heading inside a dark text-white section must set its own light colour; the global h1-h6 rule is navy.
const DARK = /bg-(?:\[#(?:0[0-9a-fA-F]{5}|1[0-9a-fA-F]{5})\]|navy-(?:800|900|950)|primary-(?:500|600|700|800|900|950)|gray-(?:900|950)|black)/;
const LIGHT_TEXT = /text-(?:white|primary-(?:50|100|200)|navy-(?:50|100|200)|lime|\[#(?:fff|c|b))/i;
const invisible = [];
for (const f of sources.filter((x) => /\.tsx$/.test(x) && !x.includes(`${path.sep}admin${path.sep}`) && !x.includes(`${path.sep}ui${path.sep}`))) {
  const s = read(f);
  for (const m of s.matchAll(/<(section|aside|footer)\b[^>]*className="([^"]*)"/g)) {
    if (!DARK.test(m[2]) || !/\btext-white\b/.test(m[2])) continue;
    const end = s.indexOf(`</${m[1]}>`, m.index);
    const block = s.slice(m.index + m[0].length, end < 0 ? undefined : end);
    for (const h of block.matchAll(/<h[1-6]\b[^>]*>/g)) if (!LIGHT_TEXT.test(h[0])) invisible.push(`${f}: ${h[0].slice(0, 70)}`);
  }
}
check('headings on dark sections set an explicit light colour', invisible.length === 0, '\n  ' + invisible.join('\n  '));

// 3. Form controls need programmatic labels.
const quote = read('src/pages/quotation.tsx');
check('quotation selects are label-associated', ['quote-project-type', 'quote-substrate-condition', 'quote-timeline'].every((id) => quote.includes(`htmlFor="${id}"`) && quote.includes(`id="${id}"`)));

// 4. Sitewide horizontal overflow: long footer contact values must be able to wrap.
const footer = read('src/components/layout/Footer.tsx');
check('footer contact values can wrap (no sitewide horizontal scroll)', /\{email\}<\/span>/.test(footer) && /min-w-0 \[overflow-wrap:anywhere\]">\{email\}/.test(footer));

// 5. The document title belongs to useSeoMeta only.
const app = read('src/App.tsx');
check('App does not overwrite the per-page document title', !/document\.title\s*=/.test(app));
const seo = read('src/hooks/use-seo.ts');
check('fallback page titles are humanised (no "Track-order")', /split\('-'\)/.test(seo));

// 6. Page structure.
const card = read('src/components/ui/card.tsx');
check('CardTitle can render a real heading', /as\?:\s*"div" \| "h1"/.test(card));
check('customer portal exposes an h1', /<CardTitle as="h1">/.test(read('src/pages/portal.tsx')));

// 7. Fonts must never be inlined as data: URIs (the production CSP only allows 'self' + Google Fonts for font-src).
const vite = read('vite.config.ts');
check('vite never inlines fonts (CSP font-src)', /assetsInlineLimit/.test(vite) && /woff/.test(vite));
const vercel = JSON.parse(read('vercel.json'));
const csp = vercel.headers.flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy')?.value ?? '';
check('CSP font-src stays strict (no data: fonts)', /font-src 'self' https:\/\/fonts\.gstatic\.com;/.test(csp) && !/font-src[^;]*data:/.test(csp));

if (failures.length) { console.error(`\n${failures.length} accessibility/SEO contract check(s) failed.`); process.exit(1); }
console.log('\nAccessibility and SEO contract verified.');
