-- Phase 3: cart and checkout integrity.
-- Phase 2 made variant-managed products use variant stock as their sellable stock.
-- Enforce that invariant at the order-line boundary too: a product with active
-- variants cannot be sold as an unqualified parent-product line, and a supplied
-- variant must belong to that product and still be active.

CREATE OR REPLACE FUNCTION public.enforce_order_item_variant_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_has_active_variants boolean;
  v_variant_product_id uuid;
  v_variant_active boolean;
BEGIN
  IF NEW.product_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.product_variants pv
     WHERE pv.product_id = NEW.product_id AND pv.is_active = true
  ) INTO v_has_active_variants;

  IF NEW.variant_id IS NULL THEN
    IF v_has_active_variants THEN
      RAISE EXCEPTION 'Select an available product option before ordering this item'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  SELECT pv.product_id, pv.is_active
    INTO v_variant_product_id, v_variant_active
    FROM public.product_variants pv
   WHERE pv.id = NEW.variant_id;

  IF v_variant_product_id IS NULL
     OR v_variant_product_id <> NEW.product_id
     OR v_variant_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'The selected product option is unavailable'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_order_item_variant_integrity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS order_items_variant_integrity ON public.order_items;
CREATE TRIGGER order_items_variant_integrity
  BEFORE INSERT OR UPDATE OF product_id, variant_id
  ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_item_variant_integrity();

COMMENT ON FUNCTION public.enforce_order_item_variant_integrity() IS
  'Prevents an order line from bypassing variant-level stock by omitting its active product option; also validates product/variant ownership and active status.';
