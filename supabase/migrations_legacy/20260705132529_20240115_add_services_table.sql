-- Services table for service offerings
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  short_description TEXT,
  image_url TEXT NOT NULL,
  icon TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- RLS policies for services
CREATE POLICY "services_select_policy" ON services FOR SELECT
  TO anon, authenticated USING (is_active = true);

CREATE POLICY "services_insert_policy" ON services FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "services_update_policy" ON services FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "services_delete_policy" ON services FOR DELETE
  TO authenticated USING (true);

-- Insert default services
INSERT INTO services (name, slug, description, short_description, image_url, display_order, is_active) VALUES
('Industrial Flooring', 'industrial-flooring', 'Heavy-duty epoxy and polyurethane flooring systems designed for factories, warehouses, and manufacturing facilities. Our industrial floors withstand heavy machinery, chemical spills, and constant traffic while maintaining their integrity and appearance for years.', 'Heavy-duty epoxy and polyurethane systems for factories and warehouses.', 'https://images.unsplash.com/photo-1504307651674-208930a97d63?auto=format&fit=crop&w=800&q=80', 1, true),
('Waterproofing', 'waterproofing', 'Complete waterproofing solutions for roofs, basements, wet areas, and water tanks. We use premium membranes and coatings from Sika and Mapei to ensure long-lasting protection against water infiltration.', 'Complete waterproofing for roofs, basements, and wet areas.', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80', 2, true),
('Commercial Flooring', 'commercial-flooring', 'Professional flooring solutions for offices, shopping malls, hospitals, and hospitality venues. Our commercial floors combine durability with aesthetics, offering easy maintenance and slip-resistant surfaces.', 'Durable solutions for offices, malls, and hospitals.', 'https://images.unsplash.com/photo-1503387762-592deb587942?auto=format&fit=crop&w=800&q=80', 3, true),
('Residential Solutions', 'residential-solutions', 'Quality flooring and waterproofing services for homes and residential properties. From garage epoxy to bathroom waterproofing, we protect and enhance your living spaces.', 'Quality flooring and waterproofing for homes.', 'https://images.unsplash.com/photo-1615840728552-7073c8c5d6c5?auto=format&fit=crop&w=800&q=80', 4, true);