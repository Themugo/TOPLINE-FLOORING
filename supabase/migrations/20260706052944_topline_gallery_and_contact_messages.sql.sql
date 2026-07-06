/*
# Topline — Project Gallery & Contact Messages

## Purpose
Adds two new tables to the Topline Flooring & Waterproofing storefront:
1. `project_gallery` — showcase of completed projects (social proof), displayed
   on the homepage. Public read; admin-managed.
2. `contact_messages` — quote requests / general enquiries submitted by visitors
   via the homepage contact form. Public write (anyone can submit); reads are
   restricted to authenticated users (admin) to protect customer PII, since this
   is a no-auth public storefront with no sign-in screen and the frontend never
   reads these rows.

## New Tables
1. `project_gallery`
   - `id` uuid PK
   - `title` text — project title (e.g. "Epoxy Warehouse Floor — Industrial Area")
   - `category` text — service category label (e.g. "Epoxy Flooring")
   - `location` text — project location (e.g. "Nairobi, Kenya")
   - `image_url` text — stock photo URL
   - `sort_order` int — display ordering
   - `created_at` timestamptz
2. `contact_messages`
   - `id` uuid PK
   - `name` text — visitor name
   - `email` text — visitor email
   - `phone` text — visitor phone
   - `service_interest` text — which service they're asking about (optional)
   - `message` text — the enquiry text
   - `status` text — new / read / responded (default 'new')
   - `created_at` timestamptz

## Security (RLS)
- `project_gallery`: public SELECT (anon+authenticated, intentionally shared
  content). Admin INSERT/UPDATE/DELETE via anon+authenticated — matches the
  existing categories/products pattern for this no-auth storefront.
- `contact_messages`: public INSERT (anon+authenticated, visitors submit
  enquiries without signing in). SELECT/UPDATE/DELETE restricted to
  `authenticated` only — this protects visitor PII (names, phones, emails) from
  anonymous reads. The frontend only inserts, never selects, so this does not
  break any feature; messages are read by the business owner via the
  authenticated admin role / service role.

## Seed Data
- 8 project_gallery rows showcasing Topline's services across locations in Kenya,
  using Pexels stock photography relevant to flooring/waterproofing work.
*/

-- ============================================================
-- PROJECT GALLERY
-- ============================================================
CREATE TABLE IF NOT EXISTS project_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  location text,
  image_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE project_gallery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_gallery" ON project_gallery;
CREATE POLICY "anon_select_gallery" ON project_gallery FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_gallery" ON project_gallery;
CREATE POLICY "anon_insert_gallery" ON project_gallery FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_gallery" ON project_gallery;
CREATE POLICY "anon_update_gallery" ON project_gallery FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_gallery" ON project_gallery;
CREATE POLICY "anon_delete_gallery" ON project_gallery FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_gallery_sort_order ON project_gallery(sort_order);

-- ============================================================
-- CONTACT MESSAGES (quote requests / enquiries)
-- ============================================================
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  service_interest text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','read','responded')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Anyone (anon) can submit an enquiry — no sign-in required.
DROP POLICY IF EXISTS "anon_insert_contact_messages" ON contact_messages;
CREATE POLICY "anon_insert_contact_messages" ON contact_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Reads/updates/deletes are admin-only (authenticated) to protect visitor PII.
-- The public storefront never SELECTs this table; only the admin does.
DROP POLICY IF EXISTS "auth_select_contact_messages" ON contact_messages;
CREATE POLICY "auth_select_contact_messages" ON contact_messages FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_update_contact_messages" ON contact_messages;
CREATE POLICY "auth_update_contact_messages" ON contact_messages FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_contact_messages" ON contact_messages;
CREATE POLICY "auth_delete_contact_messages" ON contact_messages FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);

-- ============================================================
-- SEED: PROJECT GALLERY
-- ============================================================
INSERT INTO project_gallery (title, category, location, image_url, sort_order) VALUES
('Epoxy Warehouse Floor', 'Epoxy Flooring', 'Industrial Area, Nairobi', 'https://images.pexels.com/photos/2599391/pexels-photo-2599391.jpeg', 1),
('Flat-Roof Membrane Waterproofing', 'Waterproofing', 'Westlands, Nairobi', 'https://images.pexels.com/photos/4786061/pexels-photo-4786061.jpeg', 2),
('Reflective Roof Coating', 'Roof Coating', 'Karen, Nairobi', 'https://images.pexels.com/photos/1393054/pexels-photo-1393054.jpeg', 3),
('Concrete Crack Repair', 'Concrete Repair', 'Thika Road, Nairobi', 'https://images.pexels.com/photos/544220/pexels-photo-544220.jpeg', 4),
('Balcony Waterproofing', 'Waterproofing', 'Kilimani, Nairobi', 'https://images.pexels.com/photos/2090650/pexels-photo-2090650.jpeg', 5),
('Garage Epoxy Flooring', 'Epoxy Flooring', 'Lavington, Nairobi', 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg', 6),
('Structural Concrete Rehabilitation', 'Concrete Repair', 'Mombasa Port', 'https://images.pexels.com/photos/834892/pexels-photo-834892.jpeg', 7),
('Basement Tank Waterproofing', 'Waterproofing', 'Upper Hill, Nairobi', 'https://images.pexels.com/photos/2613952/pexels-photo-2613952.jpeg', 8)
ON CONFLICT DO NOTHING;
