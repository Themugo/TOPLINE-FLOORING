-- TOPLINE adversarial RLS / IDOR smoke suite.
-- Run in the client-owned Supabase SQL editor. Non-destructive: all changes are transactional.
-- This suite does not create production business records.

-- 1. Anonymous direct-table boundary: expected permission denial.
BEGIN;
SET LOCAL ROLE anon;
SELECT count(*) FROM public.customers;
ROLLBACK;

-- 2. Authenticated with no identity: expected zero business rows.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
SELECT
  (SELECT count(*) FROM public.customers) AS customers_visible,
  (SELECT count(*) FROM public.orders) AS orders_visible,
  (SELECT count(*) FROM public.projects) AS projects_visible,
  (SELECT count(*) FROM public.invoices) AS invoices_visible,
  (SELECT count(*) FROM public.service_cases) AS service_cases_visible,
  (SELECT count(*) FROM public.communication_outbox) AS outbox_visible,
  (SELECT count(*) FROM public.staff_profiles) AS staff_visible;
ROLLBACK;

-- 3. RPC privilege boundary checks. All five must be false except secure checkout.
SELECT
  NOT has_function_privilege('anon','public.create_customer_order(text,text,text,jsonb,uuid,uuid,text,text)','EXECUTE') AS legacy_checkout_blocked,
  NOT has_function_privilege('authenticated','public.create_customer_order(text,text,text,jsonb,uuid,uuid,text,text)','EXECUTE') AS legacy_checkout_auth_blocked,
  NOT has_function_privilege('authenticated','public.claim_communication_outbox(integer)','EXECUTE') AS worker_claim_blocked,
  NOT has_function_privilege('authenticated','public.complete_communication_delivery(uuid,text,text)','EXECUTE') AS worker_complete_blocked,
  NOT has_function_privilege('authenticated','public.fail_communication_delivery(uuid,text,boolean)','EXECUTE') AS worker_fail_blocked,
  has_function_privilege('anon','public.create_secure_customer_order(text,text,text,jsonb,text,uuid,uuid,text,text,text)','EXECUTE') AS secure_checkout_public;

-- 4. Private storage must remain non-public.
SELECT id, public, file_size_limit FROM storage.buckets WHERE id='private-documents';

-- 5. Controlled two-customer IDOR test (only run after inserting disposable fixture data in a transaction):
-- SET LOCAL ROLE authenticated;
-- SET request.jwt.claims to Customer A;
-- SELECT * FROM public.orders WHERE customer_id='<CUSTOMER_B_ID>'; -- must return 0 rows.
-- SELECT public.get_customer_lifecycle_360('<CUSTOMER_B_ID>'); -- must be rejected unless caller is authorized staff.
