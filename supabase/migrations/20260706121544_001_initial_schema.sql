/*
# Topline Flooring - Initial Database Schema

1. New Tables
- `categories` - Product categories (e.g., Waterproofing, Epoxy Flooring, etc.)
- `products` - Flooring and waterproofing products/materials
- `customers` - Customer information for orders
- `orders` - Customer orders
- `order_items` - Individual items within an order
- `hero_slides` - Homepage carousel slides
- `testimonials` - Customer testimonials
- `partners` - Certified partner logos/info
- `quotations` - Quotation requests from customers
- `admin_settings` - Admin configuration (login credentials, site settings)

2. Security
- RLS enabled on all tables
- Public read access for products, categories, hero_slides, testimonials, partners (for storefront)
- Public write access for customers, orders, order_items, quotations (for customer submissions)
- Admin tables use simple auth (no Supabase auth - custom admin login)

3. Notes
- This is a single-tenant e-commerce site (no user accounts for customers)
- Admin uses simple username/password stored in admin_settings
- Products include image URLs and pricing in KES (Kenyan Shilling)
*/

-- Categories for products
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  image_url text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Products/Materials
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  price decimal(12,2) NOT NULL,
  unit text DEFAULT 'sqm',
  image_url text,
  gallery_urls text[] DEFAULT '{}',
  featured boolean DEFAULT false,
  in_stock boolean DEFAULT true,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  company text,
  address text,
  city text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  total_amount decimal(12,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL,
  unit_price decimal(12,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Hero carousel slides
CREATE TABLE IF NOT EXISTS hero_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  description text,
  image_url text NOT NULL,
  button_text text,
  button_link text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Testimonials
CREATE TABLE IF NOT EXISTS testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text,
  company text,
  content text NOT NULL,
  avatar_url text,
  rating integer DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Partners (certified partners/brands)
CREATE TABLE IF NOT EXISTS partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  website_url text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Quotation requests
CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  company text,
  project_type text,
  area_size text,
  location text,
  message text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'won', 'lost')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Admin settings (for simple admin authentication)
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Categories: public read, anon write (admin managed but no auth)
DROP POLICY IF EXISTS "anon_read_categories" ON categories;
CREATE POLICY "anon_read_categories" ON categories FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_write_categories" ON categories;
CREATE POLICY "anon_write_categories" ON categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Products: public read, anon write
DROP POLICY IF EXISTS "anon_read_products" ON products;
CREATE POLICY "anon_read_products" ON products FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_write_products" ON products;
CREATE POLICY "anon_write_products" ON products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Customers: anon full access (for customer registration)
DROP POLICY IF EXISTS "anon_access_customers" ON customers;
CREATE POLICY "anon_access_customers" ON customers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Orders: anon full access (for order placement)
DROP POLICY IF EXISTS "anon_access_orders" ON orders;
CREATE POLICY "anon_access_orders" ON orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Order items: anon full access
DROP POLICY IF EXISTS "anon_access_order_items" ON order_items;
CREATE POLICY "anon_access_order_items" ON order_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Hero slides: public read, anon write
DROP POLICY IF EXISTS "anon_read_hero_slides" ON hero_slides;
CREATE POLICY "anon_read_hero_slides" ON hero_slides FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_write_hero_slides" ON hero_slides;
CREATE POLICY "anon_write_hero_slides" ON hero_slides FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Testimonials: public read, anon write
DROP POLICY IF EXISTS "anon_read_testimonials" ON testimonials;
CREATE POLICY "anon_read_testimonials" ON testimonials FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_write_testimonials" ON testimonials;
CREATE POLICY "anon_write_testimonials" ON testimonials FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Partners: public read, anon write
DROP POLICY IF EXISTS "anon_read_partners" ON partners;
CREATE POLICY "anon_read_partners" ON partners FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_write_partners" ON partners;
CREATE POLICY "anon_write_partners" ON partners FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Quotations: anon full access
DROP POLICY IF EXISTS "anon_access_quotations" ON quotations;
CREATE POLICY "anon_access_quotations" ON quotations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Admin settings: anon full access (simple auth pattern)
DROP POLICY IF EXISTS "anon_access_admin_settings" ON admin_settings;
CREATE POLICY "anon_access_admin_settings" ON admin_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Insert default admin credentials
INSERT INTO admin_settings (setting_key, setting_value) VALUES
  ('admin_username', 'admin'),
  ('admin_password', 'admin123')
ON CONFLICT (setting_key) DO NOTHING;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active) WHERE is_active = true;
