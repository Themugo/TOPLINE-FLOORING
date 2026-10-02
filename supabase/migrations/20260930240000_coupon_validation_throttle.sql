-- Anonymous coupon-code guessing protection. validate_coupon is callable without login (it is
-- used by the public cart), so failed lookups are counted per caller and blocked after a burst.
-- Successful validations are never counted, so normal shoppers are unaffected.

CREATE TABLE IF NOT EXISTS public.coupon_validation_failures (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  caller_key text NOT NULL,
  failed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS coupon_validation_failures_lookup_idx
  ON public.coupon_validation_failures (caller_key, failed_at DESC);

ALTER TABLE public.coupon_validation_failures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coupon_validation_failures FROM anon, authenticated;
DROP POLICY IF EXISTS deny_direct_client_access ON public.coupon_validation_failures;
CREATE POLICY deny_direct_client_access ON public.coupon_validation_failures
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text, p_order_total numeric DEFAULT 0)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_coupon record;
  v_discount numeric(12,2);
  v_total numeric(12,2);
  v_key text;
  v_recent integer;
BEGIN
  v_total := greatest(coalesce(p_order_total, 0), 0);

  -- Caller identity: first hop of X-Forwarded-For (set by the Supabase gateway), else the JWT subject.
  BEGIN
    v_key := split_part(coalesce((current_setting('request.headers', true))::json ->> 'x-forwarded-for', ''), ',', 1);
  EXCEPTION WHEN OTHERS THEN
    v_key := '';
  END;
  v_key := coalesce(nullif(btrim(v_key), ''), nullif(coalesce(auth.uid()::text, ''), ''), 'unknown');
  v_key := left(v_key, 64);

  SELECT count(*) INTO v_recent
  FROM public.coupon_validation_failures
  WHERE caller_key = v_key AND failed_at > now() - interval '10 minutes';
  IF v_recent >= 10 THEN
    RETURN json_build_object('valid', false, 'error', 'Too many invalid attempts. Please try again in a few minutes.');
  END IF;

  IF length(trim(coalesce(p_code, ''))) < 1 OR length(trim(p_code)) > 50 THEN
    INSERT INTO public.coupon_validation_failures(caller_key) VALUES (v_key);
    RETURN json_build_object('valid', false, 'error', 'Invalid coupon code');
  END IF;

  SELECT * INTO v_coupon FROM public.coupons
  WHERE upper(code) = upper(trim(p_code)) AND is_active = true
    AND (start_date IS NULL OR start_date <= now())
    AND (end_date IS NULL OR end_date > now())
    AND (max_uses IS NULL OR current_uses < max_uses);

  IF v_coupon IS NULL THEN
    INSERT INTO public.coupon_validation_failures(caller_key) VALUES (v_key);
    DELETE FROM public.coupon_validation_failures WHERE failed_at < now() - interval '1 day';
    RETURN json_build_object('valid', false, 'error', 'Invalid or expired coupon');
  END IF;
  IF coalesce(v_coupon.min_order_value, 0) > v_total THEN
    RETURN json_build_object('valid', false, 'error', 'Minimum order value is not met');
  END IF;
  IF v_coupon.coupon_type = 'percentage' THEN
    v_discount := round(v_total * (v_coupon.discount_value / 100), 2);
  ELSE
    v_discount := least(v_coupon.discount_value, v_total);
  END IF;
  v_discount := greatest(v_discount, 0);
  RETURN json_build_object('valid', true, 'coupon_id', v_coupon.id, 'discount_type', v_coupon.coupon_type,
    'discount_value', v_coupon.discount_value, 'discount_amount', v_discount, 'code', v_coupon.code);
END;
$function$;
