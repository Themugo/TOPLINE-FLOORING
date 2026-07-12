/*
# Seed SEO Pages

Problem: `seo_pages` had zero rows, so the SEO Manager admin screen
showed an empty page list with nothing to select or edit - and even if
rows existed, nothing on the storefront ever read them (meta tags were
never applied to any page). This seeds one row per main public page
with sensible defaults; a follow-up code change makes the storefront
actually apply these to <title> and <meta> tags.
*/

-- page_id is nullable for page_type='home'/'shop' etc (one row per type),
-- but NULL never equals NULL in a unique index, so a plain unique
-- constraint on (page_type, page_id) wouldn't stop duplicate 'home' rows
-- across re-runs. Use a partial unique index instead, covering exactly
-- how this table is actually used: one row per (page_type, page_id) pair,
-- treating NULL page_id as its own single slot per page_type.
CREATE UNIQUE INDEX IF NOT EXISTS idx_seo_pages_type_id
  ON seo_pages (page_type, COALESCE(page_id, ''));

INSERT INTO seo_pages (page_type, page_id, meta_title, meta_description, meta_keywords, og_title, og_description)
VALUES
  ('home', NULL,
   'Topline Flooring & Waterproofing | Industrial Flooring Experts in Kenya',
   'Professional epoxy flooring, polyurethane systems, and waterproofing solutions for industrial, commercial, and residential projects across Kenya.',
   'flooring kenya, epoxy flooring, waterproofing, industrial flooring, polyurethane flooring, concrete sealing',
   'Topline Flooring & Waterproofing',
   'Kenya''s trusted experts in industrial flooring and waterproofing solutions.'),
  ('shop', NULL,
   'Shop Flooring Materials | Topline Flooring & Waterproofing',
   'Browse our range of flooring materials, sealants, and waterproofing products available for order across Kenya.',
   'flooring materials, buy flooring supplies kenya, waterproofing products',
   'Shop Flooring Materials - Topline',
   'Quality flooring and waterproofing materials, delivered across Kenya.'),
  ('services', NULL,
   'Our Services | Topline Flooring & Waterproofing',
   'Explore our full range of flooring and waterproofing services: epoxy coatings, polyurethane systems, joint sealants, and concrete sealers.',
   'flooring services kenya, epoxy coating installation, waterproofing services',
   'Flooring & Waterproofing Services - Topline',
   'Certified installation services for every flooring and waterproofing need.'),
  ('portfolio', NULL,
   'Our Projects | Topline Flooring & Waterproofing',
   'See our completed flooring and waterproofing projects across industrial, commercial, and residential sites in Kenya.',
   'flooring projects kenya, waterproofing case studies, before after flooring',
   'Our Project Portfolio - Topline',
   'A look at our completed flooring and waterproofing installations.'),
  ('contact', NULL,
   'Contact Us | Topline Flooring & Waterproofing',
   'Get in touch with Topline Flooring & Waterproofing for a free consultation and quotation on your next project.',
   'contact topline flooring, flooring quote kenya, waterproofing consultation',
   'Contact Topline Flooring & Waterproofing',
   'Reach out for a free consultation on your flooring or waterproofing project.'),
  ('quotation', NULL,
   'Request a Quote | Topline Flooring & Waterproofing',
   'Request a free, no-obligation quotation for your flooring or waterproofing project from Topline''s expert team.',
   'flooring quote, waterproofing quotation, free estimate kenya',
   'Get a Free Quotation - Topline',
   'Tell us about your project and get a tailored quotation.')
ON CONFLICT (page_type, (COALESCE(page_id, ''))) DO NOTHING;
