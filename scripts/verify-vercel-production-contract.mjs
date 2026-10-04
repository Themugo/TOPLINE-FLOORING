import fs from 'node:fs';
import path from 'node:path';

// Production contract for what Vercel serves and what CI/CLI require. Each rule exists because
// breaking it fails in production or in the pipeline, not on a developer machine.
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

const vercel = JSON.parse(read('vercel.json'));
const headers = Object.fromEntries((vercel.headers?.[0]?.headers ?? []).map((h) => [h.key, h.value]));
const csp = headers['Content-Security-Policy'] ?? '';
const directive = (name) => (csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(`${name} `)) ?? '');

const script = directive('script-src');
check(script.length > 0, 'CSP has no script-src');
check(!script.includes("'unsafe-eval'") && !script.includes("'unsafe-inline'"), "CSP script-src must not allow 'unsafe-inline' or 'unsafe-eval' (the build emits only external module scripts)");
check(directive('object-src').includes("'none'"), "CSP must set object-src 'none'");
check(directive('connect-src').includes('https://*.supabase.co'), 'CSP connect-src must allow the Supabase project');
check(headers['Strict-Transport-Security']?.includes('max-age='), 'Strict-Transport-Security header is missing');

// Every cross-origin iframe in the source must be permitted by frame-src, otherwise the browser blocks it silently.
const walk = (d) => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
for (const file of walk('src').filter((f) => f.endsWith('.tsx'))) {
  for (const m of read(file).matchAll(/<iframe[^>]*?src=["'](https:\/\/[^/"']+)/gs)) {
    check(directive('frame-src').includes(m[1]), `${file}: iframe from ${m[1]} is blocked by CSP frame-src`);
  }
}

// The build must produce the sitemap, and CI requires the generated database types.
const pkg = JSON.parse(read('package.json'));
check(pkg.scripts.prebuild === 'node scripts/generate-sitemap.mjs', 'prebuild must generate the sitemap');
check(vercel.buildCommand === 'npm run build' && vercel.outputDirectory === 'dist', 'Vercel must run npm run build and publish dist');
check(exists('src/types/database.ts'), 'src/types/database.ts is missing: CI step "Generated database types contract" (REQUIRE_GENERATED_TYPES=true) fails');
check(read('.gitignore').includes('public/sitemap.xml'), 'public/sitemap.xml must stay git-ignored (generated at build)');

// Migration chain: unique 14-digit versions are what `supabase db push` keys on.
const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((f) => f.endsWith('.sql'));
const versions = migrations.map((f) => f.match(/^(\d{14})_/)?.[1]);
check(versions.every(Boolean), 'every migration file must start with a 14-digit version');
check(new Set(versions).size === migrations.length, 'duplicate migration versions break `supabase db push`');
const manifest = read('supabase/MIGRATION_MANIFEST.md');
check(manifest.includes(`contains ${migrations.length} uniquely timestamped active migrations`), `MIGRATION_MANIFEST.md count must equal ${migrations.length}`);

if (failures.length) { console.error('Vercel/CLI production contract FAILED.'); failures.forEach((f) => console.error(`- ${f}`)); process.exit(1); }
console.log('Vercel/CLI production contract verified.');
