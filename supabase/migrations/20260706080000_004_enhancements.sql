/*
# Fourth Migration: Feature Enhancements

1. New Tables
- page_visits - Analytics tracking
- service_materials - Service-to-material relationships

2. Extended Tables
- partners: Add description, contact_email, contact_phone, featured, details

3. RLS Updates
*/

-- Page Visits (Analytics)
CREATE TABLE IF NOT EXISTS page_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path text NOT NULL,
  visitor_ip text,
  user_agent text,
  referrer text,
  visit_date date DEFAULT CURRENT_DATE,
  visit_count integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Service-Materials Join
CREATE TABLE IF NOT EXISTS service_materials (
  service_id uuid REFERENCES products(id) ON DELETE CASCADE,
  material_id uuid REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (service_id, material_id)
);

-- Extend partners table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'description') THEN
    ALTER TABLE partners ADD COLUMN description text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'contact_email') THEN
    ALTER TABLE partners ADD COLUMN contact_email text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'contact_phone') THEN
    ALTER TABLE partners ADD COLUMN contact_phone text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'featured') THEN
    ALTER TABLE partners ADD COLUMN featured boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'details') THEN
    ALTER TABLE partners ADD COLUMN details jsonb DEFAULT '{}';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_materials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "public_insert_page_visits" ON page_visits;
CREATE POLICY "public_insert_page_visits" ON page_visits FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_read_page_visits" ON page_visits;
CREATE POLICY "admin_read_page_visits" ON page_visits FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_access_service_materials" ON service_materials;
CREATE POLICY "admin_access_service_materials" ON service_materials FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_page_visits_date ON page_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_page_visits_path ON page_visits(page_path);
CREATE INDEX IF NOT EXISTS idx_service_materials_service ON service_materials(service_id);
CREATE INDEX IF NOT EXISTS idx_service_materials_material ON service_materials(material_id);
