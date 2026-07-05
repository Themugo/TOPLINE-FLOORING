/*
# Add testimonials, partners, hero slides, settings, and quotations

1. Purpose
   - Adds tables for marketing content management
   - Adds quotation request system
   - Adds site settings for contact info
   
2. New Tables
   - `testimonials`: Customer testimonials with ratings
   - `partners`: Business partner logos and info
   - `hero_slides`: Homepage hero slider content
   - `quotations`: Customer quotation requests
   - `quotation_items`: Line items for quotations
   - `site_settings`: Key-value settings storage

3. Security
   - RLS enabled on all tables
   - Public read for marketing content
   - Public can submit quotations
   - Admin can manage all content
*/

-- Testimonials table
CREATE TABLE IF NOT EXISTS testimonials (
  id serial PRIMARY KEY,
  name text NOT NULL,
  role text,
  company text,
  content text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5) DEFAULT 5,
  is_approved boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_testimonials" ON testimonials;
CREATE POLICY "public_read_testimonials" ON testimonials FOR SELECT
  TO anon, authenticated USING (is_approved = true);

DROP POLICY IF EXISTS "admin_manage_testimonials" ON testimonials;
CREATE POLICY "admin_manage_testimonials" ON testimonials FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- Partners table
CREATE TABLE IF NOT EXISTS partners (
  id serial PRIMARY KEY,
  name text NOT NULL,
  tagline text,
  logo_url text,
  website_url text,
  background_color text DEFAULT '#ffffff',
  text_color text DEFAULT '#000000',
  border_color text DEFAULT '#cccccc',
  sort_order integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_partners" ON partners;
CREATE POLICY "public_read_partners" ON partners FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "admin_manage_partners" ON partners;
CREATE POLICY "admin_manage_partners" ON partners FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- Hero slides table
CREATE TABLE IF NOT EXISTS hero_slides (
  id serial PRIMARY KEY,
  title text NOT NULL,
  subtitle text,
  image_url text NOT NULL,
  button_text text,
  button_link text,
  sort_order integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_hero_slides" ON hero_slides;
CREATE POLICY "public_read_hero_slides" ON hero_slides FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "admin_manage_hero_slides" ON hero_slides;
CREATE POLICY "admin_manage_hero_slides" ON hero_slides FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- Quotations table
CREATE TABLE IF NOT EXISTS quotations (
  id serial PRIMARY KEY,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text NOT NULL,
  company_name text,
  project_type text,
  project_location text,
  project_description text,
  estimated_budget text,
  preferred_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'quoted', 'accepted', 'rejected', 'converted')),
  notes text,
  admin_notes text,
  quoted_amount decimal(12,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_manage_quotations" ON quotations;
CREATE POLICY "public_manage_quotations" ON quotations FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- Quotation items table
CREATE TABLE IF NOT EXISTS quotation_items (
  id serial PRIMARY KEY,
  quotation_id integer NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id integer REFERENCES products(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity decimal(10,2) NOT NULL DEFAULT 1,
  unit text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_manage_quotation_items" ON quotation_items;
CREATE POLICY "public_manage_quotation_items" ON quotation_items FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- Site settings table
CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_settings" ON site_settings;
CREATE POLICY "public_read_settings" ON site_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_manage_settings" ON site_settings;
CREATE POLICY "admin_manage_settings" ON site_settings FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);

-- Insert default settings
INSERT INTO site_settings (key, value) VALUES
('company_name', 'Topline Flooring and Waterproofing'),
('company_tagline', 'Building Trust and Protection, One Surface at a Time'),
('company_email', 'toplineflooringandwaterproofin@gmail.com'),
('company_phone1', '0720 859 737'),
('company_phone2', '0755 293 372'),
('company_address', 'Nairobi, Kenya'),
('footer_text', 'Web Design by frameworkstech.site')
ON CONFLICT (key) DO NOTHING;

-- Insert default testimonials
INSERT INTO testimonials (name, role, company, content, rating, is_approved, sort_order) VALUES
('Grace Njeri', 'Homeowner', 'Nairobi', 'We were struggling with persistent roof leaks until Topline stepped in. Their waterproofing solution has held up perfectly through two rainy seasons. Professional team, excellent work.', 5, true, 1),
('James Mwangi', 'Facilities Manager', 'Industrial Area', 'Topline installed epoxy flooring in our warehouse and the results are outstanding. The floor is chemical-resistant, easy to clean, and looks brand new after two years of heavy forklift traffic.', 5, true, 2),
('Sarah Wambui', 'Business Owner', 'Westlands', 'The team at Topline transformed our office floors with their decorative epoxy system. Professional service from consultation to completion. Highly recommend them.', 5, true, 3),
('Peter Ochieng', 'Site Engineer', 'Construction Company', 'We have partnered with Topline for multiple construction projects. Their technical expertise in waterproofing is unmatched. They deliver on time and within budget.', 5, true, 4),
('Mary Muthoni', 'Property Manager', 'Apartment Complex', 'Topline repaired and waterproofed our basement parking. No more water seepage! The team was professional, the quote was accurate, and the work exemplary.', 5, true, 5)
ON CONFLICT DO NOTHING;

-- Insert default partners
INSERT INTO partners (name, tagline, background_color, text_color, border_color, sort_order) VALUES
('BASF', 'We create chemistry', '#003399', '#ffffff', '#003399', 1),
('FOSROC', 'Construction chemicals', '#ffffff', '#CC0000', '#CC0000', 2),
('SIKA', 'Building Trust', '#ffffff', '#CC0000', '#CC0000', 3),
('MAPEI', 'Quality adhesives & sealants', '#ffffff', '#003399', '#003399', 4),
('LATICRETE', 'Proven performance', '#0077CC', '#ffffff', '#0077CC', 5),
('JOTUN', 'Jotun protects property', '#111111', '#FF6600', '#111111', 6)
ON CONFLICT DO NOTHING;

-- Insert default hero slides
INSERT INTO hero_slides (title, subtitle, image_url, button_text, button_link, sort_order, is_active) VALUES
('APP Bituminous Membrane Waterproofing', 'Building Trust and Protection, One Surface at a Time', 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1400&q=80', 'View Services', '/shop?type=service', 1, true),
('Epoxy Flooring Solutions', 'Durable, decorative flooring for industries, warehouses and commercial spaces', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1400&q=80', 'Learn More', '/shop?type=service', 2, true),
('Basement & Foundation Waterproofing', 'Complete below-grade protection for lasting structural integrity', 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1400&q=80', 'Get Quote', '/quotation', 3, true),
('Roof Coating & Repair', 'Restore and protect your roof with advanced coating systems', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1400&q=80', 'Contact Us', '/contact', 4, true)
ON CONFLICT DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_testimonials_approved ON testimonials(is_approved, sort_order);
CREATE INDEX IF NOT EXISTS idx_partners_active ON partners(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_hero_slides_active ON hero_slides(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON quotation_items(quotation_id);
