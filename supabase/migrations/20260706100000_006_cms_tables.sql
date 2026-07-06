-- CMS Content table (for about page, etc.)
CREATE TABLE IF NOT EXISTS cms_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page TEXT NOT NULL,
  section TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page, section)
);

-- FAQ items table
CREATE TABLE IF NOT EXISTS faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT '',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE cms_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;

-- Allow public read, only authenticated (admin) write
CREATE POLICY IF NOT EXISTS "Public read access for cms_content"
  ON cms_content FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Admin full access for cms_content"
  ON cms_content FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_settings WHERE setting_key = 'username' AND setting_value = current_user)
  );

CREATE POLICY IF NOT EXISTS "Public read access for faq_items"
  ON faq_items FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Admin full access for faq_items"
  ON faq_items FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_settings WHERE setting_key = 'username' AND setting_value = current_user)
  );

-- Insert default CMS content for about page
INSERT INTO cms_content (page, section, content) VALUES
('about', 'hero', '{"title": "About Topline Flooring & Waterproofing", "subtitle": "Building Trust and Protection, One Surface at a Time"}'),
('about', 'mission', '{"text": "To provide exceptional flooring and waterproofing solutions that protect and enhance properties across Kenya and East Africa.", "vision": "To be the most trusted name in flooring and waterproofing, known for quality, reliability, and innovation."}'),
('about', 'values', '{"items": ["Quality Craftsmanship: Every project meets the highest standards of excellence.", "Customer Focus: Your satisfaction is our top priority.", "Innovation: We use the latest materials and techniques.", "Integrity: Honest, transparent, and reliable service.", "Safety: Rigorous safety standards on every site.", "Sustainability: Environmentally responsible solutions."]}'),
('about', 'stats', '{"years": "10+", "projects": "500+", "clients": "300+", "satisfaction": "98%"}'),
('about', 'team', '{"title": "Our Expert Team", "description": "Our skilled professionals bring years of experience and technical expertise to every project."}')
ON CONFLICT (page, section) DO NOTHING;

-- Insert default FAQ items
INSERT INTO faq_items (question, answer, category, display_order) VALUES
('What types of waterproofing services do you offer?', 'We offer a comprehensive range of waterproofing solutions including APP bituminous membrane, torch-on membranes, liquid-applied polyurethane, basement waterproofing, roof waterproofing, balcony waterproofing, bathroom waterproofing, and water tank waterproofing.', 'Waterproofing', 1),
('How long does epoxy flooring take to cure?', 'Standard epoxy flooring is typically walkable within 12-24 hours and fully cured for heavy traffic within 5-7 days. Light foot traffic can resume after 24 hours. The exact curing time depends on temperature, humidity, and the specific product used.', 'Flooring', 2),
('Do you offer warranties on your services?', 'Yes, we provide comprehensive warranties on all our services. Waterproofing installations typically carry a 5-15 year workmanship warranty depending on the system used. Epoxy flooring comes with a 2-5 year warranty covering delamination and surface defects.', 'General', 3),
('What areas do you serve?', 'We primarily serve Nairobi and its environs, including Kiambu, Machakos, Kajiado, and surrounding counties. For large commercial and industrial projects, we can mobilize anywhere within Kenya and select locations in East Africa.', 'General', 4),
('How do I request a quotation?', 'You can request a quotation by visiting our Quotation page, calling us at 0720 859 737, or sending an email to toplineflooringandwaterproofin@gmail.com. We typically respond within 24 hours with a detailed quote.', 'General', 5),
('Can you work on occupied premises?', 'Yes, we regularly work on occupied commercial and residential premises. We minimize disruption by working in phases, using low-odor materials, and maintaining strict cleanliness protocols. Most projects can be completed without relocating occupants.', 'General', 6),
('What preparation is needed for epoxy flooring?', 'The existing floor must be clean, dry, and free of contaminants. We perform surface preparation including diamond grinding or shot blasting to ensure proper adhesion. Minor cracks and surface imperfections are repaired before application.', 'Flooring', 7),
('How do I maintain my waterproofed surface?', 'Regular inspection of seals, joints, and drainage areas is recommended. Clean with mild detergents and avoid harsh chemicals. For roofs, clear debris from drains regularly. We offer maintenance contracts for ongoing care.', 'Waterproofing', 8)
ON CONFLICT DO NOTHING;
