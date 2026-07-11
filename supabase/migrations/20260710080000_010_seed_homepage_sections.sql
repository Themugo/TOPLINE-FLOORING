/*
# Seed Homepage Sections

Problem: `homepage_sections` has never had any rows in it - the Homepage
Builder admin page has been showing an empty list, and the homepage
itself only ever read the `hero` section's slide timing (everything
else - About text, section headings, CTA copy - was hardcoded directly
in the React component, unreachable from admin no matter what the
builder showed).

This migration seeds one row per section, with `content`/`title`/
`subtitle` values matching exactly what's currently hardcoded on the
live site, so turning this migration on causes zero visual change.
From this point on, the homepage component reads these rows, so editing
them in Admin -> Homepage Builder actually changes the live site.

Safe to re-run: every insert is guarded by `WHERE NOT EXISTS`.
*/

INSERT INTO homepage_sections (section_type, section_key, title, subtitle, content, display_order, is_active, padding)
SELECT 'hero', 'hero', NULL, NULL,
  '{"slide_interval": 6000, "overlay_opacity": 70, "show_featured_products": true, "show_featured_services": true}'::jsonb,
  1, true, 'py-0'
WHERE NOT EXISTS (SELECT 1 FROM homepage_sections WHERE section_key = 'hero');

INSERT INTO homepage_sections (section_type, section_key, title, subtitle, content, display_order, is_active, padding)
SELECT 'services', 'services', 'Our Services', 'Professional flooring and waterproofing solutions for Kenya and East Africa.',
  '{}'::jsonb, 2, true, 'py-16'
WHERE NOT EXISTS (SELECT 1 FROM homepage_sections WHERE section_key = 'services');

INSERT INTO homepage_sections (section_type, section_key, title, subtitle, content, display_order, is_active, padding)
SELECT 'about', 'about', 'Who We Are', NULL,
  jsonb_build_object(
    'paragraph_1', 'For over 10 years, Topline Flooring and Waterproofing has been the trusted partner for professional flooring and waterproofing solutions across Kenya and East Africa. We deliver durable, cost-effective services that enhance the lifespan and performance of every structure.',
    'paragraph_2', 'Our team of certified professionals uses only the highest quality materials from globally recognized brands like Sika, Mapei, and BASF.',
    'image_url', 'https://images.unsplash.com/photo-1504307651674-208930a97d63?auto=format&fit=crop&w=600&q=80',
    'stats', jsonb_build_array(
      jsonb_build_object('value', '10+', 'label', 'Years'),
      jsonb_build_object('value', '500+', 'label', 'Projects'),
      jsonb_build_object('value', '100%', 'label', 'Guarantee')
    )
  ),
  3, true, 'py-16'
WHERE NOT EXISTS (SELECT 1 FROM homepage_sections WHERE section_key = 'about');

INSERT INTO homepage_sections (section_type, section_key, title, subtitle, content, display_order, is_active, padding)
SELECT 'products', 'products', 'Materials Shop', 'Premium materials from trusted brands',
  '{"limit": 6}'::jsonb, 4, true, 'py-16'
WHERE NOT EXISTS (SELECT 1 FROM homepage_sections WHERE section_key = 'products');

INSERT INTO homepage_sections (section_type, section_key, title, subtitle, content, display_order, is_active, padding)
SELECT 'partners', 'partners', 'Our Partners', NULL, '{}'::jsonb, 5, true, 'py-8'
WHERE NOT EXISTS (SELECT 1 FROM homepage_sections WHERE section_key = 'partners');

INSERT INTO homepage_sections (section_type, section_key, title, subtitle, content, display_order, is_active, padding)
SELECT 'testimonials', 'testimonials', 'What Clients Say', NULL, '{}'::jsonb, 6, true, 'py-16'
WHERE NOT EXISTS (SELECT 1 FROM homepage_sections WHERE section_key = 'testimonials');

INSERT INTO homepage_sections (section_type, section_key, title, subtitle, content, display_order, is_active, padding)
SELECT 'cta', 'cta', 'Ready to Start Your Project?', 'Get in touch with our team for a free consultation and quotation.',
  '{"cta_text": "Get Free Quote", "cta_link": "/quotation"}'::jsonb, 7, true, 'py-16'
WHERE NOT EXISTS (SELECT 1 FROM homepage_sections WHERE section_key = 'cta');
