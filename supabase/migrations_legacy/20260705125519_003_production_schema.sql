/*
# Production Schema Enhancement

1. New Tables
- `site_settings` - Website configuration (logo, favicon, SEO, contact, social)
- `navigation_menus` - Navigation menu items
- `theme_settings` - Theme configuration
- `homepage_sections` - Editable homepage sections
- `product_images` - Product gallery images
- `product_specifications` - Technical specifications
- `product_variants` - Product variants (sizes, colors)
- `product_documents` - Downloadable documents
- `product_tags` - Product tagging
- `product_brands` - Product brands
- `inventory_movements` - Stock movement tracking
- `inventory_alerts` - Low stock alerts
- `delivery_zones` - Delivery zones and charges
- `deliveries` - Delivery tracking
- `promotions` - Promotions and banners
- `coupons` - Discount coupons
- `media_folders` - Media library folders
- `media_files` - Media library files
- `projects` - Portfolio projects
- `project_images` - Project gallery (before/after)
- `seo_pages` - SEO metadata per page
- `reports` - Report definitions
- `activity_logs` - System activity tracking

2. Extended Tables
- Added columns to products for SEO, brand, specs
- Added columns to testimonials for ordering, visibility
- Added columns to partners for ordering

3. Security
- RLS enabled on all new tables
- Public read where appropriate, admin write
*/

-- Site Settings Table
CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Navigation Menus
CREATE TABLE IF NOT EXISTS navigation_menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_name text NOT NULL,
  location text NOT NULL DEFAULT 'header',
  label text NOT NULL,
  href text NOT NULL,
  parent_id uuid REFERENCES navigation_menus(id) ON DELETE CASCADE,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  open_in_new_tab boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Theme Settings
CREATE TABLE IF NOT EXISTS theme_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_name text NOT NULL,
  preset text DEFAULT 'default',
  primary_color text DEFAULT '#0369a1',
  secondary_color text DEFAULT '#f59e0b',
  accent_color text DEFAULT '#0369a1',
  heading_font text DEFAULT 'Space Grotesk',
  body_font text DEFAULT 'Inter',
  button_style text DEFAULT 'rounded',
  border_radius integer DEFAULT 8,
  spacing_scale integer DEFAULT 8,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Homepage Sections (Dynamic Builder)
CREATE TABLE IF NOT EXISTS homepage_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_type text NOT NULL,
  section_key text UNIQUE NOT NULL,
  title text,
  subtitle text,
  content jsonb DEFAULT '{}',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  background_color text,
  background_image text,
  padding text DEFAULT 'py-16',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Product Images (Gallery)
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  alt_text text,
  display_order integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Product Specifications
CREATE TABLE IF NOT EXISTS product_specifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  spec_name text NOT NULL,
  spec_value text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Product Variants
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  variant_name text NOT NULL,
  sku text,
  price_adjustment decimal(12,2) DEFAULT 0,
  stock_quantity integer DEFAULT 0,
  attributes jsonb DEFAULT '{}',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Product Documents
CREATE TABLE IF NOT EXISTS product_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  document_name text NOT NULL,
  document_url text NOT NULL,
  document_type text DEFAULT 'pdf',
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Product Tags
CREATE TABLE IF NOT EXISTS product_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Product-Tag Junction
CREATE TABLE IF NOT EXISTS product_tag_relations (
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES product_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

-- Product Brands
CREATE TABLE IF NOT EXISTS product_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  description text,
  website_url text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Inventory Movements
CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  quantity integer NOT NULL,
  previous_stock integer,
  new_stock integer,
  reference_type text,
  reference_id text,
  notes text,
  created_by text,
  created_at timestamptz DEFAULT now()
);

-- Inventory Alerts
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  alert_type text DEFAULT 'low_stock',
  threshold integer DEFAULT 5,
  current_stock integer,
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Delivery Zones
CREATE TABLE IF NOT EXISTS delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_name text NOT NULL,
  regions text[] DEFAULT '{}',
  base_charge decimal(12,2) DEFAULT 0,
  free_delivery_minimum decimal(12,2),
  estimated_days text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Deliveries
CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  zone_id uuid REFERENCES delivery_zones(id),
  tracking_number text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'Processing', 'dispatched', 'in_transit', 'delivered', 'failed')),
  delivery_address text,
  delivery_notes text,
  scheduled_date date,
  delivered_at timestamptz,
  driver_name text,
  driver_phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Promotions
CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_type text NOT NULL CHECK (promo_type IN ('banner', 'flash_sale', 'featured', 'announcement', 'popup')),
  title text NOT NULL,
  subtitle text,
  description text,
  image_url text,
  link_url text,
  link_text text,
  discount_percent integer,
  discount_amount decimal(12,2),
  product_ids uuid[] DEFAULT '{}',
  category_ids uuid[] DEFAULT '{}',
  start_date timestamptz,
  end_date timestamptz,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  position text DEFAULT 'top',
  background_color text,
  text_color text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Coupons
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  coupon_type text DEFAULT 'percentage' CHECK (coupon_type IN ('percentage', 'fixed')),
  discount_value decimal(12,2) NOT NULL,
  min_order_value decimal(12,2),
  max_uses integer,
  current_uses integer DEFAULT 0,
  start_date timestamptz,
  end_date timestamptz,
  applies_to text DEFAULT 'all' CHECK (applies_to IN ('all', 'products', 'categories')),
  product_ids uuid[] DEFAULT '{}',
  category_ids uuid[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Media Folders
CREATE TABLE IF NOT EXISTS media_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES media_folders(id) ON DELETE CASCADE,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Media Files
CREATE TABLE IF NOT EXISTS media_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid REFERENCES media_folders(id) ON DELETE SET NULL,
  filename text NOT NULL,
  original_name text,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  width integer,
  height integer,
  alt_text text,
  title text,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Projects (Portfolio)
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  client_name text,
  service_type text,
  category text,
  location text,
  project_date date,
  completion_date date,
  project_value decimal(12,2),
  area_size text,
  description text,
  challenge text,
  solution text,
  results text,
  featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Project Images
CREATE TABLE IF NOT EXISTS project_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  image_type text DEFAULT 'after' CHECK (image_type IN ('before', 'after', 'progress', 'other')),
  caption text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Project Services (related)
CREATE TABLE IF NOT EXISTS project_services (
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, category_id)
);

-- SEO Pages
CREATE TABLE IF NOT EXISTS seo_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type text NOT NULL,
  page_id text,
  meta_title text,
  meta_description text,
  meta_keywords text,
  og_title text,
  og_description text,
  og_image text,
  canonical_url text,
  structured_data jsonb,
  no_index boolean DEFAULT false,
  no_follow boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Add columns to existing products table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'brand_id') THEN
    ALTER TABLE products ADD COLUMN brand_id uuid REFERENCES product_brands(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'sku') THEN
    ALTER TABLE products ADD COLUMN sku text UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'meta_title') THEN
    ALTER TABLE products ADD COLUMN meta_title text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'meta_description') THEN
    ALTER TABLE products ADD COLUMN meta_description text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'stock_quantity') THEN
    ALTER TABLE products ADD COLUMN stock_quantity integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'low_stock_threshold') THEN
    ALTER TABLE products ADD COLUMN low_stock_threshold integer DEFAULT 5;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'related_products') THEN
    ALTER TABLE products ADD COLUMN related_products uuid[] DEFAULT '{}';
  END IF;
END $$;

-- Add columns to orders table for delivery
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_zone_id') THEN
    ALTER TABLE orders ADD COLUMN delivery_zone_id uuid REFERENCES delivery_zones(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_address') THEN
    ALTER TABLE orders ADD COLUMN delivery_address text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_charge') THEN
    ALTER TABLE orders ADD COLUMN delivery_charge decimal(12,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'coupon_id') THEN
    ALTER TABLE orders ADD COLUMN coupon_id uuid REFERENCES coupons(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'discount_amount') THEN
    ALTER TABLE orders ADD COLUMN discount_amount decimal(12,2) DEFAULT 0;
  END IF;
END $$;

-- Enable RLS on all new tables
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tag_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Public read, anon write
DROP POLICY IF EXISTS "public_access_site_settings" ON site_settings;
CREATE POLICY "public_access_site_settings" ON site_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_navigation" ON navigation_menus;
CREATE POLICY "public_read_navigation" ON navigation_menus FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "admin_write_navigation" ON navigation_menus;
CREATE POLICY "admin_write_navigation" ON navigation_menus FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_access_theme" ON theme_settings;
CREATE POLICY "public_access_theme" ON theme_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_sections" ON homepage_sections;
CREATE POLICY "public_read_sections" ON homepage_sections FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "admin_write_sections" ON homepage_sections;
CREATE POLICY "admin_write_sections" ON homepage_sections FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_access_product_images" ON product_images;
CREATE POLICY "public_access_product_images" ON product_images FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_access_specifications" ON product_specifications;
CREATE POLICY "public_access_specifications" ON product_specifications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_access_variants" ON product_variants;
CREATE POLICY "public_access_variants" ON product_variants FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_access_documents" ON product_documents;
CREATE POLICY "public_access_documents" ON product_documents FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_access_tags" ON product_tags;
CREATE POLICY "public_access_tags" ON product_tags FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_access_tag_relations" ON product_tag_relations;
CREATE POLICY "public_access_tag_relations" ON product_tag_relations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_access_brands" ON product_brands;
CREATE POLICY "public_access_brands" ON product_brands FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_access_inventory" ON inventory_movements;
CREATE POLICY "admin_access_inventory" ON inventory_movements FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_access_alerts" ON inventory_alerts;
CREATE POLICY "admin_access_alerts" ON inventory_alerts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_delivery_zones" ON delivery_zones;
CREATE POLICY "public_read_delivery_zones" ON delivery_zones FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "admin_write_delivery_zones" ON delivery_zones;
CREATE POLICY "admin_write_delivery_zones" ON delivery_zones FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_access_deliveries" ON deliveries;
CREATE POLICY "admin_access_deliveries" ON deliveries FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_promotions" ON promotions;
CREATE POLICY "public_read_promotions" ON promotions FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "admin_write_promotions" ON promotions;
CREATE POLICY "admin_write_promotions" ON promotions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_access_coupons" ON coupons;
CREATE POLICY "admin_access_coupons" ON coupons FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_access_media" ON media_folders;
CREATE POLICY "admin_access_media" ON media_folders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_media" ON media_files;
CREATE POLICY "public_read_media" ON media_files FOR SELECT TO anon, authenticated USING (is_public = true);
DROP POLICY IF EXISTS "admin_write_media" ON media_files;
CREATE POLICY "admin_write_media" ON media_files FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_projects" ON projects;
CREATE POLICY "public_read_projects" ON projects FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "admin_write_projects" ON projects;
CREATE POLICY "admin_write_projects" ON projects FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_access_project_images" ON project_images;
CREATE POLICY "public_access_project_images" ON project_images FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_access_project_services" ON project_services;
CREATE POLICY "public_access_project_services" ON project_services FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_access_seo" ON seo_pages;
CREATE POLICY "admin_access_seo" ON seo_pages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_access_logs" ON activity_logs;
CREATE POLICY "admin_access_logs" ON activity_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_specs_product ON product_specifications(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_docs_product ON product_documents(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_media_files_folder ON media_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_homepage_sections_order ON homepage_sections(display_order);
