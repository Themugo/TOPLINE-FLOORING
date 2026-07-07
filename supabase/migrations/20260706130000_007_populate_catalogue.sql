-- Populate products and services with real Topline Flooring & Waterproofing catalogue

-- Insert Categories
INSERT INTO categories (name, slug, description, display_order) VALUES
('Waterproofing Services', 'waterproofing-services', 'Professional waterproofing solutions for roofs, basements, balconies, and water tanks', 1),
('Epoxy Flooring', 'epoxy-flooring', 'Industrial and commercial epoxy flooring systems', 2),
('Flooring Materials', 'flooring-materials', 'High-quality flooring materials for various applications', 3),
('Accessories', 'accessories', 'Installation accessories and complementary products', 4)
ON CONFLICT (slug) DO NOTHING;

-- Insert Brands
INSERT INTO product_brands (name, slug, logo_url, website_url, description, is_active, display_order) VALUES
('Sika', 'sika', NULL, 'https://www.sika.com', 'Leading manufacturer of construction chemicals', true, 1),
('Fosroc', 'fosroc', NULL, 'https://www.fosroc.com', 'Specialist construction chemicals', true, 2),
('BASF', 'basf', NULL, 'https://www.basf.com', 'Chemical company with construction solutions', true, 3),
('Mapei', 'mapei', NULL, 'https://www.mapei.com', 'Construction materials and adhesives', true, 4)
ON CONFLICT (slug) DO NOTHING;

-- Insert Services (Waterproofing)
INSERT INTO products (name, slug, description, price, unit, product_type, category_id, in_stock, featured, sku, stock_quantity, low_stock_threshold, meta_title, meta_description, display_order, is_active) VALUES
('APP Bituminous Membrane Waterproofing', 'app-bituminous-membrane-waterproofing', 'Atactic Polypropylene (APP) modified bitumen membrane for roof waterproofing. Provides excellent UV resistance and durability for flat and sloped roofs.', 1500, 'per sqm', 'service', (SELECT id FROM categories WHERE slug = 'waterproofing-services'), true, true, 'SRV-APP-001', 999, 10, 'APP Bituminous Membrane Waterproofing Services Kenya', 'Professional APP bituminous membrane waterproofing for roofs in Kenya. Durable UV-resistant solution.', 1, true),

('Torch-On Membrane Waterproofing', 'torch-on-membrane-waterproofing', 'Torch-applied bituminous membrane for superior waterproofing. Ideal for roofs, foundations, and retaining walls with excellent adhesion properties.', 1800, 'per sqm', 'service', (SELECT id FROM categories WHERE slug = 'waterproofing-services'), true, true, 'SRV-TORCH-001', 999, 10, 'Torch-On Membrane Waterproofing Kenya', 'Professional torch-on membrane waterproofing services. Superior adhesion for roofs and foundations.', 2, true),

('Polyurethane Liquid Waterproofing', 'polyurethane-liquid-waterproofing', 'Liquid-applied polyurethane waterproofing system. Seamless, flexible, and resistant to UV and weathering. Perfect for complex roof shapes.', 2200, 'per sqm', 'service', (SELECT id FROM categories WHERE slug = 'waterproofing-services'), true, true, 'SRV-PU-001', 999, 10, 'Polyurethane Liquid Waterproofing Kenya', 'Liquid PU waterproofing for seamless protection. Ideal for complex roof designs.', 3, true),

('Basement Waterproofing', 'basement-waterproofing', 'Comprehensive basement waterproofing using crystalline coatings and drainage systems. Prevents water ingress and protects structural integrity.', 2500, 'per sqm', 'service', (SELECT id FROM categories WHERE slug = 'waterproofing-services'), true, false, 'SRV-BSMT-001', 999, 10, 'Basement Waterproofing Services Kenya', 'Professional basement waterproofing with crystalline coatings and drainage systems.', 4, true),

('Balcony Waterproofing', 'balcony-waterproofing', 'Specialized waterproofing for balconies and terraces. Includes drainage solutions and slip-resistant finishes for safe outdoor spaces.', 2000, 'per sqm', 'service', (SELECT id FROM categories WHERE slug = 'waterproofing-services'), true, false, 'SRV-BALC-001', 999, 10, 'Balcony Waterproofing Kenya', 'Balcony and terrace waterproofing with drainage and slip-resistant finishes.', 5, true),

('Bathroom Waterproofing', 'bathroom-waterproofing', 'Complete bathroom waterproofing for wet areas. Prevents leaks and protects adjacent rooms from water damage.', 1800, 'per sqm', 'service', (SELECT id FROM categories WHERE slug = 'waterproofing-services'), true, false, 'SRV-BATH-001', 999, 10, 'Bathroom Waterproofing Kenya', 'Professional bathroom waterproofing to prevent leaks and water damage.', 6, true),

('Water Tank Waterproofing', 'water-tank-waterproofing', 'Food-grade waterproofing for water storage tanks. Safe for potable water and resistant to bacterial growth.', 1600, 'per sqm', 'service', (SELECT id FROM categories WHERE slug = 'waterproofing-services'), true, false, 'SRV-TANK-001', 999, 10, 'Water Tank Waterproofing Kenya', 'Food-grade water tank waterproofing safe for potable water storage.', 7, true),

('Roof Repair and Maintenance', 'roof-repair-maintenance', 'Professional roof inspection, repair, and maintenance services. Extends roof life and prevents costly damage.', 500, 'per visit', 'service', (SELECT id FROM categories WHERE slug = 'waterproofing-services'), true, false, 'SRV-ROOF-001', 999, 10, 'Roof Repair Services Kenya', 'Professional roof repair and maintenance services in Kenya.', 8, true)
ON CONFLICT (slug) DO NOTHING;

-- Insert Materials (Epoxy Flooring)
INSERT INTO products (name, slug, description, price, unit, product_type, category_id, in_stock, featured, sku, stock_quantity, low_stock_threshold, meta_title, meta_description, display_order, is_active) VALUES
('Self-Leveling Epoxy Flooring', 'self-leveling-epoxy-flooring', 'Self-leveling epoxy floor coating for seamless, high-gloss finish. Ideal for garages, warehouses, and industrial facilities.', 3500, 'per sqm', 'material', (SELECT id FROM categories WHERE slug = 'epoxy-flooring'), true, true, 'MAT-EPOXY-001', 500, 50, 'Self-Leveling Epoxy Flooring Kenya', 'High-quality self-leveling epoxy flooring for seamless finish. Durable and chemical resistant.', 1, true),

('Anti-Static Epoxy Flooring', 'anti-static-epoxy-flooring', 'Conductive epoxy flooring for electronics manufacturing and sensitive environments. Dissipates static electricity safely.', 4500, 'per sqm', 'material', (SELECT id FROM categories WHERE slug = 'epoxy-flooring'), true, false, 'MAT-EPOXY-002', 300, 30, 'Anti-Static Epoxy Flooring Kenya', 'Conductive epoxy flooring for static-sensitive environments.', 2, true),

('Epoxy Mortar Flooring', 'epoxy-mortar-flooring', 'Heavy-duty epoxy mortar for high-traffic industrial areas. Exceptional impact and chemical resistance.', 4000, 'per sqm', 'material', (SELECT id FROM categories WHERE slug = 'epoxy-flooring'), true, false, 'MAT-EPOXY-003', 400, 40, 'Epoxy Mortar Flooring Kenya', 'Heavy-duty epoxy mortar for industrial high-traffic areas.', 3, true),

('Epoxy Primer', 'epoxy-primer', 'High-performance epoxy primer for concrete surface preparation. Ensures optimal adhesion of epoxy coatings.', 800, 'per liter', 'material', (SELECT id FROM categories WHERE slug = 'epoxy-flooring'), true, false, 'MAT-EPOXY-004', 200, 50, 'Epoxy Primer Kenya', 'Epoxy primer for concrete surface preparation and adhesion.', 4, true),

('Epoxy Topcoat', 'epoxy-topcoat', 'UV-resistant epoxy topcoat for enhanced durability and color retention. Available in various colors.', 1200, 'per liter', 'material', (SELECT id FROM categories WHERE slug = 'epoxy-flooring'), true, false, 'MAT-EPOXY-005', 150, 30, 'Epoxy Topcoat Kenya', 'UV-resistant epoxy topcoat for durability and color retention.', 5, true)
ON CONFLICT (slug) DO NOTHING;

-- Insert Materials (Flooring Materials)
INSERT INTO products (name, slug, description, price, unit, product_type, category_id, in_stock, featured, sku, stock_quantity, low_stock_threshold, meta_title, meta_description, display_order, is_active) VALUES
('Interlocking PVC Floor Tiles', 'interlocking-pvc-floor-tiles', 'Heavy-duty interlocking PVC tiles for garages and workshops. Easy installation and maintenance.', 2500, 'per sqm', 'material', (SELECT id FROM categories WHERE slug = 'flooring-materials'), true, true, 'MAT-PVC-001', 1000, 100, 'Interlocking PVC Floor Tiles Kenya', 'Durable interlocking PVC tiles for garages and workshops.', 1, true),

('Rubber Flooring Rolls', 'rubber-flooring-rolls', 'Commercial-grade rubber flooring rolls for gyms and play areas. Shock-absorbing and slip-resistant.', 3000, 'per sqm', 'material', (SELECT id FROM categories WHERE slug = 'flooring-materials'), true, false, 'MAT-RUB-001', 500, 50, 'Rubber Flooring Rolls Kenya', 'Commercial rubber flooring for gyms and play areas.', 2, true),

('Carpet Tiles', 'carpet-tiles', 'Modular carpet tiles for office and commercial spaces. Easy to replace and maintain.', 1800, 'per sqm', 'material', (SELECT id FROM categories WHERE slug = 'flooring-materials'), true, false, 'MAT-CARPET-001', 800, 80, 'Carpet Tiles Kenya', 'Modular carpet tiles for office and commercial spaces.', 3, true),

('Vinyl Plank Flooring', 'vinyl-plank-flooring', 'Luxury vinyl plank flooring with realistic wood appearance. Water-resistant and durable.', 2200, 'per sqm', 'material', (SELECT id FROM categories WHERE slug = 'flooring-materials'), true, false, 'MAT-VINYL-001', 600, 60, 'Vinyl Plank Flooring Kenya', 'Luxury vinyl plank flooring with realistic wood appearance.', 4, true),

('Ceramic Floor Tiles', 'ceramic-floor-tiles', 'High-quality ceramic floor tiles for residential and commercial use. Various sizes and designs available.', 1500, 'per sqm', 'material', (SELECT id FROM categories WHERE slug = 'flooring-materials'), true, false, 'MAT-CERAMIC-001', 2000, 200, 'Ceramic Floor Tiles Kenya', 'High-quality ceramic floor tiles in various sizes and designs.', 5, true)
ON CONFLICT (slug) DO NOTHING;

-- Insert Materials (Accessories)
INSERT INTO products (name, slug, description, price, unit, product_type, category_id, in_stock, featured, sku, stock_quantity, low_stock_threshold, meta_title, meta_description, display_order, is_active) VALUES
('Waterproofing Tape', 'waterproofing-tape', 'Self-adhesive waterproofing tape for joints and seams. UV resistant and durable.', 150, 'per roll', 'material', (SELECT id FROM categories WHERE slug = 'accessories'), true, false, 'MAT-ACC-001', 500, 50, 'Waterproofing Tape Kenya', 'Self-adhesive waterproofing tape for joints and seams.', 1, true),

('Roof Flashing', 'roof-flashing', 'Metal roof flashing for waterproofing roof penetrations and edges. Galvanized steel construction.', 500, 'per meter', 'material', (SELECT id FROM categories WHERE slug = 'accessories'), true, false, 'MAT-ACC-002', 300, 30, 'Roof Flashing Kenya', 'Metal roof flashing for waterproofing roof penetrations.', 2, true),

('Drainage Membrane', 'drainage-membrane', 'Plastic drainage membrane for foundation waterproofing. Allows water to flow away from structure.', 400, 'per sqm', 'material', (SELECT id FROM categories WHERE slug = 'accessories'), true, false, 'MAT-ACC-003', 400, 40, 'Drainage Membrane Kenya', 'Plastic drainage membrane for foundation waterproofing.', 3, true),

('Expansion Joint Sealant', 'expansion-joint-sealant', 'Flexible sealant for expansion joints in concrete. Accommodates movement while maintaining seal.', 800, 'per liter', 'material', (SELECT id FROM categories WHERE slug = 'accessories'), true, false, 'MAT-ACC-004', 200, 20, 'Expansion Joint Sealant Kenya', 'Flexible sealant for concrete expansion joints.', 4, true)
ON CONFLICT (slug) DO NOTHING;
