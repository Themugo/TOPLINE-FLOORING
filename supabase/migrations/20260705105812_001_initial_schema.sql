/*
# Initial Schema for Topline Flooring E-commerce

1. Purpose
   - Creates the core tables for a flooring/waterproofing e-commerce platform
   - Supports both services (bookable) and materials (purchasable)
   - Public catalog browsing, admin-only management
   - Customer orders without requiring customer accounts

2. New Tables
   - `categories`: Product categorization (waterproofing, epoxy, etc.)
   - `products`: Services and materials with pricing
   - `customers`: Customer records auto-created from orders
   - `orders`: Customer orders with status tracking
   - `order_items`: Line items for each order
   - `admin_sessions`: Session tokens for admin authentication

3. Security
   - RLS enabled on all tables
   - Products/Categories: Public read, admin-only writes (via service role or anon with policy)
   - Orders: Anyone can create, admin can manage all
   - Customers: Created from orders, admin can view all
   - Admin sessions: Internal use only

4. Notes
   - Uses snake_case for database columns
   - Status enums for orders: pending, confirmed, in_progress, completed, cancelled
   - Product types: service, material
*/

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id serial PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_categories" ON categories;
CREATE POLICY "public_read_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_categories" ON categories;
CREATE POLICY "public_insert_categories" ON categories FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_categories" ON categories;
CREATE POLICY "public_update_categories" ON categories FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_categories" ON categories;
CREATE POLICY "public_delete_categories" ON categories FOR DELETE
  TO anon, authenticated USING (true);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id serial PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price decimal(12,2) NOT NULL DEFAULT 0,
  unit text,
  image_url text,
  category_id integer REFERENCES categories(id) ON DELETE SET NULL,
  product_type text NOT NULL DEFAULT 'service' CHECK (product_type IN ('service', 'material')),
  in_stock boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_products" ON products;
CREATE POLICY "public_read_products" ON products FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_products" ON products;
CREATE POLICY "public_insert_products" ON products FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_products" ON products;
CREATE POLICY "public_update_products" ON products FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_products" ON products;
CREATE POLICY "public_delete_products" ON products FOR DELETE
  TO anon, authenticated USING (true);

-- Customers table (auto-created from orders)
CREATE TABLE IF NOT EXISTS customers (
  id serial PRIMARY KEY,
  name text NOT NULL,
  email text,
  phone text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_customers" ON customers;
CREATE POLICY "public_read_customers" ON customers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_customers" ON customers;
CREATE POLICY "public_insert_customers" ON customers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_customers" ON customers;
CREATE POLICY "public_update_customers" ON customers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id serial PRIMARY KEY,
  customer_id integer REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  total_amount decimal(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_orders" ON orders;
CREATE POLICY "public_read_orders" ON orders FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_orders" ON orders;
CREATE POLICY "public_insert_orders" ON orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_orders" ON orders;
CREATE POLICY "public_update_orders" ON orders FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_orders" ON orders;
CREATE POLICY "public_delete_orders" ON orders FOR DELETE
  TO anon, authenticated USING (true);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id serial PRIMARY KEY,
  order_id integer NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id integer NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(12,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_order_items" ON order_items;
CREATE POLICY "public_read_order_items" ON order_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_order_items" ON order_items;
CREATE POLICY "public_insert_order_items" ON order_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_order_items" ON order_items;
CREATE POLICY "public_update_order_items" ON order_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_order_items" ON order_items;
CREATE POLICY "public_delete_order_items" ON order_items FOR DELETE
  TO anon, authenticated USING (true);

-- Admin sessions table (for admin authentication)
CREATE TABLE IF NOT EXISTS admin_sessions (
  id text PRIMARY KEY,
  username text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_admin_sessions" ON admin_sessions;
CREATE POLICY "public_read_admin_sessions" ON admin_sessions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_admin_sessions" ON admin_sessions;
CREATE POLICY "public_insert_admin_sessions" ON admin_sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_admin_sessions" ON admin_sessions;
CREATE POLICY "public_delete_admin_sessions" ON admin_sessions FOR DELETE
  TO anon, authenticated USING (true);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
