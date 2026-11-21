-- Orders created by converting a quotation (convert_quotation_to_order) were inserted without an order_number:
-- the column is nullable, has no default and no trigger, and only create_secure_customer_order (the storefront) set one.
-- Those orders therefore showed a blank number in admin, could not be tracked by number, and any customer email or
-- invoice that quotes "your order <number>" was blank. Found by replaying the migrations on a real PostgreSQL and
-- walking a quotation through to an order.
--
-- Every insert path now gets a number from the same generator the storefront uses, and existing blanks are backfilled.

CREATE OR REPLACE FUNCTION public.ensure_order_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
  IF NEW.order_number IS NULL OR btrim(NEW.order_number) = '' THEN
    NEW.order_number := public.generate_order_number();
  END IF;
  RETURN NEW;
END; $function$;
REVOKE ALL ON FUNCTION public.ensure_order_number() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_orders_ensure_order_number ON public.orders;
CREATE TRIGGER trg_orders_ensure_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.ensure_order_number();

UPDATE public.orders SET order_number = public.generate_order_number() WHERE order_number IS NULL OR btrim(order_number) = '';
