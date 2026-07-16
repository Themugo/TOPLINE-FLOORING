/**
 * Build-time sitemap generator.
 *
 * Run:  node scripts/generate-sitemap.mjs
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
 *
 * Outputs: public/sitemap.xml
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Load .env
let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  try {
    const envFile = readFileSync(resolve(root, '.env'), 'utf-8');
    for (const line of envFile.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key === 'VITE_SUPABASE_URL') supabaseUrl = val;
      if (key === 'VITE_SUPABASE_ANON_KEY') supabaseKey = val;
    }
  } catch {
    // .env not found
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BASE = 'https://toplineflooring.co.ke';
const today = new Date().toISOString().split('T')[0];

const staticUrls = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/shop', changefreq: 'weekly', priority: '0.9' },
  { loc: '/services', changefreq: 'weekly', priority: '0.9' },
  { loc: '/portfolio', changefreq: 'weekly', priority: '0.8' },
  { loc: '/about', changefreq: 'monthly', priority: '0.7' },
  { loc: '/faq', changefreq: 'monthly', priority: '0.6' },
  { loc: '/contact', changefreq: 'monthly', priority: '0.8' },
  { loc: '/quotation', changefreq: 'monthly', priority: '0.8' },
];

function escXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function fetchSlugs(table, slugCol = 'slug', activeCol = 'is_active') {
  try {
    const { data, error } = await supabase
      .from(table)
      .select(slugCol)
      .eq(activeCol, true);
    if (error) throw error;
    return (data || []).map((r) => r[slugCol]).filter(Boolean);
  } catch (err) {
    console.warn(`  Warning: could not fetch ${table}: ${err.message}`);
    return [];
  }
}

async function main() {
  console.log('Generating sitemap.xml...');

  const [productSlugs, serviceSlugs, projectSlugs] = await Promise.all([
    fetchSlugs('products'),
    fetchSlugs('services'),
    fetchSlugs('projects'),
  ]);

  console.log(`  Products: ${productSlugs.length}, Services: ${serviceSlugs.length}, Projects: ${projectSlugs.length}`);

  const urls = [...staticUrls];

  for (const slug of productSlugs) {
    urls.push({ loc: `/shop/${slug}`, changefreq: 'weekly', priority: '0.8' });
  }
  for (const slug of serviceSlugs) {
    urls.push({ loc: `/service/${slug}`, changefreq: 'monthly', priority: '0.7' });
  }
  for (const slug of projectSlugs) {
    urls.push({ loc: `/portfolio/${slug}`, changefreq: 'monthly', priority: '0.6' });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${BASE}${escXml(u.loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

  const outPath = resolve(root, 'public', 'sitemap.xml');
  writeFileSync(outPath, xml, 'utf-8');
  console.log(`  Written to ${outPath}`);
}

main().catch((err) => {
  console.error('Failed to generate sitemap:', err);
  process.exit(1);
});
