-- Regression guard for the 2026-11-02 privacy audit. Run with:
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/portfolio_privacy_regression.sql
-- Runs in a transaction and rolls back; needs the full migration chain applied.
BEGIN;
DO $$
DECLARE v_hidden text; v_shown text; v_denied boolean := false;
BEGIN
  INSERT INTO public.projects(id,title,slug,client_name,is_active)
  VALUES ('00000000-0000-0000-0000-0000000000e1','Privacy test hidden','privacy-test-hidden','Hidden Client Ltd',true),
         ('00000000-0000-0000-0000-0000000000e2','Privacy test shown','privacy-test-shown','Shown Client Ltd',true);
  UPDATE public.projects SET show_client_name = true WHERE slug = 'privacy-test-shown';

  IF (SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='projects' AND column_name='show_client_name') <> 'false' THEN
    RAISE EXCEPTION 'projects.show_client_name must default to false (client names are private unless consent is recorded)';
  END IF;

  SELECT client_name INTO v_hidden FROM public.public_projects WHERE slug = 'privacy-test-hidden';
  SELECT client_name INTO v_shown  FROM public.public_projects WHERE slug = 'privacy-test-shown';
  IF v_hidden IS NOT NULL THEN RAISE EXCEPTION 'public_projects leaked client_name without consent'; END IF;
  IF v_shown IS DISTINCT FROM 'Shown Client Ltd' THEN RAISE EXCEPTION 'public_projects must show client_name when consent is recorded'; END IF;

  IF has_column_privilege('anon', 'public.product_reviews', 'customer_id', 'SELECT') THEN
    RAISE EXCEPTION 'anon must not be able to read product_reviews.customer_id';
  END IF;
  IF NOT has_column_privilege('anon', 'public.product_reviews', 'rating', 'SELECT') THEN
    RAISE EXCEPTION 'anon must still read approved review content (rating)';
  END IF;
END $$;
ROLLBACK;
SELECT 'ok 1 - portfolio client consent and review privacy assertions passed';
