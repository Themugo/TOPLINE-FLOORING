-- Contract alignment: the admin Projects screen reads/writes these columns, but they did not
-- exist, so every create/edit failed with "column does not exist". Additive and nullable.
-- Budget columns are internal: they are NOT part of the public_projects view.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS materials_used text,
  ADD COLUMN IF NOT EXISTS estimated_budget numeric(14,2) CHECK (estimated_budget IS NULL OR estimated_budget >= 0),
  ADD COLUMN IF NOT EXISTS actual_expenses numeric(14,2) CHECK (actual_expenses IS NULL OR actual_expenses >= 0),
  ADD COLUMN IF NOT EXISTS expense_items jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(expense_items) = 'array');

-- materials_used is shown on the public portfolio, so publish it through the safe view.
CREATE OR REPLACE VIEW public.public_projects AS
SELECT
  id, title, slug, client_name, service_type, category, location,
  project_date, completion_date, area_size, description, challenge, solution, results,
  featured, display_order, created_at, updated_at, materials_used
FROM public.projects
WHERE is_active = true;
