-- TOPLINE production repair: service catalogue contract + scheduled communications delivery.
-- Additive only. Preserves existing service/project data and migration history.

-- 1) Reconcile the canonical services table with the public/admin service contract.
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Backfill safe slugs for existing rows before enforcing uniqueness.
DO $$
DECLARE
  r record;
  base_slug text;
  candidate text;
  suffix integer;
BEGIN
  FOR r IN SELECT id, name FROM public.services WHERE slug IS NULL OR btrim(slug) = '' ORDER BY created_at, id LOOP
    base_slug := regexp_replace(lower(btrim(coalesce(r.name, 'service'))), '[^a-z0-9]+', '-', 'g');
    base_slug := regexp_replace(base_slug, '(^-+|-+$)', '', 'g');
    IF base_slug = '' THEN base_slug := 'service'; END IF;
    candidate := left(base_slug, 180);
    suffix := 1;
    WHILE EXISTS (SELECT 1 FROM public.services s WHERE s.slug = candidate AND s.id <> r.id) LOOP
      candidate := left(base_slug, 170) || '-' || suffix::text;
      suffix := suffix + 1;
    END LOOP;
    UPDATE public.services SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

UPDATE public.services
SET short_description = left(description, 220)
WHERE short_description IS NULL
  AND description IS NOT NULL;

UPDATE public.services
SET features = '[]'::jsonb
WHERE features IS NULL OR jsonb_typeof(features) <> 'array';

ALTER TABLE public.services
  ALTER COLUMN slug SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_features_array_chk') THEN
    ALTER TABLE public.services
      ADD CONSTRAINT services_features_array_chk
      CHECK (jsonb_typeof(features) = 'array') NOT VALID;
  END IF;
END $$;

ALTER TABLE public.services VALIDATE CONSTRAINT services_features_array_chk;

CREATE UNIQUE INDEX IF NOT EXISTS services_slug_unique_idx
  ON public.services(slug);

CREATE INDEX IF NOT EXISTS services_active_display_order_idx
  ON public.services(is_active, display_order, created_at);

-- Keep the legacy service-code/pricing fields intact; the catalogue UI can use
-- the richer content fields while operational pricing remains available.
COMMENT ON COLUMN public.services.slug IS 'Public service URL slug and stable catalogue identifier.';
COMMENT ON COLUMN public.services.short_description IS 'Short catalogue/card description.';
COMMENT ON COLUMN public.services.features IS 'JSON array of customer-facing service features.';
COMMENT ON COLUMN public.services.icon IS 'Optional catalogue icon identifier.';

-- 2) Make project_services capable of referring to an actual service while
-- preserving the existing category relationship for backward compatibility.
ALTER TABLE public.project_services
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS project_services_project_service_unique_idx
  ON public.project_services(project_id, service_id)
  WHERE service_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS project_services_service_idx
  ON public.project_services(service_id)
  WHERE service_id IS NOT NULL;

COMMENT ON COLUMN public.project_services.service_id IS 'Optional direct link to the canonical services catalogue; category_id remains for legacy project categorisation.';
