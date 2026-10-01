-- TOPLINE Catalog / Product / Service / Upload Integrity 360
-- Additive hardening for the canonical catalogue and existing public images bucket.
-- No feature replacement, no data deletion, no second storage bucket.

-- -----------------------------------------------------------------------------
-- 1. Storage contract: make the database bucket definition match the frontend
-- upload contract (JPEG/PNG/WebP/GIF/AVIF, 10 MiB ceiling).
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif']::text[];

-- Keep project documents on the existing private bucket contract as well.
-- This does not create a second document system; it makes the bucket limits
-- explicit and aligned with project_documents.mime_type/file_size_bytes.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'private-documents',
  'private-documents',
  false,
  10485760,
  ARRAY[
    'application/pdf','image/jpeg','image/png','image/webp','text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
      'application/pdf','image/jpeg','image/png','image/webp','text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]::text[];

-- -----------------------------------------------------------------------------
-- 2. Product integrity.
-- -----------------------------------------------------------------------------
ALTER TABLE public.products
  ADD CONSTRAINT products_sale_price_not_above_price_chk
  CHECK (sale_price IS NULL OR sale_price <= price) NOT VALID;

ALTER TABLE public.products
  ADD CONSTRAINT products_display_order_nonnegative_chk
  CHECK (display_order >= 0) NOT VALID;

ALTER TABLE public.products
  ADD CONSTRAINT products_low_stock_threshold_nonnegative_chk
  CHECK (low_stock_threshold >= 0) NOT VALID;

ALTER TABLE public.product_variants
  ADD CONSTRAINT product_variants_sale_price_nonnegative_chk
  CHECK (sale_price IS NULL OR sale_price >= 0) NOT VALID;

ALTER TABLE public.product_variants
  ADD CONSTRAINT product_variants_cost_price_nonnegative_chk
  CHECK (cost_price IS NULL OR cost_price >= 0) NOT VALID;

ALTER TABLE public.product_variants
  ADD CONSTRAINT product_variants_display_order_nonnegative_chk
  CHECK (display_order >= 0) NOT VALID;

ALTER TABLE public.product_images
  ADD CONSTRAINT product_images_display_order_nonnegative_chk
  CHECK (display_order >= 0) NOT VALID;

ALTER TABLE public.product_specifications
  ADD CONSTRAINT product_specifications_display_order_nonnegative_chk
  CHECK (display_order >= 0) NOT VALID;

ALTER TABLE public.product_documents
  ADD CONSTRAINT product_documents_display_order_nonnegative_chk
  CHECK (display_order >= 0) NOT VALID;

-- At most one primary image per product. The existing application RPC remains
-- the authoritative way to change the primary image.
CREATE UNIQUE INDEX IF NOT EXISTS product_images_one_primary_idx
  ON public.product_images(product_id)
  WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS product_images_product_order_idx
  ON public.product_images(product_id, display_order, created_at);

CREATE INDEX IF NOT EXISTS product_documents_product_order_idx
  ON public.product_documents(product_id, display_order, created_at);

CREATE INDEX IF NOT EXISTS product_specifications_product_order_idx
  ON public.product_specifications(product_id, display_order, created_at);

-- -----------------------------------------------------------------------------
-- 3. Service catalogue integrity.
-- -----------------------------------------------------------------------------
ALTER TABLE public.services
  ADD CONSTRAINT services_base_price_nonnegative_chk
  CHECK (base_price IS NULL OR base_price >= 0) NOT VALID;

ALTER TABLE public.services
  ADD CONSTRAINT services_duration_nonnegative_chk
  CHECK (duration_hours IS NULL OR duration_hours >= 0) NOT VALID;

ALTER TABLE public.services
  ADD CONSTRAINT services_display_order_nonnegative_chk
  CHECK (display_order >= 0) NOT VALID;

CREATE INDEX IF NOT EXISTS services_service_code_idx
  ON public.services(service_code)
  WHERE service_code IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 4. Media-library record integrity.
-- Storage is the physical asset; media_files is the searchable catalogue record.
-- Keep them separate, but make invalid metadata impossible.
-- -----------------------------------------------------------------------------
UPDATE public.media_files
SET is_public = true
WHERE is_public IS NULL;

ALTER TABLE public.media_files
  ALTER COLUMN is_public SET DEFAULT true,
  ALTER COLUMN is_public SET NOT NULL;

ALTER TABLE public.media_files
  ADD CONSTRAINT media_files_filename_nonblank_chk
  CHECK (btrim(filename) <> '') NOT VALID;

ALTER TABLE public.media_files
  ADD CONSTRAINT media_files_file_size_nonnegative_chk
  CHECK (file_size IS NULL OR file_size > 0) NOT VALID;

ALTER TABLE public.media_files
  ADD CONSTRAINT media_files_file_size_ceiling_chk
  CHECK (file_size IS NULL OR file_size <= 10485760) NOT VALID;

ALTER TABLE public.media_files
  ADD CONSTRAINT media_files_dimensions_nonnegative_chk
  CHECK ((width IS NULL OR width > 0) AND (height IS NULL OR height > 0)) NOT VALID;

CREATE INDEX IF NOT EXISTS media_files_folder_created_idx
  ON public.media_files(folder_id, created_at DESC);

CREATE INDEX IF NOT EXISTS media_files_public_created_idx
  ON public.media_files(is_public, created_at DESC);

-- -----------------------------------------------------------------------------
-- 5. Service/product image URL indexes. These do not change existing URL
-- formats; they simply make media-backed catalogue reads predictable.
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS products_image_url_idx
  ON public.products(image_url)
  WHERE image_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS services_image_url_idx
  ON public.services(image_url)
  WHERE image_url IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 6. Validate the new constraints after they have been installed.
-- -----------------------------------------------------------------------------
ALTER TABLE public.products VALIDATE CONSTRAINT products_sale_price_not_above_price_chk;
ALTER TABLE public.products VALIDATE CONSTRAINT products_display_order_nonnegative_chk;
ALTER TABLE public.products VALIDATE CONSTRAINT products_low_stock_threshold_nonnegative_chk;
ALTER TABLE public.product_variants VALIDATE CONSTRAINT product_variants_sale_price_nonnegative_chk;
ALTER TABLE public.product_variants VALIDATE CONSTRAINT product_variants_cost_price_nonnegative_chk;
ALTER TABLE public.product_variants VALIDATE CONSTRAINT product_variants_display_order_nonnegative_chk;
ALTER TABLE public.product_images VALIDATE CONSTRAINT product_images_display_order_nonnegative_chk;
ALTER TABLE public.product_specifications VALIDATE CONSTRAINT product_specifications_display_order_nonnegative_chk;
ALTER TABLE public.product_documents VALIDATE CONSTRAINT product_documents_display_order_nonnegative_chk;
ALTER TABLE public.services VALIDATE CONSTRAINT services_base_price_nonnegative_chk;
ALTER TABLE public.services VALIDATE CONSTRAINT services_duration_nonnegative_chk;
ALTER TABLE public.services VALIDATE CONSTRAINT services_display_order_nonnegative_chk;
ALTER TABLE public.media_files VALIDATE CONSTRAINT media_files_filename_nonblank_chk;
ALTER TABLE public.media_files VALIDATE CONSTRAINT media_files_file_size_nonnegative_chk;
ALTER TABLE public.media_files VALIDATE CONSTRAINT media_files_file_size_ceiling_chk;
ALTER TABLE public.media_files VALIDATE CONSTRAINT media_files_dimensions_nonnegative_chk;

COMMENT ON TABLE public.products IS 'Canonical Topline product catalogue with database-enforced commercial and inventory integrity.';
COMMENT ON TABLE public.services IS 'Canonical Topline service catalogue with database-enforced pricing, duration and ordering integrity.';
COMMENT ON TABLE public.media_files IS 'Canonical searchable media metadata for assets stored in the images bucket; storage remains the physical asset boundary.';
