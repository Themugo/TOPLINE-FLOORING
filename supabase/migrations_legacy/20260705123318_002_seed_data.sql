/*
# Topline Flooring - Seed Data

1. Categories
- Waterproofing Systems
- Epoxy Flooring
- Polyurethane Flooring
- Concrete Sealers
- Joint Sealants

2. Hero Slides
- Three hero carousel slides for homepage

3. Testimonials
- Sample customer testimonials

4. Partners
- Partner/brand logos

5. Products
- Sample flooring and waterproofing products

6. Admin settings
- Contact information and site settings
*/

-- Insert categories
INSERT INTO categories (name, slug, description, display_order, is_active) VALUES
  ('Waterproofing Systems', 'waterproofing-systems', 'Professional waterproofing solutions for roofs, basements, and wet areas', 1, true),
  ('Epoxy Flooring', 'epoxy-flooring', 'Durable epoxy coating systems for industrial and commercial floors', 2, true),
  ('Polyurethane Flooring', 'polyurethane-flooring', 'Flexible polyurethane flooring for heavy-duty applications', 3, true),
  ('Concrete Sealers', 'concrete-sealers', 'Protective sealers for concrete surfaces', 4, true),
  ('Joint Sealants', 'joint-sealants', 'High-quality sealants for expansion joints and cracks', 5, true)
ON CONFLICT (slug) DO NOTHING;

-- Insert hero slides
INSERT INTO hero_slides (title, subtitle, description, image_url, button_text, button_link, display_order, is_active) VALUES
  ('Professional Flooring Solutions', 'Quality That Lasts', 'Transform your spaces with industry-leading flooring and waterproofing solutions. Trusted by businesses across East Africa.', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1920&q=80', 'Get a Quote', '/quotation', 1, true),
  ('Waterproofing Experts', 'Protect Your Investment', 'Keep your structures protected with our advanced waterproofing systems. Over 10 years of proven results.', 'https://images.unsplash.com/photo-1504307651674-208930a97d63?auto=format&fit=crop&w=1920&q=80', 'Our Services', '/services', 2, true),
  ('Premium Materials Shop', 'Direct to Your Site', 'Shop quality flooring and waterproofing materials. Delivered anywhere in Kenya.', 'https://images.unsplash.com/photo-1615840728552-7073c8c5d6c5?auto=format&fit=crop&w=1920&q=80', 'Shop Now', '/shop', 3, true)
ON CONFLICT DO NOTHING;

-- Insert testimonials
INSERT INTO testimonials (name, role, company, content, rating, display_order, is_active) VALUES
  ('John Mwangi', 'Project Manager', 'Nairobi Construction Ltd', 'Topline delivered exceptional waterproofing for our commercial building. Their team was professional and the results speak for themselves - zero water issues after two rainy seasons.', 5, 1, true),
  ('Sarah Wanjiku', 'Facility Manager', 'Westlands Mall', 'The epoxy flooring they installed in our parking basement has held up beautifully under heavy traffic. Excellent workmanship and competitive pricing.', 5, 2, true),
  ('Peter Ochieng', 'Homeowner', null, 'They waterproofed my basement and the transformation is incredible. No more dampness or musty smells. Highly recommend their services!', 5, 3, true),
  ('Grace Njeri', 'Operations Director', 'Mombasa Hotels Group', 'We have used Topline for multiple hotel renovation projects. Their attention to detail and quality materials make them our go-to flooring partner.', 5, 4, true)
ON CONFLICT DO NOTHING;

-- Insert partners
INSERT INTO partners (name, logo_url, website_url, display_order, is_active) VALUES
  ('Sika Kenya', 'https://www.sika.com/content/sika-group/themes/sika_theme/images/logo.svg', 'https://www.sika.com', 1, true),
  ('Mapei', 'https://www.mapei.com/themes/custom/mapei_theme/logo.svg', 'https://www.mapei.com', 2, true),
  ('BASF', 'https://www.basf.com/favicon.ico', 'https://www.basf.com', 3, true),
  ('Ardex', 'https://www.ardex.com/favicon.ico', 'https://www.ardex.com', 4, true)
ON CONFLICT DO NOTHING;

-- Insert featured products
INSERT INTO products (name, slug, category_id, description, price, unit, image_url, featured, in_stock, display_order, is_active) 
SELECT 'Sika TopSeal-107', 'sika-topseal-107', (SELECT id FROM categories WHERE slug = 'waterproofing-systems'), 'Two-component polymer-modified cementitious waterproofing slurry for concrete and masonry. Ideal for bathrooms, kitchens, and water tanks.', 4500, '25kg bucket', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80', true, true, 1, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'sika-topseal-107');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, featured, in_stock, display_order, is_active)
SELECT 'EpoxyCoat Industrial Floor', 'epoxycoat-industrial', (SELECT id FROM categories WHERE slug = 'epoxy-flooring'), 'High-build epoxy floor coating system for industrial and commercial applications. Chemical resistant and easy to clean.', 8500, 'sqm', 'https://images.unsplash.com/photo-1504307651674-208930a97d63?auto=format&fit=crop&w=800&q=80', true, true, 2, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'epoxycoat-industrial');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, featured, in_stock, display_order, is_active)
SELECT 'PolyFlex PU Flooring', 'polyflex-pu-flooring', (SELECT id FROM categories WHERE slug = 'polyurethane-flooring'), 'Flexible polyurethane flooring system for areas requiring crack-bridging properties. UV stable and weather resistant.', 9800, 'sqm', 'https://images.unsplash.com/photo-1503387762-592deb587942?auto=format&fit=crop&w=800&q=80', true, true, 3, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'polyflex-pu-flooring');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, featured, in_stock, display_order, is_active)
SELECT 'ConcreteSeal Pro', 'concreteseal-pro', (SELECT id FROM categories WHERE slug = 'concrete-sealers'), 'Deep-penetrating silane/siloxane sealer for concrete protection. Water repellent while allowing vapor transmission.', 3200, '20L bucket', 'https://images.unsplash.com/photo-1615840728552-7073c8c5d6c5?auto=format&fit=crop&w=800&q=80', true, true, 4, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'concreteseal-pro');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, featured, in_stock, display_order, is_active)
SELECT 'FlexJoint Sealant', 'flexjoint-sealant', (SELECT id FROM categories WHERE slug = 'joint-sealants'), 'One-component polyurethane sealant for expansion joints. Excellent movement capability and weather resistance.', 2800, '600ml cartridge', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80', true, true, 5, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'flexjoint-sealant');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, featured, in_stock, display_order, is_active)
SELECT 'Sika Bituseal T-140', 'sika-bituseal-t140', (SELECT id FROM categories WHERE slug = 'waterproofing-systems'), 'Self-adhesive bituminous membrane for below-ground waterproofing. Perfect for foundations and basements.', 12000, 'roll (1m x 20m)', 'https://images.unsplash.com/photo-1504307651674-208930a97d63?auto=format&fit=crop&w=800&q=80', false, true, 6, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'sika-bituseal-t140');

INSERT INTO products (name, slug, category_id, description, price, unit, image_url, featured, in_stock, display_order, is_active)
SELECT 'Metallic Epoxy System', 'metallic-epoxy-system', (SELECT id FROM categories WHERE slug = 'epoxy-flooring'), 'Decorative metallic epoxy system for stunning showroom and retail floors. Creates unique pearlescent effects.', 15000, 'sqm', 'https://images.unsplash.com/photo-1503387762-592deb587942?auto=format&fit=crop&w=800&q=80', false, true, 7, true
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'metallic-epoxy-system');

-- Admin settings
INSERT INTO admin_settings (setting_key, setting_value) VALUES
  ('site_name', 'Topline Flooring & Waterproofing'),
  ('site_tagline', 'Professional flooring and waterproofing solutions'),
  ('contact_email', 'info@toplineflooring.co.ke'),
  ('contact_phone', '+254 700 123 456'),
  ('contact_address', 'Industrial Area, Nairobi, Kenya'),
  ('business_hours', 'Mon-Fri: 8AM-5PM, Sat: 9AM-1PM')
ON CONFLICT (setting_key) DO NOTHING;
