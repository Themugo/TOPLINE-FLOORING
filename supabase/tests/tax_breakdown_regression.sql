BEGIN;
DO $t$
DECLARE s jsonb; t text;
BEGIN
  s := private.tax_settings();
  IF (s->>'rate')::numeric <> 16 OR s->>'label' <> 'VAT' THEN RAISE EXCEPTION '1 default tax should be VAT 16: %', s; END IF;
  t := private.order_breakdown_text(10000, 500, 1000, 10500);
  IF t NOT LIKE '%Items subtotal: KES 10,000.00%' OR t NOT LIKE '%Discount: -KES 500.00%' OR t NOT LIKE '%Delivery: KES 1,000.00%' THEN RAISE EXCEPTION '2 lines missing: %', t; END IF;
  IF t NOT LIKE '%VAT (16%, included in total): KES 1,448.28%' OR t NOT LIKE '%Amount before VAT: KES 9,051.72%' THEN RAISE EXCEPTION '3 vat maths wrong: %', t; END IF;
  UPDATE public.site_settings SET setting_value = '{"rate":0}'::jsonb WHERE setting_key='tax_settings';
  t := private.order_breakdown_text(1000,0,0,1000);
  IF t LIKE '%VAT%' THEN RAISE EXCEPTION '4 zero rate must hide vat: %', t; END IF;
  UPDATE public.site_settings SET setting_value = '{"rate":8,"label":"GST","tax_pin":"P051234567Z"}'::jsonb WHERE setting_key='tax_settings';
  t := private.order_breakdown_text(1080,0,0,1080);
  IF t NOT LIKE '%GST (8%, included in total): KES 80.00%' THEN RAISE EXCEPTION '5 custom label/rate: %', t; END IF;
  IF private.tax_pin_footer() NOT LIKE '%P051234567Z%' THEN RAISE EXCEPTION '6 pin footer'; END IF;
  RAISE NOTICE 'ok 1 tax';
END $t$;
ROLLBACK;
\echo ' tax_breakdown_regression: OK'
