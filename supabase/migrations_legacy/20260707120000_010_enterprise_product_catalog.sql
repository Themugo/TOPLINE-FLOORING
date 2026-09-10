-- Enterprise Product Catalog Upgrade
-- Adds comprehensive product attributes for premium ecommerce experience

-- Add enterprise columns to products table
DO $$ 
BEGIN
  -- Product Status Flags
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'status') THEN
    ALTER TABLE products ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived', 'clearance'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_new_arrival') THEN
    ALTER TABLE products ADD COLUMN is_new_arrival boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_best_seller') THEN
    ALTER TABLE products ADD COLUMN is_best_seller boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_clearance') THEN
    ALTER TABLE products ADD COLUMN is_clearance boolean DEFAULT false;
  END IF;
  
  -- Pricing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'sale_price') THEN
    ALTER TABLE products ADD COLUMN sale_price decimal(12,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'cost_price') THEN
    ALTER TABLE products ADD COLUMN cost_price decimal(12,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'sale_start_date') THEN
    ALTER TABLE products ADD COLUMN sale_start_date timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'sale_end_date') THEN
    ALTER TABLE products ADD COLUMN sale_end_date timestamptz;
  END IF;
  
  -- Product Details
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'collection') THEN
    ALTER TABLE products ADD COLUMN collection text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'material') THEN
    ALTER TABLE products ADD COLUMN material text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'origin_country') THEN
    ALTER TABLE products ADD COLUMN origin_country text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'warranty_years') THEN
    ALTER TABLE products ADD COLUMN warranty_years integer;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'warranty_description') THEN
    ALTER TABLE products ADD COLUMN warranty_description text;
  END IF;
  
  -- Physical Properties
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'thickness_mm') THEN
    ALTER TABLE products ADD COLUMN thickness_mm decimal(8,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'weight_kg') THEN
    ALTER TABLE products ADD COLUMN weight_kg decimal(8,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'dimensions') THEN
    ALTER TABLE products ADD COLUMN dimensions text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'pack_size') THEN
    ALTER TABLE products ADD COLUMN pack_size text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'coverage_per_unit') THEN
    ALTER TABLE products ADD COLUMN coverage_per_unit text;
  END IF;
  
  -- Installation & Usage
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'installation_method') THEN
    ALTER TABLE products ADD COLUMN installation_method text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_indoor') THEN
    ALTER TABLE products ADD COLUMN is_indoor boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_outdoor') THEN
    ALTER TABLE products ADD COLUMN is_outdoor boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'room_suitability') THEN
    ALTER TABLE products ADD COLUMN room_suitability text[];
  END IF;
  
  -- Performance Ratings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'slip_rating') THEN
    ALTER TABLE products ADD COLUMN slip_rating text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'water_resistance') THEN
    ALTER TABLE products ADD COLUMN water_resistance text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'abrasion_rating') THEN
    ALTER TABLE products ADD COLUMN abrasion_rating text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'fire_rating') THEN
    ALTER TABLE products ADD COLUMN fire_rating text;
  END IF;
  
  -- Barcode
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'barcode') THEN
    ALTER TABLE products ADD COLUMN barcode text UNIQUE;
  END IF;
  
  -- Video Support
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'video_url') THEN
    ALTER TABLE products ADD COLUMN video_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'video_thumbnail') THEN
    ALTER TABLE products ADD COLUMN video_thumbnail text;
  END IF;
  
  -- 360° Image
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_360_url') THEN
    ALTER TABLE products ADD COLUMN image_360_url text;
  END IF;
  
  -- SEO
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'canonical_url') THEN
    ALTER TABLE products ADD COLUMN canonical_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'meta_keywords') THEN
    ALTER TABLE products ADD COLUMN meta_keywords text;
  END IF;
END $$;

-- Enhance product_variants table with enterprise attributes
DO $$ 
BEGIN
  -- Variant-specific attributes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'size') THEN
    ALTER TABLE product_variants ADD COLUMN size text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'color') THEN
    ALTER TABLE product_variants ADD COLUMN color text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'finish') THEN
    ALTER TABLE product_variants ADD COLUMN finish text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'texture') THEN
    ALTER TABLE product_variants ADD COLUMN texture text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'thickness_mm') THEN
    ALTER TABLE product_variants ADD COLUMN thickness_mm decimal(8,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'pack_size') THEN
    ALTER TABLE product_variants ADD COLUMN pack_size text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'barcode') THEN
    ALTER TABLE product_variants ADD COLUMN barcode text UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'image_url') THEN
    ALTER TABLE product_variants ADD COLUMN image_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'sale_price') THEN
    ALTER TABLE product_variants ADD COLUMN sale_price decimal(12,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'cost_price') THEN
    ALTER TABLE product_variants ADD COLUMN cost_price decimal(12,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'weight_kg') THEN
    ALTER TABLE product_variants ADD COLUMN weight_kg decimal(8,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'low_stock_threshold') THEN
    ALTER TABLE product_variants ADD COLUMN low_stock_threshold integer DEFAULT 5;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'is_default') THEN
    ALTER TABLE product_variants ADD COLUMN is_default boolean DEFAULT false;
  END IF;
END $$;

-- Create product collections table for grouping
CREATE TABLE IF NOT EXISTS product_collections (
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

-- Product-collection junction table
CREATE TABLE IF NOT EXISTS product_collection_relations (
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  collection_id uuid REFERENCES product_collections(id) ON DELETE CASCADE,
  display_order integer DEFAULT 0,
  PRIMARY KEY (product_id, collection_id)
);

-- Create product reviews table (Phase 9 preparation)
CREATE TABLE IF NOT EXISTS product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  title text,
  content text,
  pros text[],
  cons text[],
  verified_purchase boolean DEFAULT false,
  helpful_votes integer DEFAULT 0,
  is_approved boolean DEFAULT false,
  admin_reply text,
  admin_reply_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create review images table
CREATE TABLE IF NOT EXISTS review_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES product_reviews(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create wishlist table (Phase 6 preparation)
CREATE TABLE IF NOT EXISTS wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  added_at timestamptz DEFAULT now(),
  UNIQUE(customer_id, product_id, variant_id)
);

-- Create recently viewed table (Phase 7 preparation)
CREATE TABLE IF NOT EXISTS recently_viewed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  session_id text,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now()
);

-- Create product comparison table (Phase 5 preparation)
CREATE TABLE IF NOT EXISTS product_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  session_id text,
  product_ids uuid[] NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE product_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_collection_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE recently_viewed ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_comparisons ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "public_read_collections" ON product_collections FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "admin_write_collections" ON product_collections FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "public_access_collection_relations" ON product_collection_relations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "public_read_reviews" ON product_reviews FOR SELECT TO anon, authenticated USING (is_approved = true);
CREATE POLICY "customer_create_review" ON product_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = customer_id::text);
CREATE POLICY "admin_write_reviews" ON product_reviews FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "public_access_review_images" ON review_images FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "customer_own_wishlist" ON wishlists FOR ALL TO authenticated USING (auth.uid()::text = customer_id::text) WITH CHECK (auth.uid()::text = customer_id::text);
CREATE POLICY "admin_write_wishlist" ON wishlists FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "customer_own_recently_viewed" ON recently_viewed FOR ALL TO authenticated USING (auth.uid()::text = customer_id::text OR session_id IS NOT NULL) WITH CHECK (auth.uid()::text = customer_id::text OR session_id IS NOT NULL);
CREATE POLICY "admin_write_recently_viewed" ON recently_viewed FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "customer_own_comparison" ON product_comparisons FOR ALL TO authenticated USING (auth.uid()::text = customer_id::text OR session_id IS NOT NULL) WITH CHECK (auth.uid()::text = customer_id::text OR session_id IS NOT NULL);
CREATE POLICY "admin_write_comparison" ON product_comparisons FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_products_new_arrival ON products(is_new_arrival) WHERE is_new_arrival = true;
CREATE INDEX IF NOT EXISTS idx_products_best_seller ON products(is_best_seller) WHERE is_best_seller = true;
CREATE INDEX IF NOT EXISTS idx_products_clearance ON products(is_clearance) WHERE is_clearance = true;
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_material ON products(material);
CREATE INDEX IF NOT EXISTS idx_products_collection ON products(collection);
CREATE INDEX IF NOT EXISTS idx_products_indoor ON products(is_indoor);
CREATE INDEX IF NOT EXISTS idx_products_outdoor ON products(is_outdoor);
CREATE INDEX IF NOT EXISTS idx_products_sale ON products(sale_start_date, sale_end_date) WHERE sale_start_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_variants_size ON product_variants(size);
CREATE INDEX IF NOT EXISTS idx_variants_color ON product_variants(color);
CREATE INDEX IF NOT EXISTS idx_variants_finish ON product_variants(finish);
CREATE INDEX IF NOT EXISTS idx_variants_default ON product_variants(is_default) WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_collections_active ON product_collections(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_collection_relations_product ON product_collection_relations(product_id);
CREATE INDEX IF NOT EXISTS idx_collection_relations_collection ON product_collection_relations(collection_id);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON product_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON product_reviews(is_approved) WHERE is_approved = true;
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON product_reviews(rating);

CREATE INDEX IF NOT EXISTS idx_wishlist_customer ON wishlists(customer_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product ON wishlists(product_id);

CREATE INDEX IF NOT EXISTS idx_recently_viewed_customer ON recently_viewed(customer_id);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_session ON recently_viewed(session_id);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_product ON recently_viewed(product_id);

CREATE INDEX IF NOT EXISTS idx_comparison_customer ON product_comparisons(customer_id);
CREATE INDEX IF NOT EXISTS idx_comparison_session ON product_comparisons(session_id);

-- Add helpful function to get product price (handles sale pricing)
CREATE OR REPLACE FUNCTION get_product_price(product_id uuid, variant_id uuid DEFAULT NULL)
RETURNS decimal(12,2) AS $$
DECLARE
  product_price decimal(12,2);
  product_sale_price decimal(12,2);
  product_sale_start timestamptz;
  product_sale_end timestamptz;
  variant_price decimal(12,2);
  variant_sale_price decimal(12,2);
  final_price decimal(12,2);
BEGIN
  -- Get variant price if variant_id provided
  IF variant_id IS NOT NULL THEN
    SELECT 
      COALESCE(v.sale_price, v.price_adjustment + p.price),
      v.sale_price
    INTO variant_price, variant_sale_price
    FROM product_variants v
    JOIN products p ON p.id = v.product_id
    WHERE v.id = variant_id;
    
    IF variant_sale_price IS NOT NULL THEN
      RETURN variant_sale_price;
    END IF;
    RETURN variant_price;
  END IF;
  
  -- Get product price
  SELECT price, sale_price, sale_start_date, sale_end_date
  INTO product_price, product_sale_price, product_sale_start, product_sale_end
  FROM products
  WHERE id = product_id;
  
  -- Check if sale is active
  IF product_sale_price IS NOT NULL 
     AND product_sale_start <= now() 
     AND (product_sale_end IS NULL OR product_sale_end > now()) THEN
    RETURN product_sale_price;
  END IF;
  
  RETURN product_price;
END;
$$ LANGUAGE plpgsql;

-- Add function to get total stock (product + variants)
CREATE OR REPLACE FUNCTION get_total_stock(product_id uuid)
RETURNS integer AS $$
DECLARE
  total_stock integer;
BEGIN
  SELECT COALESCE(SUM(stock_quantity), 0)
  INTO total_stock
  FROM product_variants
  WHERE product_id = product_id AND is_active = true;
  
  IF total_stock = 0 THEN
    SELECT stock_quantity INTO total_stock
    FROM products
    WHERE id = product_id;
  END IF;
  
  RETURN COALESCE(total_stock, 0);
END;
$$ LANGUAGE plpgsql;
