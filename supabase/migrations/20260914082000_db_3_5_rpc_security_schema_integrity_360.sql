-- DB-3 / DB-4 / DB-5: preserve certified RPC boundaries and schema indexes.
REVOKE ALL ON FUNCTION public.reconcile_payment_provider_events(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reconcile_payment_provider_events(timestamptz) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.customer_renewal_opportunities_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.maintenance_plans_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_order_number() FROM anon;
REVOKE EXECUTE ON FUNCTION public.normalize_customer_phone(text) FROM anon;

GRANT EXECUTE ON FUNCTION public.create_secure_customer_order(text,text,text,jsonb,text,uuid,uuid,text,text,text) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_quotation_request(text,text,text,text,text,text,text,text,text) TO anon;
GRANT EXECUTE ON FUNCTION public.track_order_public(text,text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text,numeric) TO anon;

ALTER FUNCTION public.add_lead_activity(uuid,text,text,text) SET search_path = public, private;
ALTER FUNCTION public.complete_sales_task(uuid) SET search_path = public, private;
ALTER FUNCTION public.convert_lead_to_customer(uuid) SET search_path = public, private;
ALTER FUNCTION public.convert_quotation_to_order(uuid,text) SET search_path = public, private;
ALTER FUNCTION public.create_customer_order(text,text,text,jsonb,uuid,uuid,text,text) SET search_path = public, private;
ALTER FUNCTION public.create_lead_from_quotation(uuid) SET search_path = public, private;
ALTER FUNCTION public.create_lead_transaction(text,text,text,text,text,text,numeric,text,text,text,uuid,date,text) SET search_path = public, private;
ALTER FUNCTION public.create_sales_task(text,timestamptz,uuid,uuid,uuid,uuid,text) SET search_path = public, private;
ALTER FUNCTION public.create_site_visit(uuid,uuid,date,time,text,uuid,text) SET search_path = public, private;
ALTER FUNCTION public.delete_lead_transaction(uuid) SET search_path = public, private;
ALTER FUNCTION public.get_commercial_lifecycle_360() SET search_path = public, private;
ALTER FUNCTION public.get_sales_crm_360() SET search_path = public, private;
ALTER FUNCTION public.remove_quotation_item_transaction(uuid) SET search_path = public, private;
ALTER FUNCTION public.submit_quotation_request(text,text,text,text,text,text,text,text,text) SET search_path = public, private;
ALTER FUNCTION public.transition_lead_status(uuid,text,text) SET search_path = public, private;
ALTER FUNCTION public.transition_quotation_status(uuid,text,text) SET search_path = public, private;
ALTER FUNCTION public.update_lead_transaction(uuid,text,text,text,text,text,text,numeric,text,text,text,uuid,date,text,text,text,text) SET search_path = public, private;
ALTER FUNCTION public.update_site_visit_status(uuid,text,text) SET search_path = public, private;
ALTER FUNCTION public.upsert_quotation_item_transaction(uuid,uuid,text,numeric,text,numeric,uuid) SET search_path = public, private;

CREATE INDEX IF NOT EXISTS idx_automation_job_locks_run_id ON public.automation_job_locks(run_id);
CREATE INDEX IF NOT EXISTS idx_payment_provider_events_payment_transaction_id ON public.payment_provider_events(payment_transaction_id);
CREATE INDEX IF NOT EXISTS idx_theme_setting_versions_created_by ON public.theme_setting_versions(created_by);
