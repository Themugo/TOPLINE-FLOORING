-- Topline Flooring & Waterproofing — canonical database baseline
-- This is a clean-slate schema for the dedicated Topline Supabase project.
-- Historical migrations are retained under supabase/migrations_legacy/ for audit/reference only.

create extension if not exists pgcrypto;


CREATE TABLE public.categories (

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

CREATE TABLE public.product_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  logo_url text,
  description text,
  website_url text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  brand_id uuid REFERENCES public.product_brands(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  short_description text,
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  sale_price numeric(12,2) CHECK (sale_price IS NULL OR sale_price >= 0),
  cost_price numeric(12,2) CHECK (cost_price IS NULL OR cost_price >= 0),
  unit text NOT NULL DEFAULT 'sqm',
  sku text UNIQUE,
  barcode text UNIQUE,
  image_url text,
  gallery_urls text[] NOT NULL DEFAULT '{}',
  featured boolean NOT NULL DEFAULT false,
  in_stock boolean NOT NULL DEFAULT true,
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold integer NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','draft','archived','clearance')),
  is_new_arrival boolean NOT NULL DEFAULT false,
  is_best_seller boolean NOT NULL DEFAULT false,
  is_clearance boolean NOT NULL DEFAULT false,
  sale_start_date timestamptz,
  sale_end_date timestamptz,
  collection text,
  material text,
  origin_country text,
  warranty_years integer CHECK (warranty_years IS NULL OR warranty_years >= 0),
  warranty_description text,
  thickness_mm numeric(8,2),
  weight_kg numeric(8,2),
  dimensions text,
  pack_size text,
  coverage_per_unit text,
  installation_method text,
  is_indoor boolean NOT NULL DEFAULT true,
  is_outdoor boolean NOT NULL DEFAULT false,
  room_suitability text[],
  slip_rating text,
  water_resistance text,
  abrasion_rating text,
  fire_rating text,
  video_url text,
  video_thumbnail text,
  image_360_url text,
  canonical_url text,
  meta_title text,
  meta_description text,
  meta_keywords text,
  related_products uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_sale_window_chk CHECK (sale_end_date IS NULL OR sale_start_date IS NULL OR sale_end_date > sale_start_date)
);

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  company text,
  address text,
  city text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  subtotal numeric(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  delivery_zone_id uuid,
  delivery_address text,
  delivery_charge numeric(12,2) NOT NULL DEFAULT 0 CHECK (delivery_charge >= 0),
  coupon_id uuid,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','processing','completed','cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id uuid,
  product_name text NOT NULL,
  quantity numeric(12,2) NOT NULL CHECK (quantity > 0),
  unit text NOT NULL DEFAULT 'sqm',
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  line_total numeric(12,2) GENERATED ALWAYS AS (round(quantity * unit_price, 2)) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number text UNIQUE,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  company text,
  project_type text,
  service text,
  area_size text,
  location text,
  county text,
  budget_range text,
  timeline text,
  message text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','quoted','won','lost')),
  valid_until date,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 16 CHECK (tax_rate >= 0),
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  pdf_url text,
  sent_at timestamptz,
  responded_at timestamptz,
  lead_id uuid,
  converted_order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.site_settings (

  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_name text NOT NULL,
  sku text UNIQUE,
  barcode text UNIQUE,
  size text, color text, finish text, texture text,
  thickness_mm numeric(8,2), pack_size text, image_url text,
  price_adjustment numeric(12,2) NOT NULL DEFAULT 0,
  sale_price numeric(12,2), cost_price numeric(12,2), weight_kg numeric(8,2),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold integer NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  attributes jsonb NOT NULL DEFAULT '{}',
  display_order integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.navigation_menus (

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

CREATE TABLE public.theme_settings (

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

CREATE TABLE public.homepage_sections (

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

CREATE TABLE public.product_images (

  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  alt_text text,
  display_order integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.product_specifications (

  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  spec_name text NOT NULL,
  spec_value text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.product_documents (

  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  document_name text NOT NULL,
  document_url text NOT NULL,
  document_type text DEFAULT 'pdf',
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.product_tags (

  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.product_tag_relations (

  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES product_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

CREATE TABLE public.delivery_zones (

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

CREATE TABLE public.deliveries (

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

CREATE TABLE public.promotions (

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

CREATE TABLE public.coupons (

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

CREATE TABLE public.media_folders (

  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES media_folders(id) ON DELETE CASCADE,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.media_files (

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



CREATE TABLE public.seo_pages (

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

CREATE TABLE public.product_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, slug text NOT NULL UNIQUE, description text, image_url text, display_order integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.product_collection_relations (product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE, collection_id uuid NOT NULL REFERENCES public.product_collections(id) ON DELETE CASCADE, display_order integer NOT NULL DEFAULT 0, PRIMARY KEY(product_id,collection_id));
CREATE TABLE public.product_reviews (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE, customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL, customer_name text, rating integer CHECK(rating BETWEEN 1 AND 5), title text, content text, pros text[], cons text[], verified_purchase boolean NOT NULL DEFAULT false, helpful_votes integer NOT NULL DEFAULT 0, is_approved boolean NOT NULL DEFAULT false, admin_reply text, admin_reply_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.review_images (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), review_id uuid NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE, image_url text NOT NULL, display_order integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.wishlists (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE, product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE, variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL, added_at timestamptz NOT NULL DEFAULT now(), UNIQUE(customer_id,product_id,variant_id));
CREATE TABLE public.recently_viewed (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE, session_id text, product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE, viewed_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.product_comparisons (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE, session_id text, product_ids uuid[] NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.hero_slides (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, subtitle text, description text, image_url text NOT NULL, button_text text, button_link text, display_order integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.testimonials (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, role text, company text, content text NOT NULL, avatar_url text, rating integer NOT NULL DEFAULT 5 CHECK(rating BETWEEN 1 AND 5), display_order integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.partners (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, logo_url text, website_url text, display_order integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.cms_content (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page TEXT NOT NULL,
  section TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page, section)
);

CREATE TABLE public.faq_items (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT '',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.contact_messages (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  service_interest TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lead_number text UNIQUE, name text NOT NULL, company text, email text, phone text, preferred_contact_method text DEFAULT 'phone', source text NOT NULL DEFAULT 'manual', interested_products uuid[] NOT NULL DEFAULT '{}', interested_services uuid[] NOT NULL DEFAULT '{}', budget_range text, project_location text, project_address text, status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','qualified','proposal','negotiating','won','lost','on_hold')), estimated_value numeric(12,2), lost_reason text, assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL, converted_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL, converted_quotation_id uuid, follow_up_date date, follow_up_notes text, outcome text, outcome_reason text, communication_history jsonb NOT NULL DEFAULT '[]', notes text, created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.lead_notes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE, note text NOT NULL, created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.lead_reminders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE, due_at timestamptz NOT NULL, note text, completed boolean NOT NULL DEFAULT false, completed_at timestamptz, created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.services (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), service_code text UNIQUE, name text NOT NULL, description text, pricing_model text DEFAULT 'custom' CHECK(pricing_model IN ('fixed','hourly','per_sqm','custom')), base_price numeric(12,2), duration_hours numeric(5,2), required_materials text[], required_skills text[], is_active boolean NOT NULL DEFAULT true, display_order integer NOT NULL DEFAULT 0, image_url text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.projects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_number text UNIQUE, title text NOT NULL, slug text UNIQUE NOT NULL, client_name text, customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL, quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL, order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL, project_manager uuid REFERENCES auth.users(id) ON DELETE SET NULL, project_name text, project_address text, project_type text, service_type text, category text, location text, project_date date, completion_date date, start_date date, end_date date, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','scheduled','in_progress','completed','cancelled')), project_value numeric(12,2), estimated_cost numeric(12,2), actual_cost numeric(12,2), area_size text, description text, challenge text, solution text, results text, allocated_materials jsonb NOT NULL DEFAULT '[]', assigned_team jsonb NOT NULL DEFAULT '[]', progress_percentage integer NOT NULL DEFAULT 0 CHECK(progress_percentage BETWEEN 0 AND 100), progress_notes text, issues jsonb NOT NULL DEFAULT '[]', customer_approval boolean NOT NULL DEFAULT false, completion_notes text, completion_photos text[], featured boolean NOT NULL DEFAULT false, is_active boolean NOT NULL DEFAULT true, display_order integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.project_services (

  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, category_id)
);
CREATE TABLE public.project_images (

  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  image_type text DEFAULT 'after' CHECK (image_type IN ('before', 'after', 'progress', 'other')),
  caption text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE public.site_visits (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE, quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL, customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL, scheduled_date date, scheduled_time time, assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL, visit_type text, status text NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','completed','cancelled','rescheduled')), visit_notes text, measurements jsonb NOT NULL DEFAULT '{}', photos text[], customer_signature text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.quotation_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE, product_id uuid REFERENCES public.products(id) ON DELETE SET NULL, description text NOT NULL, quantity numeric(12,2) NOT NULL DEFAULT 1 CHECK(quantity > 0), unit text NOT NULL DEFAULT 'sqm', unit_price numeric(12,2) NOT NULL DEFAULT 0 CHECK(unit_price >= 0), line_total numeric(12,2) GENERATED ALWAYS AS (round(quantity*unit_price,2)) STORED, display_order integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.invoices (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invoice_number text UNIQUE, customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL, order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL, quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL, customer_name text NOT NULL, customer_email text, customer_phone text, billing_address text, status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','paid','partial','overdue','cancelled')), subtotal numeric(12,2) NOT NULL DEFAULT 0, tax_rate numeric(5,2) NOT NULL DEFAULT 16, tax_amount numeric(12,2) NOT NULL DEFAULT 0, total_amount numeric(12,2) NOT NULL DEFAULT 0, amount_paid numeric(12,2) NOT NULL DEFAULT 0, due_date date, notes text, pdf_url text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.invoice_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE, description text NOT NULL, quantity numeric(12,2) NOT NULL DEFAULT 1, unit_price numeric(12,2) NOT NULL DEFAULT 0, line_total numeric(12,2) GENERATED ALWAYS AS (round(quantity*unit_price,2)) STORED, display_order integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE, amount numeric(12,2) NOT NULL CHECK(amount > 0), method text NOT NULL DEFAULT 'cash' CHECK(method IN ('cash','mpesa','bank_transfer','card','cheque','other')), reference text, paid_at timestamptz NOT NULL DEFAULT now(), recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, notes text, created_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.suppliers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), supplier_code text UNIQUE, name text NOT NULL, contact_person text, email text, phone text, address text, city text, country text NOT NULL DEFAULT 'Kenya', is_preferred boolean NOT NULL DEFAULT false, payment_terms text, notes text, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.purchase_orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), po_number text UNIQUE, supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL, order_date date NOT NULL DEFAULT current_date, expected_date date, expected_delivery_date date, actual_delivery_date date, status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','sent','ordered','partial','received','cancelled')), total_amount numeric(12,2) NOT NULL DEFAULT 0, paid_amount numeric(12,2) NOT NULL DEFAULT 0, notes text, created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.purchase_order_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE, product_id uuid REFERENCES public.products(id) ON DELETE SET NULL, material_id uuid, description text NOT NULL, quantity_ordered numeric(12,2) NOT NULL DEFAULT 0 CHECK(quantity_ordered >= 0), unit_cost numeric(12,2) NOT NULL DEFAULT 0 CHECK(unit_cost >= 0), quantity_received numeric(12,2) NOT NULL DEFAULT 0 CHECK(quantity_received >= 0), unit_price numeric(12,2), total_price numeric(12,2), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.materials (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sku text UNIQUE, barcode text, name text NOT NULL, description text, category text, supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL, purchase_cost numeric(12,2), selling_price numeric(12,2), unit text, current_stock numeric(12,2) NOT NULL DEFAULT 0, reserved_stock numeric(12,2) NOT NULL DEFAULT 0, minimum_stock_level numeric(12,2), warehouse_location text, batch_number text, expiry_date date, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.stock_movements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL, movement_type text NOT NULL CHECK(movement_type IN ('in','out','transfer','adjustment','audit')), quantity numeric(12,2) NOT NULL, reference_type text, reference_id uuid, from_location text, to_location text, notes text, performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.inventory_movements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid REFERENCES public.products(id) ON DELETE CASCADE, variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE, warehouse_id uuid, movement_type text NOT NULL CHECK(movement_type IN ('in','out','adjustment')), quantity integer NOT NULL, previous_stock integer, new_stock integer, reference_type text, reference_id text, notes text, created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.inventory_alerts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid REFERENCES public.products(id) ON DELETE CASCADE, variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE, alert_type text NOT NULL DEFAULT 'low_stock', threshold integer NOT NULL DEFAULT 5, current_stock integer, is_resolved boolean NOT NULL DEFAULT false, resolved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.warehouses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, code text UNIQUE, address text, phone text, manager_name text, is_default boolean NOT NULL DEFAULT false, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.warehouse_stock (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE, product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE, quantity integer NOT NULL DEFAULT 0 CHECK(quantity >= 0), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(warehouse_id,product_id));
CREATE TABLE public.stock_transfers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), transfer_number text UNIQUE, from_warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL, to_warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL, product_id uuid REFERENCES public.products(id) ON DELETE CASCADE, quantity integer NOT NULL CHECK(quantity > 0), status text NOT NULL DEFAULT 'completed' CHECK(status IN ('completed','cancelled')), notes text, created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT different_warehouses CHECK(from_warehouse_id IS DISTINCT FROM to_warehouse_id));

CREATE TABLE public.customer_contact_persons (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE, name text NOT NULL, position text, phone text, email text, is_primary boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.customer_addresses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE, address_type text NOT NULL DEFAULT 'delivery' CHECK(address_type IN ('billing','delivery','both')), address_line1 text NOT NULL, address_line2 text, city text NOT NULL, state text, postal_code text, country text NOT NULL DEFAULT 'Kenya', is_default boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.communication_history (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE, lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL, communication_type text NOT NULL, direction text NOT NULL CHECK(direction IN ('inbound','outbound')), subject text, content text, performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.customer_documents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE, document_type text NOT NULL, document_name text NOT NULL, file_url text NOT NULL, description text, uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.customer_preferences (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL UNIQUE REFERENCES public.customers(id) ON DELETE CASCADE, preferred_contact_method text NOT NULL DEFAULT 'email', preferred_language text NOT NULL DEFAULT 'en', marketing_consent boolean NOT NULL DEFAULT false, payment_terms text, credit_limit numeric(12,2), notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.customer_notes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE, note text NOT NULL, note_type text NOT NULL DEFAULT 'general', created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, is_private boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.installations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), installation_number text UNIQUE, order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL, project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL, scheduled_date date, scheduled_time time, assigned_team jsonb NOT NULL DEFAULT '[]', status text NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','in_progress','completed','cancelled','rescheduled')), start_time timestamptz, end_time timestamptz, notes text, progress_photos text[], customer_confirmation boolean NOT NULL DEFAULT false, customer_signature text, completion_certificate text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.customer_portal_access (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid UNIQUE REFERENCES public.customers(id) ON DELETE CASCADE, auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE, is_active boolean NOT NULL DEFAULT true, last_login timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.dashboard_metrics (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), metric_name text UNIQUE NOT NULL, metric_value jsonb NOT NULL, last_updated timestamptz NOT NULL DEFAULT now(), updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL);

CREATE TABLE public.activity_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), action text NOT NULL, entity_type text, entity_id text, details jsonb NOT NULL DEFAULT '{}', actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, actor_email text, ip_address text, user_agent text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.page_visits (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), page_path text NOT NULL, referrer text, user_agent text, visited_at timestamptz NOT NULL DEFAULT now());

ALTER TABLE public.orders ADD CONSTRAINT orders_delivery_zone_fk FOREIGN KEY(delivery_zone_id) REFERENCES public.delivery_zones(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD CONSTRAINT orders_coupon_fk FOREIGN KEY(coupon_id) REFERENCES public.coupons(id) ON DELETE SET NULL;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_variant_fk FOREIGN KEY(variant_id) REFERENCES public.product_variants(id) ON DELETE SET NULL;
ALTER TABLE public.quotations ADD CONSTRAINT quotations_lead_fk FOREIGN KEY(lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;
ALTER TABLE public.quotations ADD CONSTRAINT quotations_order_fk FOREIGN KEY(converted_order_id) REFERENCES public.orders(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD CONSTRAINT leads_quotation_fk FOREIGN KEY(converted_quotation_id) REFERENCES public.quotations(id) ON DELETE SET NULL;
ALTER TABLE public.purchase_order_items ADD CONSTRAINT purchase_order_items_material_fk FOREIGN KEY(material_id) REFERENCES public.materials(id) ON DELETE SET NULL;
ALTER TABLE public.inventory_movements ADD CONSTRAINT inventory_movements_warehouse_fk FOREIGN KEY(warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL;


CREATE INDEX products_category_idx ON public.products(category_id); CREATE INDEX products_brand_idx ON public.products(brand_id); CREATE INDEX products_status_idx ON public.products(status); CREATE INDEX products_active_idx ON public.products(is_active) WHERE is_active;
CREATE INDEX orders_customer_idx ON public.orders(customer_id); CREATE INDEX orders_status_idx ON public.orders(status); CREATE INDEX order_items_order_idx ON public.order_items(order_id);
CREATE INDEX quotations_status_idx ON public.quotations(status); CREATE INDEX quotations_lead_idx ON public.quotations(lead_id); CREATE INDEX leads_status_idx ON public.leads(status); CREATE INDEX leads_assigned_idx ON public.leads(assigned_to);
CREATE INDEX projects_status_idx ON public.projects(status); CREATE INDEX projects_customer_idx ON public.projects(customer_id); CREATE INDEX project_images_project_idx ON public.project_images(project_id);
CREATE INDEX inventory_movements_product_idx ON public.inventory_movements(product_id); CREATE INDEX inventory_movements_created_idx ON public.inventory_movements(created_at); CREATE INDEX warehouse_stock_product_idx ON public.warehouse_stock(product_id);
CREATE INDEX deliveries_order_idx ON public.deliveries(order_id); CREATE INDEX invoices_customer_idx ON public.invoices(customer_id); CREATE INDEX payments_invoice_idx ON public.payments(invoice_id);
CREATE INDEX purchase_orders_supplier_idx ON public.purchase_orders(supplier_id); CREATE INDEX purchase_order_items_po_idx ON public.purchase_order_items(purchase_order_id);
CREATE INDEX customer_addresses_customer_idx ON public.customer_addresses(customer_id); CREATE INDEX communication_history_customer_idx ON public.communication_history(customer_id); CREATE INDEX activity_logs_created_idx ON public.activity_logs(created_at DESC); CREATE INDEX page_visits_path_idx ON public.page_visits(page_path); CREATE INDEX page_visits_visited_idx ON public.page_visits(visited_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products; CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers; CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders; CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_quotations_updated_at ON public.quotations; CREATE TRIGGER trg_quotations_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_product_variants_updated_at ON public.product_variants; CREATE TRIGGER trg_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_product_collections_updated_at ON public.product_collections; CREATE TRIGGER trg_product_collections_updated_at BEFORE UPDATE ON public.product_collections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_product_reviews_updated_at ON public.product_reviews; CREATE TRIGGER trg_product_reviews_updated_at BEFORE UPDATE ON public.product_reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_product_comparisons_updated_at ON public.product_comparisons; CREATE TRIGGER trg_product_comparisons_updated_at BEFORE UPDATE ON public.product_comparisons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects; CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_site_settings_updated_at ON public.site_settings; CREATE TRIGGER trg_site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_theme_settings_updated_at ON public.theme_settings; CREATE TRIGGER trg_theme_settings_updated_at BEFORE UPDATE ON public.theme_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_homepage_sections_updated_at ON public.homepage_sections; CREATE TRIGGER trg_homepage_sections_updated_at BEFORE UPDATE ON public.homepage_sections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads; CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_services_updated_at ON public.services; CREATE TRIGGER trg_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_site_visits_updated_at ON public.site_visits; CREATE TRIGGER trg_site_visits_updated_at BEFORE UPDATE ON public.site_visits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON public.suppliers; CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_materials_updated_at ON public.materials; CREATE TRIGGER trg_materials_updated_at BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_purchase_orders_updated_at ON public.purchase_orders; CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_installations_updated_at ON public.installations; CREATE TRIGGER trg_installations_updated_at BEFORE UPDATE ON public.installations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_customer_contact_persons_updated_at ON public.customer_contact_persons; CREATE TRIGGER trg_customer_contact_persons_updated_at BEFORE UPDATE ON public.customer_contact_persons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_customer_addresses_updated_at ON public.customer_addresses; CREATE TRIGGER trg_customer_addresses_updated_at BEFORE UPDATE ON public.customer_addresses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_customer_preferences_updated_at ON public.customer_preferences; CREATE TRIGGER trg_customer_preferences_updated_at BEFORE UPDATE ON public.customer_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


DROP TRIGGER IF EXISTS trg_deliveries_updated_at ON public.deliveries; CREATE TRIGGER trg_deliveries_updated_at BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


DROP TRIGGER IF EXISTS trg_seo_pages_updated_at ON public.seo_pages; CREATE TRIGGER trg_seo_pages_updated_at BEFORE UPDATE ON public.seo_pages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_warehouses_updated_at ON public.warehouses; CREATE TRIGGER trg_warehouses_updated_at BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_warehouse_stock_updated_at ON public.warehouse_stock; CREATE TRIGGER trg_warehouse_stock_updated_at BEFORE UPDATE ON public.warehouse_stock FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON SCHEMA public IS 'Topline Flooring & Waterproofing canonical application data model';
COMMENT ON TABLE public.products IS 'Canonical sellable catalogue item. Inventory is warehouse-backed; price is the standard catalogue price and sale_price is optional promotional pricing.';
COMMENT ON TABLE public.materials IS 'Operational material stock used for procurement/job consumption; distinct from customer-facing sellable products.';
COMMENT ON TABLE public.projects IS 'Canonical project record merging public portfolio presentation with operational project execution fields.';
COMMENT ON TABLE public.leads IS 'Canonical CRM lead record; name/company/status are the normalized customer-facing fields.';

ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON TABLE public.page_visits TO anon, authenticated;
CREATE POLICY page_visits_public_insert ON public.page_visits FOR INSERT TO anon, authenticated WITH CHECK (length(page_path) BETWEEN 1 AND 2048);
