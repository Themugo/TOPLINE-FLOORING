# Supabase Row Level Security (RLS) Policies

This document outlines the RLS policies that should be configured for production deployment of the Topline Flooring application.

## Overview

Row Level Security (RLS) is a critical security feature in Supabase/PostgreSQL that restricts which rows can be accessed by different users. This ensures that users can only access data they are authorized to see.

## Required Policies

### 1. Public Access (Anonymous Users)

#### Products
```sql
-- Enable RLS on products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active products
CREATE POLICY "Public can view active products"
ON products FOR SELECT
USING (is_active = true);

-- Deny all other operations for public
CREATE POLICY "Public cannot modify products"
ON products FOR ALL
USING (false);
```

#### Categories
```sql
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active categories"
ON categories FOR SELECT
USING (is_active = true);

CREATE POLICY "Public cannot modify categories"
ON categories FOR ALL
USING (false);
```

#### Services
```sql
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active services"
ON services FOR SELECT
USING (is_active = true);

CREATE POLICY "Public cannot modify services"
ON services FOR ALL
USING (false);
```

#### Projects/Portfolio
```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active projects"
ON projects FOR SELECT
USING (is_active = true);

CREATE POLICY "Public cannot modify projects"
ON projects FOR ALL
USING (false);
```

#### Hero Slides, Testimonials, Partners
```sql
ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active hero slides"
ON hero_slides FOR SELECT
USING (is_active = true);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active testimonials"
ON testimonials FOR SELECT
USING (is_active = true);

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active partners"
ON partners FOR SELECT
USING (is_active = true);
```

### 2. Customer Orders (Authenticated Users)

#### Orders
```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Customers can only view their own orders
CREATE POLICY "Customers can view own orders"
ON orders FOR SELECT
USING (
  auth.uid()::text = customer_id
  OR customer_id IS NULL -- For guest orders
);

-- Customers can insert their own orders
CREATE POLICY "Customers can create orders"
ON orders FOR INSERT
WITH CHECK (
  auth.uid()::text = customer_id
  OR customer_id IS NULL
);

-- Deny updates and deletes for customers
CREATE POLICY "Customers cannot modify orders"
ON orders FOR UPDATE
USING (false);

CREATE POLICY "Customers cannot delete orders"
ON orders FOR DELETE
USING (false);
```

#### Order Items
```sql
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own order items"
ON order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (auth.uid()::text = orders.customer_id OR orders.customer_id IS NULL)
  )
);
```

#### Quotations
```sql
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own quotations"
ON quotations FOR SELECT
USING (auth.uid()::text = customer_id OR customer_id IS NULL);

CREATE POLICY "Customers can create quotations"
ON quotations FOR INSERT
WITH CHECK (auth.uid()::text = customer_id OR customer_id IS NULL);
```

#### Customers
```sql
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own profile"
ON customers FOR SELECT
USING (auth.uid()::text = id);

CREATE POLICY "Customers can update own profile"
ON customers FOR UPDATE
USING (auth.uid()::text = id);
```

### 3. Admin Access (Service Role)

Admin operations should use the service role key, which bypasses RLS. However, you can create specific policies for authenticated admin users:

```sql
-- Create a function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean AS $$
BEGIN
  -- Check if the user's email matches admin email
  -- This requires a custom auth setup or checking against admin_settings
  RETURN EXISTS (
    SELECT 1 FROM admin_settings
    WHERE setting_key = 'email'
    AND setting_value = auth.email()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example policy for admin access (if using auth)
CREATE POLICY "Admins can manage products"
ON products FOR ALL
USING (is_admin_user());
```

### 4. Site Settings (Admin Only)

```sql
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Deny all public access
CREATE POLICY "No public access to site settings"
ON site_settings FOR ALL
USING (false);

-- Only service role can access (bypasses RLS)
-- Or create admin-specific policies
```

### 5. Admin Settings (Admin Only)

```sql
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access to admin settings"
ON admin_settings FOR ALL
USING (false);
```

### 6. Activity Logs (Admin Only)

```sql
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access to activity logs"
ON activity_logs FOR ALL
USING (false);
```

## Implementation Steps

1. **Enable RLS on all tables**
   ```sql
   ALTER TABLE products ENABLE ROW LEVEL SECURITY;
   ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
   ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
   -- ... enable for all tables
   ```

2. **Create the policies above** in your Supabase SQL editor

3. **Test the policies** using the Supabase auth system

4. **Monitor and adjust** based on application behavior

## Migration File

Create a new migration file to apply these policies:

```sql
-- supabase/migrations/20260707110000_010_enable_rls_policies.sql

-- Enable RLS on all public tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public can view active products" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Public cannot modify products" ON products FOR ALL USING (false);

CREATE POLICY "Public can view active categories" ON categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public cannot modify categories" ON categories FOR ALL USING (false);

CREATE POLICY "Public can view active services" ON services FOR SELECT USING (is_active = true);
CREATE POLICY "Public cannot modify services" ON services FOR ALL USING (false);

CREATE POLICY "Public can view active projects" ON projects FOR SELECT USING (is_active = true);
CREATE POLICY "Public cannot modify projects" ON projects FOR ALL USING (false);

CREATE POLICY "Public can view active hero slides" ON hero_slides FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view active testimonials" ON testimonials FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view active partners" ON partners FOR SELECT USING (is_active = true);

-- Customer policies
CREATE POLICY "Customers can view own orders" ON orders FOR SELECT USING (auth.uid()::text = customer_id OR customer_id IS NULL);
CREATE POLICY "Customers can create orders" ON orders FOR INSERT WITH CHECK (auth.uid()::text = customer_id OR customer_id IS NULL);
CREATE POLICY "Customers cannot modify orders" ON orders FOR UPDATE USING (false);
CREATE POLICY "Customers cannot delete orders" ON orders FOR DELETE USING (false);

CREATE POLICY "Customers can view own order items" ON order_items FOR SELECT 
USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (auth.uid()::text = orders.customer_id OR orders.customer_id IS NULL)));

CREATE POLICY "Customers can view own quotations" ON quotations FOR SELECT USING (auth.uid()::text = customer_id OR customer_id IS NULL);
CREATE POLICY "Customers can create quotations" ON quotations FOR INSERT WITH CHECK (auth.uid()::text = customer_id OR customer_id IS NULL);

CREATE POLICY "Customers can view own profile" ON customers FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "Customers can update own profile" ON customers FOR UPDATE USING (auth.uid()::text = id);

-- Admin-only policies
CREATE POLICY "No public access to site settings" ON site_settings FOR ALL USING (false);
CREATE POLICY "No public access to admin settings" ON admin_settings FOR ALL USING (false);
CREATE POLICY "No public access to activity logs" ON activity_logs FOR ALL USING (false);
```

## Important Notes

1. **Service Role Key**: Admin operations should use the service role key, which bypasses RLS entirely
2. **Testing**: Always test RLS policies in a development environment first
3. **Performance**: Complex policies can impact query performance
4. **Monitoring**: Use Supabase's dashboard to monitor policy execution
5. **Backup**: Always backup your database before applying RLS changes

## Security Checklist

- [ ] RLS enabled on all tables
- [ ] Public read-only policies for content tables
- [ ] Customer-specific policies for orders/profiles
- [ ] Admin-only policies for settings
- [ ] Policies tested with different user roles
- [ ] Service role key secured and only used server-side
- [ ] Anon key permissions reviewed and minimized
