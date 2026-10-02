-- Margin protection: products.cost_price and product_variants.cost_price were readable by
-- anyone through the public API (anon and any signed-in customer), because the product tables
-- are public by design and RLS cannot hide individual columns. Nothing in the application,
-- RPC layer or edge functions reads or writes these columns, so the data moves to a
-- staff-only table and the public columns are dropped.

CREATE TABLE IF NOT EXISTS public.product_cost_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  cost_price numeric(12,2) NOT NULL CHECK (cost_price >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS product_cost_prices_product_uidx
  ON public.product_cost_prices (product_id) WHERE variant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS product_cost_prices_variant_uidx
  ON public.product_cost_prices (variant_id) WHERE variant_id IS NOT NULL;

ALTER TABLE public.product_cost_prices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_cost_prices FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_cost_prices TO authenticated;

DROP POLICY IF EXISTS product_cost_prices_staff_select ON public.product_cost_prices;
CREATE POLICY product_cost_prices_staff_select ON public.product_cost_prices
  FOR SELECT TO authenticated USING (private.current_user_has_permission('catalog','select'));
DROP POLICY IF EXISTS product_cost_prices_staff_insert ON public.product_cost_prices;
CREATE POLICY product_cost_prices_staff_insert ON public.product_cost_prices
  FOR INSERT TO authenticated WITH CHECK (private.current_user_has_permission('catalog','insert'));
DROP POLICY IF EXISTS product_cost_prices_staff_update ON public.product_cost_prices;
CREATE POLICY product_cost_prices_staff_update ON public.product_cost_prices
  FOR UPDATE TO authenticated
  USING (private.current_user_has_permission('catalog','update'))
  WITH CHECK (private.current_user_has_permission('catalog','update'));
DROP POLICY IF EXISTS product_cost_prices_staff_delete ON public.product_cost_prices;
CREATE POLICY product_cost_prices_staff_delete ON public.product_cost_prices
  FOR DELETE TO authenticated USING (private.current_user_has_permission('catalog','delete'));

DROP TRIGGER IF EXISTS trg_product_cost_prices_touch_updated_at ON public.product_cost_prices;
CREATE TRIGGER trg_product_cost_prices_touch_updated_at
  BEFORE UPDATE ON public.product_cost_prices
  FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
DROP TRIGGER IF EXISTS trg_topline_audit_product_cost_prices ON public.product_cost_prices;
CREATE TRIGGER trg_topline_audit_product_cost_prices
  AFTER INSERT OR UPDATE OR DELETE ON public.product_cost_prices
  FOR EACH ROW EXECUTE FUNCTION private.audit_log_change();

-- Preserve any existing data (guarded so the migration is re-runnable).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='cost_price') THEN
    INSERT INTO public.product_cost_prices (product_id, cost_price)
    SELECT id, cost_price FROM public.products WHERE cost_price IS NOT NULL AND cost_price > 0
    ON CONFLICT DO NOTHING;
    ALTER TABLE public.products DROP COLUMN cost_price;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_variants' AND column_name='cost_price') THEN
    INSERT INTO public.product_cost_prices (product_id, variant_id, cost_price)
    SELECT product_id, id, cost_price FROM public.product_variants WHERE cost_price IS NOT NULL AND cost_price > 0
    ON CONFLICT DO NOTHING;
    ALTER TABLE public.product_variants DROP COLUMN cost_price;
  END IF;
END $$;

COMMENT ON TABLE public.product_cost_prices IS 'Staff-only purchase/cost prices (margin data). Never expose through public views or select(*) on public tables.';
