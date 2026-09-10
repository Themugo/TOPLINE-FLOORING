/*
# Fix Partner Logos, Add Missing Real Services, Seed Product Galleries

Migration 015 already enriched the product catalog (SKUs, stock levels,
short descriptions, 8 new products). This migration covers what that
one didn't touch:

1. Partner "logos" were pointing at brand websites' internal asset
   paths and favicons (e.g. basf.com/favicon.ico) - these never
   reliably hotlink and were rendering as broken images. Cleared so the
   site's existing text-fallback renders cleanly instead.

2. Two services actually shown on the real live site were missing from
   the seed data entirely: "Concrete Repair and Protection" and
   "Roof Coating and Maintenance".

3. Product photo galleries - products only ever had a single photo with
   no way to add more, even though `product_images` (a proper gallery
   table with per-photo captions) already existed unused. Seeds a
   starter gallery with captions for a few flagship products so there's
   something to see immediately; the new Admin -> Products gallery
   manager is how you replace these with real project photos going
   forward.
*/

-- ============================================================
-- 1. Fix broken partner logos
-- ============================================================
UPDATE partners SET logo_url = NULL
WHERE logo_url IN (
  'https://www.sika.com/content/sika-group/themes/sika_theme/images/logo.svg',
  'https://www.mapei.com/themes/custom/mapei_theme/logo.svg',
  'https://www.basf.com/favicon.ico'
) OR logo_url LIKE '%favicon%';

-- ============================================================
-- 2. Two real services missing from the original seed data
-- ============================================================
INSERT INTO services (name, slug, description, short_description, image_url, icon, features, display_order, is_active)
SELECT 'Concrete Repair and Protection', 'concrete-repair-and-protection',
  'Professional crack repairs, structural rehabilitation, and protective coatings that restore and reinforce damaged concrete surfaces - from hairline cracks to major structural repairs.',
  'Crack repairs, structural rehabilitation & protective coatings',
  'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80',
  'Hammer',
  '["Crack injection repair", "Structural rehabilitation", "Spalling concrete repair", "Protective coatings", "Surface restoration"]',
  6, true
WHERE NOT EXISTS (SELECT 1 FROM services WHERE slug = 'concrete-repair-and-protection');

INSERT INTO services (name, slug, description, short_description, image_url, icon, features, display_order, is_active)
SELECT 'Roof Coating and Maintenance', 'roof-coating-and-maintenance',
  'Energy-efficient roof coating and repair services to reduce heat absorption, prevent leaks, and extend roof durability - for flat, pitched, and industrial roofing systems.',
  'Roof coatings that cut heat, stop leaks & extend roof life',
  'https://images.unsplash.com/photo-1553413077-190083ec01ff?auto=format&fit=crop&w=800&q=80',
  'Sun',
  '["Reflective roof coatings", "Leak detection & repair", "Industrial roof maintenance", "Heat-reduction systems", "Preventive inspections"]',
  7, true
WHERE NOT EXISTS (SELECT 1 FROM services WHERE slug = 'roof-coating-and-maintenance');

-- ============================================================
-- 3. Starter product photo galleries with captions, on products
--    added by migration 015 that don't already have gallery photos.
--    Reuses the same verified Unsplash photo set as the rest of the
--    site rather than introducing unverified URLs.
-- ============================================================
INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary)
SELECT p.id, p.image_url, 'Product ready for site delivery', 0, true
FROM products p
WHERE p.slug IN ('aquashield-roof-membrane', 'durafloor-anti-slip-epoxy', 'parkdeck-pu-coating', 'hydrobar-liquid-membrane')
  AND NOT EXISTS (SELECT 1 FROM product_images WHERE product_id = p.id);

INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary)
SELECT p.id, 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
  'Surface preparation before application', 1, false
FROM products p
WHERE p.slug = 'durafloor-anti-slip-epoxy'
  AND (SELECT count(*) FROM product_images WHERE product_id = p.id) < 2;

INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary)
SELECT p.id, 'https://images.unsplash.com/photo-1503387762-592deb587942?auto=format&fit=crop&w=800&q=80',
  'Finished floor ready for handover', 2, false
FROM products p
WHERE p.slug = 'durafloor-anti-slip-epoxy'
  AND (SELECT count(*) FROM product_images WHERE product_id = p.id) < 3;

INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary)
SELECT p.id, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80',
  'Close-up detail of the finished surface', 1, false
FROM products p
WHERE p.slug = 'parkdeck-pu-coating'
  AND (SELECT count(*) FROM product_images WHERE product_id = p.id) < 2;
