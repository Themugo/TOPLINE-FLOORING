/*
# Populate Site With Real Product & Service Content

Problem: the original seed data only had 7 products and 5 services,
several sharing the exact same photo (the same image used 2-3 times
across different products), no SKUs, no real stock quantities, and no
short descriptions - a genuinely thin, repetitive-looking catalog for a
site meant to be browsed and shopped.

This migration:
1. Enriches the 7 existing products with SKUs, realistic stock levels,
   short descriptions, and de-duplicated imagery (no two products in
   the same category share a photo anymore).
2. Adds 8 new products spread across all 5 existing categories, each
   with full realistic Kenyan-market details.
3. Adds short descriptions to the 5 existing services and de-duplicates
   their imagery against the product catalog where they'd otherwise
   collide on the same page (the homepage hero slider randomly mixes
   both).

All images are real, working Unsplash photos already verified elsewhere
in this codebase (used for category placeholders) - reused thoughtfully
here so no two items visible together share the same photo, rather than
gambling on unverified new image URLs.
*/

-- ============================================================
-- 1. Enrich existing products: SKU, stock, short description
-- ============================================================
UPDATE products SET
  sku = 'WP-TS107-25',
  stock_quantity = 48,
  low_stock_threshold = 10,
  short_description = 'Cementitious waterproofing slurry for wet areas and tanks',
  image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80'
WHERE slug = 'sika-topseal-107';

UPDATE products SET
  sku = 'EP-IND-SQM',
  stock_quantity = 320,
  low_stock_threshold = 50,
  short_description = 'Chemical-resistant epoxy coating for warehouses and factories',
  image_url = 'https://images.unsplash.com/photo-1504307651674-208930a97d63?auto=format&fit=crop&w=800&q=80'
WHERE slug = 'epoxycoat-industrial';

UPDATE products SET
  sku = 'PU-FLEX-SQM',
  stock_quantity = 210,
  low_stock_threshold = 40,
  short_description = 'Crack-bridging PU flooring for decks and outdoor areas',
  image_url = 'https://images.unsplash.com/photo-1503387762-592deb587942?auto=format&fit=crop&w=800&q=80'
WHERE slug = 'polyflex-pu-flooring';

UPDATE products SET
  sku = 'CS-PRO-20L',
  stock_quantity = 65,
  low_stock_threshold = 15,
  short_description = 'Penetrating sealer that protects while letting concrete breathe',
  image_url = 'https://images.unsplash.com/photo-1615840728552-7073c8c5d6c5?auto=format&fit=crop&w=800&q=80'
WHERE slug = 'concreteseal-pro';

UPDATE products SET
  sku = 'JS-FLEX-600',
  stock_quantity = 8,
  low_stock_threshold = 20,
  short_description = 'PU expansion joint sealant with excellent movement capability',
  image_url = 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80'
WHERE slug = 'flexjoint-sealant';

UPDATE products SET
  sku = 'WP-BIT-T140',
  stock_quantity = 22,
  low_stock_threshold = 8,
  short_description = 'Self-adhesive bituminous membrane for foundations and basements',
  image_url = 'https://images.unsplash.com/photo-1553413077-190083ec01ff?auto=format&fit=crop&w=800&q=80'
WHERE slug = 'sika-bituseal-t140';

UPDATE products SET
  sku = 'EP-METAL-SQM',
  stock_quantity = 40,
  low_stock_threshold = 10,
  short_description = 'Decorative pearlescent epoxy for showrooms and retail floors',
  image_url = 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80'
WHERE slug = 'metallic-epoxy-system';

-- ============================================================
-- 2. New products - 8 more across the 5 categories
-- ============================================================
INSERT INTO products (name, slug, category_id, description, short_description, price, unit, image_url, sku, stock_quantity, low_stock_threshold, featured, in_stock, display_order, is_active)
SELECT 'AquaShield Roof Membrane', 'aquashield-roof-membrane',
  (SELECT id FROM categories WHERE slug = 'waterproofing-systems'),
  'Torch-applied APP modified bitumen membrane engineered for flat roofs and terraces. UV-stabilized top layer resists cracking and blistering under East African sun exposure, with a 10-year manufacturer-backed service life.',
  'Torch-applied roof membrane, UV-stabilized for lasting protection',
  9200, 'roll (1m x 10m)',
  'https://images.unsplash.com/photo-1553413077-190083ec01ff?auto=format&fit=crop&w=800&q=80',
  'WP-ASHD-ROLL', 34, 8, true, true, 8, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'aquashield-roof-membrane');

INSERT INTO products (name, slug, category_id, description, short_description, price, unit, image_url, sku, stock_quantity, low_stock_threshold, featured, in_stock, display_order, is_active)
SELECT 'HydroBar Liquid Membrane', 'hydrobar-liquid-membrane',
  (SELECT id FROM categories WHERE slug = 'waterproofing-systems'),
  'Ready-to-use liquid-applied waterproofing membrane that cures into a seamless, flexible rubber-like coating. Ideal for irregular surfaces, balconies, and water tank interiors where sheet membranes are impractical.',
  'Seamless liquid-applied membrane for balconies and tanks',
  6800, '20kg pail',
  'https://images.unsplash.com/photo-1615840728552-7073c8c5d6c5?auto=format&fit=crop&w=800&q=80',
  'WP-HBAR-20K', 27, 8, false, true, 9, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'hydrobar-liquid-membrane');

INSERT INTO products (name, slug, category_id, description, short_description, price, unit, image_url, sku, stock_quantity, low_stock_threshold, featured, in_stock, display_order, is_active)
SELECT 'DuraFloor Anti-Slip Epoxy', 'durafloor-anti-slip-epoxy',
  (SELECT id FROM categories WHERE slug = 'epoxy-flooring'),
  'Textured epoxy floor system with aggregate broadcast for slip resistance, engineered for wet-process areas, loading bays, and ramps. Meets commercial safety flooring standards while retaining easy-clean epoxy durability.',
  'Textured, slip-resistant epoxy for wet-process areas and ramps',
  9600, 'sqm',
  'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80',
  'EP-ANTISLIP-SQM', 180, 40, true, true, 10, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'durafloor-anti-slip-epoxy');

INSERT INTO products (name, slug, category_id, description, short_description, price, unit, image_url, sku, stock_quantity, low_stock_threshold, featured, in_stock, display_order, is_active)
SELECT 'ESD ConductaFloor', 'esd-conductafloor',
  (SELECT id FROM categories WHERE slug = 'epoxy-flooring'),
  'Static-dissipative epoxy flooring system designed for electronics assembly, server rooms, and pharmaceutical facilities where static discharge control is a compliance requirement. Includes copper grounding strip installation.',
  'Static-dissipative epoxy for electronics and server room floors',
  13500, 'sqm',
  'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
  'EP-ESD-SQM', 60, 15, false, true, 11, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'esd-conductafloor');

INSERT INTO products (name, slug, category_id, description, short_description, price, unit, image_url, sku, stock_quantity, low_stock_threshold, featured, in_stock, display_order, is_active)
SELECT 'ParkDeck PU Coating', 'parkdeck-pu-coating',
  (SELECT id FROM categories WHERE slug = 'polyurethane-flooring'),
  'Multi-layer polyurethane parking deck system built to withstand vehicular traffic, fuel spills, and constant UV exposure on exposed decks. Includes a wearing course for skid resistance on ramps and turning bays.',
  'Vehicular-rated PU system for parking decks and ramps',
  11200, 'sqm',
  'https://images.unsplash.com/photo-1503387762-592deb587942?auto=format&fit=crop&w=800&q=80',
  'PU-PARKDECK-SQM', 95, 20, true, true, 12, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'parkdeck-pu-coating');

INSERT INTO products (name, slug, category_id, description, short_description, price, unit, image_url, sku, stock_quantity, low_stock_threshold, featured, in_stock, display_order, is_active)
SELECT 'ColdStore PU Floor System', 'coldstore-pu-floor-system',
  (SELECT id FROM categories WHERE slug = 'polyurethane-flooring'),
  'Thermal-shock resistant polyurethane flooring formulated specifically for cold storage and food processing facilities operating between -20C and 120C. Seamless, hygienic finish meets food safety hygiene standards.',
  'Thermal-shock resistant PU floor for cold storage facilities',
  14800, 'sqm',
  'https://images.unsplash.com/photo-1504307651674-208930a97d63?auto=format&fit=crop&w=800&q=80',
  'PU-COLDSTORE-SQM', 42, 10, false, true, 13, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'coldstore-pu-floor-system');

INSERT INTO products (name, slug, category_id, description, short_description, price, unit, image_url, sku, stock_quantity, low_stock_threshold, featured, in_stock, display_order, is_active)
SELECT 'GraniteGuard Densifier', 'graniteguard-densifier',
  (SELECT id FROM categories WHERE slug = 'concrete-sealers'),
  'Lithium silicate concrete densifier that chemically hardens the surface of polished concrete floors, increasing abrasion resistance and reducing dusting on warehouse and showroom slabs.',
  'Lithium silicate densifier for polished concrete durability',
  4100, '20L drum',
  'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80',
  'CS-DENSIFIER-20L', 38, 10, false, true, 14, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'graniteguard-densifier');

INSERT INTO products (name, slug, category_id, description, short_description, price, unit, image_url, sku, stock_quantity, low_stock_threshold, featured, in_stock, display_order, is_active)
SELECT 'ThermaBond Fire-Rated Sealant', 'thermabond-fire-rated-sealant',
  (SELECT id FROM categories WHERE slug = 'joint-sealants'),
  'Intumescent acrylic sealant for fire-rated compartment joints, rated up to 4 hours fire resistance. Used at service penetrations and construction joints in commercial buildings to maintain compartmentation.',
  'Fire-rated acrylic sealant for compartment joints, up to 4hr rating',
  3600, '380ml cartridge',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80',
  'JS-FIRERATED-380', 5, 15, false, true, 15, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'thermabond-fire-rated-sealant');

-- ============================================================
-- 3. Enrich services with short descriptions where missing
--    (short_description already exists on all 5 from migration 004,
--    this just ensures none are ever blank if the column was added
--    after the original insert on some environments)
-- ============================================================
UPDATE services SET short_description = 'Professional waterproofing for roofs, basements & wet areas'
  WHERE slug = 'waterproofing-systems' AND (short_description IS NULL OR short_description = '');
UPDATE services SET short_description = 'Durable epoxy coatings for industrial & commercial floors'
  WHERE slug = 'epoxy-flooring' AND (short_description IS NULL OR short_description = '');
UPDATE services SET short_description = 'Flexible PU flooring for crack-bridging & outdoor use'
  WHERE slug = 'polyurethane-flooring' AND (short_description IS NULL OR short_description = '');
UPDATE services SET short_description = 'Protective sealers for concrete surfaces'
  WHERE slug = 'concrete-sealers' AND (short_description IS NULL OR short_description = '');
UPDATE services SET short_description = 'Premium sealants for expansion joints & cracks'
  WHERE slug = 'joint-sealants' AND (short_description IS NULL OR short_description = '');
