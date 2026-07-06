/*
# Topline Flooring - Complete Starter Catalogue Seed

1. Enables pgcrypto extension for bcrypt password hashing
2. Inserts owner credentials into admin_settings (bcrypt-hashed password)
3. Adds new categories if they do not already exist
4. Seeds 28 products/services across all categories
*/

-- ============================================================
-- 1. ENABLE pgcrypto (required for crypt/gen_salt)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 2. ADMIN SETTINGS — Owner credentials (idempotent)
-- ============================================================
INSERT INTO admin_settings (setting_key, setting_value)
SELECT 'username', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM admin_settings WHERE setting_key = 'username');

INSERT INTO admin_settings (setting_key, setting_value)
SELECT 'password', crypt('admin123', gen_salt('bf'))
WHERE NOT EXISTS (SELECT 1 FROM admin_settings WHERE setting_key = 'password');

INSERT INTO admin_settings (setting_key, setting_value)
SELECT 'email', 'toplineflooringandwaterproofin@gmail.com'
WHERE NOT EXISTS (SELECT 1 FROM admin_settings WHERE setting_key = 'email');

INSERT INTO admin_settings (setting_key, setting_value)
SELECT 'requires_password_change', 'false'
WHERE NOT EXISTS (SELECT 1 FROM admin_settings WHERE setting_key = 'requires_password_change');

-- ============================================================
-- 3. NEW CATEGORIES (insert only if slug does not exist)
-- ============================================================
INSERT INTO categories (name, slug, description, display_order, is_active)
SELECT 'Concrete Repair & Protection', 'concrete-repair-protection', 'Professional concrete repair, crack injection, and structural protection solutions for commercial and residential applications', 6, true
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'concrete-repair-protection');

INSERT INTO categories (name, slug, description, display_order, is_active)
SELECT 'Floor Hardeners & Sealers', 'floor-hardeners-sealers', 'Industrial floor hardeners, dust-proofing sealers, and surface treatments for concrete floors', 7, true
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'floor-hardeners-sealers');

INSERT INTO categories (name, slug, description, display_order, is_active)
SELECT 'Construction Chemicals', 'construction-chemicals', 'Specialty construction chemicals including bonding agents, curing compounds, and admixtures', 8, true
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'construction-chemicals');

INSERT INTO categories (name, slug, description, display_order, is_active)
SELECT 'Industrial Accessories', 'industrial-accessories', 'Essential accessories for industrial flooring and waterproofing applications', 9, true
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'industrial-accessories');

INSERT INTO categories (name, slug, description, display_order, is_active)
SELECT 'Protective Coatings', 'protective-coatings', 'High-performance protective coatings for industrial and commercial surfaces requiring chemical and abrasion resistance', 10, true
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'protective-coatings');

-- ============================================================
-- 4. WATERPROOFING SERVICES (8)
-- ============================================================

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'APP Bituminous Membrane Waterproofing', 'app-bituminous-membrane-waterproofing',
  (SELECT id FROM categories WHERE slug = 'waterproofing-systems'),
  'Professional installation of APP modified bituminous membrane waterproofing using torch-on application. This proven system provides a seamless, durable waterproof barrier for flat roofs, concrete decks, and below-grade structures. Backed by a comprehensive warranty, it delivers long-term protection against water ingress.',
  1850, 'sqm',
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80'],
  true, true, 1, true, 'service', 'SRV-WP-001', 999, 5,
  'APP Bituminous Membrane Waterproofing Services Kenya | Topline Flooring',
  'Professional APP bituminous membrane waterproofing services in Kenya. Torch-on application for roofs, decks and basements. Durable, seamless protection with warranty.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'app-bituminous-membrane-waterproofing');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'Torch-On Membrane Waterproofing', 'torch-on-membrane-waterproofing',
  (SELECT id FROM categories WHERE slug = 'waterproofing-systems'),
  'High-performance torch-on waterproofing membrane system ideal for flat roofs, terraces, and exposed concrete surfaces. The polymer-modified bitumen membrane is applied with controlled heat to create a permanent, monolithic waterproof layer that withstands extreme weather conditions.',
  2100, 'sqm',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80'],
  false, true, 2, true, 'service', 'SRV-WP-002', 999, 5,
  'Torch-On Membrane Waterproofing Kenya | Topline Flooring',
  'Expert torch-on membrane waterproofing installation across Kenya. Ideal for flat roofs and terraces. Long-lasting polymer-modified bitumen system.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'torch-on-membrane-waterproofing');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'Liquid Applied Polyurethane Waterproofing', 'liquid-applied-pu-waterproofing',
  (SELECT id FROM categories WHERE slug = 'waterproofing-systems'),
  'Cold-applied liquid polyurethane waterproofing system that cures to form a seamless, high-elasticity membrane. Perfect for complex roof geometries, balconies, and areas where torch application is not feasible. UV-resistant and available in multiple colors.',
  2450, 'sqm',
  'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&q=80', 'https://images.unsplash.com/photo-1503387762-592deb587942?w=800&q=80'],
  true, true, 3, true, 'service', 'SRV-WP-003', 999, 5,
  'Liquid Polyurethane Waterproofing Kenya | Topline Flooring',
  'Seamless liquid-applied polyurethane waterproofing services. Ideal for complex roof shapes, balconies and wet areas. UV resistant and flexible.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'liquid-applied-pu-waterproofing');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'Basement Waterproofing', 'basement-waterproofing-system',
  (SELECT id FROM categories WHERE slug = 'waterproofing-systems'),
  'Comprehensive basement waterproofing solution combining positive-side membrane application with internal drainage systems and sump pump installation. Our multi-layer approach addresses both water pressure and moisture vapor to create a dry, usable basement space with a 15-year performance guarantee.',
  3200, 'sqm',
  'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80', 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80'],
  true, true, 4, true, 'service', 'SRV-WP-004', 999, 5,
  'Basement Waterproofing Services Kenya | Topline Flooring',
  'Complete basement waterproofing solutions in Kenya. Internal and external systems with drainage and sump pumps. 15-year workmanship guarantee.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'basement-waterproofing-system');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'Roof Waterproofing', 'roof-waterproofing-service',
  (SELECT id FROM categories WHERE slug = 'waterproofing-systems'),
  'Specialist roof waterproofing service using advanced liquid-applied and sheet membrane systems. We treat all roof types including flat, pitched, and green roofs with reflective coatings that reduce heat absorption and extend roof lifespan by up to 20 years.',
  2800, 'sqm',
  'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', 'https://images.unsplash.com/photo-1504307651674-208930a97d63?w=800&q=80'],
  false, true, 5, true, 'service', 'SRV-WP-005', 999, 5,
  'Roof Waterproofing Services Kenya | Topline Flooring',
  'Professional roof waterproofing for flat, pitched and green roofs. Reflective coatings available. Extends roof life by up to 20 years.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'roof-waterproofing-service');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'Balcony Waterproofing', 'balcony-waterproofing',
  (SELECT id FROM categories WHERE slug = 'waterproofing-systems'),
  'Precision balcony waterproofing service using flexible liquid membranes designed to accommodate structural movement and thermal expansion. Our system includes proper fall creation, drainage integration, and a wear-resistant top coating suitable for tiling or direct foot traffic.',
  2600, 'sqm',
  'https://images.unsplash.com/photo-1504307651674-208930a97d63?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80'],
  false, true, 6, true, 'service', 'SRV-WP-006', 999, 5,
  'Balcony Waterproofing Services Kenya | Topline Flooring',
  'Durable balcony waterproofing with flexible liquid membranes. Designed for structural movement, with drainage integration and wear-resistant finish.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'balcony-waterproofing');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'Bathroom & Wet Area Waterproofing', 'bathroom-wet-area-waterproofing',
  (SELECT id FROM categories WHERE slug = 'waterproofing-systems'),
  'Professional bathroom and wet area waterproofing using cementitious and liquid-applied systems that comply with Kenyan building codes. Our process covers floors, walls, shower bases, and around pipe penetrations with reinforcement at all critical junctions to prevent leaks.',
  2400, 'sqm',
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', 'https://images.unsplash.com/photo-1504307651674-208930a97d63?w=800&q=80'],
  false, true, 7, true, 'service', 'SRV-WP-007', 999, 5,
  'Bathroom Waterproofing Kenya | Topline Flooring',
  'Code-compliant bathroom and wet area waterproofing. Full coverage of floors, walls, showers and pipe penetrations. Leak-proof guarantee.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'bathroom-wet-area-waterproofing');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'Water Tank Waterproofing', 'water-tank-waterproofing',
  (SELECT id FROM categories WHERE slug = 'waterproofing-systems'),
  'Specialized waterproofing for concrete and steel water tanks using potable-water-approved cementitious and epoxy systems. Our lining system is certified safe for drinking water and provides a smooth, non-porous surface that prevents leakage and bacterial growth.',
  3000, 'sqm',
  'https://images.unsplash.com/photo-1615840728552-7073c8c5d6c5?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&q=80', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80'],
  false, true, 8, true, 'service', 'SRV-WP-008', 999, 5,
  'Water Tank Waterproofing Kenya | Topline Flooring',
  'Safe, potable-water-approved tank waterproofing for concrete and steel water tanks. Prevents leakage and bacterial growth. Certified systems.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'water-tank-waterproofing');

-- ============================================================
-- 5. FLOORING SERVICES (7)
-- ============================================================

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'Epoxy Flooring', 'epoxy-flooring',
  (SELECT id FROM categories WHERE slug = 'epoxy-flooring'),
  'High-performance epoxy flooring system designed for commercial and residential spaces. Our multi-coat application includes surface preparation, primer, and a durable top coat that resists chemicals, impacts, and heavy foot traffic. Available in a wide range of colors and finishes.',
  1500, 'sqm',
  'https://images.unsplash.com/photo-1503387762-592deb587942?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=800&q=80'],
  true, true, 9, true, 'service', 'SRV-FL-001', 999, 5,
  'Epoxy Flooring Installation Kenya | Topline Flooring',
  'Professional epoxy flooring installation for commercial and residential spaces. Durable, chemical-resistant, available in multiple colors. Competitive pricing in Kenya.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'epoxy-flooring');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'Industrial Epoxy Flooring', 'industrial-epoxy-flooring',
  (SELECT id FROM categories WHERE slug = 'epoxy-flooring'),
  'Heavy-duty industrial epoxy flooring system engineered for manufacturing plants, warehouses, and high-traffic facilities. Features high compressive strength, chemical resistance, and anti-static properties. Suitable for heavy machinery areas and fork lift traffic.',
  1800, 'sqm',
  'https://images.unsplash.com/photo-1512758017271-d7b84c2113f1?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&q=80', 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=800&q=80'],
  false, true, 10, true, 'service', 'SRV-FL-002', 999, 5,
  'Industrial Epoxy Flooring Kenya | Topline Flooring',
  'Heavy-duty industrial epoxy flooring for factories and warehouses. High compressive strength, chemical resistant, anti-static options available.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'industrial-epoxy-flooring');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'Warehouse Flooring', 'warehouse-flooring',
  (SELECT id FROM categories WHERE slug = 'epoxy-flooring'),
  'Specialized warehouse flooring solution that combines impact resistance with ease of maintenance. Our system includes a high-build epoxy or polyurethane top coat that withstands racking systems, pallet jacks, and continuous fork lift operation while maintaining a dust-free surface.',
  1600, 'sqm',
  'https://images.unsplash.com/photo-1541888946425-d81bbecd0e76?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1512758017271-d7b84c2113f1?w=800&q=80', 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&q=80'],
  false, true, 11, true, 'service', 'SRV-FL-003', 999, 5,
  'Warehouse Flooring Solutions Kenya | Topline Flooring',
  'Durable warehouse flooring designed for heavy racking systems and fork lift traffic. Dust-free, impact-resistant, and easy to maintain.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'warehouse-flooring');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'Garage Epoxy Flooring', 'garage-epoxy-flooring',
  (SELECT id FROM categories WHERE slug = 'epoxy-flooring'),
  'Premium garage epoxy flooring system that transforms ordinary concrete floors into durable, attractive, and easy-to-clean surfaces. Resists hot tire pickup, oil stains, and chemical spills. Available in solid colors, metallic finishes, and decorative flake systems.',
  2000, 'sqm',
  'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=800&q=80', 'https://images.unsplash.com/photo-1618221195710-dd26b1b8f5d8?w=800&q=80'],
  false, true, 12, true, 'service', 'SRV-FL-004', 999, 5,
  'Garage Epoxy Flooring Kenya | Topline Flooring',
  'Transform your garage with durable epoxy flooring. Resists oil stains, hot tire pickup, and chemicals. Custom colors and finishes available.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'garage-epoxy-flooring');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'Hospital Flooring', 'hospital-flooring',
  (SELECT id FROM categories WHERE slug = 'polyurethane-flooring'),
  'Medical-grade polyurethane flooring system designed for healthcare environments. Features seamless installation with coving, antimicrobial properties, and chemical resistance to medical disinfectants. Meets infection control standards while providing a comfortable, slip-resistant surface.',
  2200, 'sqm',
  'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1618221195710-dd26b1b8f5d8?w=800&q=80', 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&q=80'],
  false, true, 13, true, 'service', 'SRV-FL-005', 999, 5,
  'Hospital Flooring Installation Kenya | Topline Flooring',
  'Medical-grade polyurethane flooring for healthcare facilities. Antimicrobial, seamless, chemical-resistant, and infection control compliant.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'hospital-flooring');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'Polyurethane Flooring', 'polyurethane-flooring',
  (SELECT id FROM categories WHERE slug = 'polyurethane-flooring'),
  'Flexible polyurethane flooring system with superior crack-bridging capabilities, ideal for areas subjected to thermal cycling and substrate movement. Offers excellent chemical resistance, UV stability, and a wide range of decorative finishes for commercial and industrial applications.',
  2100, 'sqm',
  'https://images.unsplash.com/photo-1618221195710-dd26b1b8f5d8?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', 'https://images.unsplash.com/photo-1503387762-592deb587942?w=800&q=80'],
  false, true, 14, true, 'service', 'SRV-FL-006', 999, 5,
  'Polyurethane Flooring Kenya | Topline Flooring',
  'Flexible polyurethane flooring with superior crack-bridging. UV stable, chemical resistant, and ideal for thermal cycling environments.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'polyurethane-flooring');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'Decorative Epoxy Flooring', 'decorative-epoxy-flooring',
  (SELECT id FROM categories WHERE slug = 'epoxy-flooring'),
  'Premium decorative epoxy flooring with stunning metallic pigments, colored quartz, and vinyl flake systems. Creates unique, artistic floor surfaces ideal for showrooms, retail spaces, restaurants, and luxury residences. Each installation is custom-designed to achieve the desired aesthetic effect.',
  2800, 'sqm',
  'https://images.unsplash.com/photo-1567954970774-58d2aa411427?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1503387762-592deb587942?w=800&q=80', 'https://images.unsplash.com/photo-1618221195710-dd26b1b8f5d8?w=800&q=80', 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=800&q=80'],
  false, true, 15, true, 'service', 'SRV-FL-007', 999, 5,
  'Decorative Epoxy Flooring Kenya | Topline Flooring',
  'Custom decorative epoxy flooring with metallic, quartz, and flake finishes. Perfect for showrooms, retail, and luxury interiors. Bespoke designs.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'decorative-epoxy-flooring');

-- ============================================================
-- 6. CONCRETE SERVICES (3)
-- ============================================================

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'Concrete Crack Repair', 'concrete-crack-repair',
  (SELECT id FROM categories WHERE slug = 'concrete-repair-protection'),
  'Professional concrete crack repair service using low-pressure injection of polyurethane and epoxy resins. Our method restores structural integrity, stops water ingress, and prevents further crack propagation. Suitable for walls, slabs, beams, and foundations in both residential and commercial structures.',
  1500, 'sqm',
  'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1590642916589-592b501b5fc9?w=800&q=80', 'https://images.unsplash.com/photo-1567954970774-58d2aa411427?w=800&q=80'],
  false, true, 16, true, 'service', 'SRV-CR-001', 999, 5,
  'Concrete Crack Repair Kenya | Topline Flooring',
  'Professional concrete crack repair using epoxy and polyurethane injection. Restores structural integrity and stops water ingress.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'concrete-crack-repair');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'Concrete Surface Hardening', 'concrete-surface-hardening',
  (SELECT id FROM categories WHERE slug = 'concrete-repair-protection'),
  'Industrial concrete surface hardening treatment using lithium silicate and sodium silicate densifiers. This process chemically reacts with free lime in concrete to create a dense, hard, dust-proof surface that resists abrasion and chemical attack. Ideal for warehouses, factories, and parking structures.',
  1200, 'sqm',
  'https://images.unsplash.com/photo-1590642916589-592b501b5fc9?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80', 'https://images.unsplash.com/photo-1582015745019-19e62edf6a8e?w=800&q=80'],
  false, true, 17, true, 'service', 'SRV-CR-002', 999, 5,
  'Concrete Surface Hardening Kenya | Topline Flooring',
  'Lithium silicate concrete hardening treatment for dust-proof, abrasion-resistant industrial floors. Ideal for warehouses and factories.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'concrete-surface-hardening');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'Expansion Joint Installation', 'expansion-joint-installation',
  (SELECT id FROM categories WHERE slug = 'concrete-repair-protection'),
  'Expert installation of expansion and control joints using high-quality preformed compression seals, pour-in-place sealants, and armored joint systems. Proper joint installation accommodates thermal and moisture-related movement while maintaining a smooth, safe, and watertight floor surface.',
  900, 'lm',
  'https://images.unsplash.com/photo-1582015745019-19e62edf6a8e?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1590642916589-592b501b5fc9?w=800&q=80', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80'],
  false, true, 18, true, 'service', 'SRV-CR-003', 999, 5,
  'Expansion Joint Installation Kenya | Topline Flooring',
  'Professional expansion joint installation with compression seals and armored systems. Accommodates thermal movement while maintaining safety.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'expansion-joint-installation');

-- ============================================================
-- 7. MATERIALS (10)
-- ============================================================

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'Epoxy Floor Coating Kit', 'epoxy-floor-coating-kit',
  (SELECT id FROM categories WHERE slug = 'epoxy-flooring'),
  'Complete two-component epoxy floor coating kit including primer, resin, hardener, and mixing instructions. Covers approximately 12-15 sqm per kit. Ideal for DIY garage floors, basements, and small commercial spaces. Available in clear, grey, and light blue.',
  4500, 'kit',
  'https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1582015745019-19e62edf6a8e?w=800&q=80', 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&q=80'],
  true, true, 19, true, 'material', 'MAT-001', 85, 10,
  'Epoxy Floor Coating Kit Kenya | Topline Flooring',
  'Complete DIY epoxy floor coating kit. Covers 12-15 sqm. Includes primer, resin, and hardener. Available in clear, grey and blue.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'epoxy-floor-coating-kit');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'Polyurethane Sealant', 'polyurethane-sealant',
  (SELECT id FROM categories WHERE slug = 'polyurethane-flooring'),
  'High-performance one-component polyurethane sealant for expansion joints, perimeter joints, and crack sealing. Exhibits excellent adhesion to concrete, metal, and wood with movement capability of up to 25%. Paintable and weather-resistant for both interior and exterior use.',
  850, 'cartridge',
  'https://images.unsplash.com/photo-1598375181200-6e1e0e404e9e?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?w=800&q=80', 'https://images.unsplash.com/photo-1582015745019-19e62edf6a8e?w=800&q=80'],
  false, true, 20, true, 'material', 'MAT-002', 200, 20,
  'Polyurethane Sealant Kenya | Topline Flooring',
  'Premium polyurethane sealant for expansion joints. 25% movement capability, excellent adhesion, paintable. Interior and exterior use.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'polyurethane-sealant');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'Concrete Sealer', 'concrete-sealer',
  (SELECT id FROM categories WHERE slug = 'floor-hardeners-sealers'),
  'Deep-penetrating silane-siloxane concrete sealer that provides powerful water repellency while allowing vapor transmission. Protects concrete surfaces from water ingress, chloride ion penetration, freeze-thaw damage, and staining. Suitable for driveways, patios, walls, and industrial floors.',
  3200, 'litre',
  'https://images.unsplash.com/photo-1574481946870-82b1e5e4b9af?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1598375181200-6e1e0e404e9e?w=800&q=80', 'https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?w=800&q=80'],
  false, true, 21, true, 'material', 'MAT-003', 60, 10,
  'Concrete Sealer Kenya | Topline Flooring',
  'Deep-penetrating silane-siloxane concrete sealer. Water-repellent, breathable, protects against chloride ingress and staining.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'concrete-sealer');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'Floor Hardener', 'floor-hardener',
  (SELECT id FROM categories WHERE slug = 'floor-hardeners-sealers'),
  'Industrial-grade dry-shake floor hardener containing silica-free mineral aggregates that create a dense, impact-resistant concrete surface. Applied during the finishing stage, it produces a dust-proof, non-slip floor that withstands heavy traffic, impact, and abrasion in warehouses and factories.',
  2800, '25kg',
  'https://images.unsplash.com/photo-1517245386800-b4dd5d23c0c2?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1574481946870-82b1e5e4b9af?w=800&q=80', 'https://images.unsplash.com/photo-1598375181200-6e1e0e404e9e?w=800&q=80'],
  false, true, 22, true, 'material', 'MAT-004', 45, 10,
  'Floor Hardener Kenya | Topline Flooring',
  'Industrial dry-shake floor hardener for dust-proof, impact-resistant concrete floors. Ideal for warehouses and high-traffic areas.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'floor-hardener');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'Bitumen Primer', 'bitumen-primer',
  (SELECT id FROM categories WHERE slug = 'waterproofing-systems'),
  'Solvent-based bitumen primer formulated for preparing concrete, metal, and wood surfaces prior to application of bituminous waterproofing membranes. Provides excellent adhesion, seals porous substrates, and prevents out-gassing during torch-on membrane installation. Fast-drying formulation.',
  1500, 'litre',
  'https://images.unsplash.com/photo-1600585154340-cd5c60c4c87f?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&q=80', 'https://images.unsplash.com/photo-1504307651674-208930a97d63?w=800&q=80'],
  false, true, 23, true, 'material', 'MAT-005', 120, 15,
  'Bitumen Primer Kenya | Topline Flooring',
  'Fast-drying bitumen primer for membrane preparation. Excellent adhesion on concrete, metal and wood. Prevents out-gassing during installation.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'bitumen-primer');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'Epoxy Primer', 'epoxy-primer',
  (SELECT id FROM categories WHERE slug = 'epoxy-flooring'),
  'Two-component epoxy primer designed for preparing concrete substrates prior to epoxy floor coating application. Penetrates deeply to consolidate loose particles, seal pores, and provide a uniform bonding surface. Low-viscosity formulation ensures excellent substrate wetting and adhesion.',
  3600, 'litre',
  'https://images.unsplash.com/photo-1599797993586-8fc5a2a6b87c?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?w=800&q=80', 'https://images.unsplash.com/photo-1582015745019-19e62edf6a8e?w=800&q=80'],
  false, true, 24, true, 'material', 'MAT-006', 70, 10,
  'Epoxy Primer Kenya | Topline Flooring',
  'High-performance two-component epoxy primer for concrete substrate preparation. Ensures maximum adhesion for epoxy floor coatings.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'epoxy-primer');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'Joint Sealant', 'joint-sealant',
  (SELECT id FROM categories WHERE slug = 'construction-chemicals'),
  'Premium-grade self-leveling polyurethane joint sealant designed for horizontal expansion joints in concrete floors. Features excellent adhesion, high elasticity, and resistance to traffic abrasion. Suitable for industrial, commercial, and residential floor joints subject to foot and vehicular traffic.',
  650, 'cartridge',
  'https://images.unsplash.com/photo-1562667501820-6c4f3e2b7c3d?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1598375181200-6e1e0e404e9e?w=800&q=80', 'https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?w=800&q=80'],
  false, true, 25, true, 'material', 'MAT-007', 180, 20,
  'Joint Sealant Kenya | Topline Flooring',
  'Self-leveling polyurethane joint sealant for expansion joints. Traffic-resistant, high elasticity, excellent adhesion. For industrial and commercial floors.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'joint-sealant');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'Waterproofing Membrane Roll', 'waterproofing-membrane-roll',
  (SELECT id FROM categories WHERE slug = 'waterproofing-systems'),
  'APP-modified bituminous waterproofing membrane roll with reinforced polyester carrier. Provides excellent tensile strength, puncture resistance, and dimensional stability. Suitable for torch-on application on roofs, basements, and below-grade structures. Each roll covers 20 sqm.',
  12000, 'roll',
  'https://images.unsplash.com/photo-1571867472928-57b4586fb874?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80'],
  false, true, 26, true, 'material', 'MAT-008', 35, 5,
  'Waterproofing Membrane Roll Kenya | Topline Flooring',
  'APP-modified bituminous membrane rolls for roof and basement waterproofing. High tensile strength, 20 sqm per roll. Torch-on application.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'waterproofing-membrane-roll');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'Self-Leveling Compound', 'self-leveling-compound',
  (SELECT id FROM categories WHERE slug = 'concrete-repair-protection'),
  'Cement-based self-leveling underlayment compound for smoothing and leveling concrete subfloors prior to floor covering installation. Provides a flat, smooth surface with high compressive strength. Can be applied from 3mm to 30mm thickness in a single pour. Walkable within 2-4 hours.',
  1800, '25kg',
  'https://images.unsplash.com/photo-1564420003065-97d18baf4ef4?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80', 'https://images.unsplash.com/photo-1590642916589-592b501b5fc9?w=800&q=80'],
  false, true, 27, true, 'material', 'MAT-009', 55, 10,
  'Self-Leveling Compound Kenya | Topline Flooring',
  'Cement-based self-leveling underlayment for smooth subfloors. 3-30mm thickness, high compressive strength, walkable in 2-4 hours.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'self-leveling-compound');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, gallery_urls, featured, in_stock, display_order, is_active, product_type, sku, stock_quantity, low_stock_threshold, meta_title, meta_description)
SELECT
  'Industrial Floor Paint', 'industrial-floor-paint',
  (SELECT id FROM categories WHERE slug = 'protective-coatings'),
  'High-build solvent-based polyurethane floor paint formulated for industrial and commercial concrete floors. Provides a tough, gloss finish that resists chemicals, abrasion, and heavy traffic. Suitable for workshops, showrooms, warehouses, and parking areas. Available in safety and decorative colors.',
  4200, '5ltr',
  'https://images.unsplash.com/photo-1580586152099-8c8a9f11aed6?w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&q=80', 'https://images.unsplash.com/photo-1517245386800-b4dd5d23c0c2?w=800&q=80'],
  false, true, 28, true, 'material', 'MAT-010', 40, 10,
  'Industrial Floor Paint Kenya | Topline Flooring',
  'High-build polyurethane floor paint for industrial concrete floors. Chemical and abrasion resistant. Available in safety and decorative colors.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'industrial-floor-paint');
