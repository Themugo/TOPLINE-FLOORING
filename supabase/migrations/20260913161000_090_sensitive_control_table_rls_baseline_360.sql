-- 090 — Sensitive control/audit tables: explicit deny baseline.
BEGIN;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['access_reviews','business_continuity_plans','communication_provider_events','data_governance_policies','data_subject_requests','executive_operations_events','hse_corrective_actions_360','hse_site_controls_360','hse_site_events_360','inventory_reservations','operational_incidents','privileged_access_requests','quality_corrective_actions_360','quality_inspections_360','recovery_checkpoints','recovery_drills','staff_identity_events'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('DROP POLICY IF EXISTS deny_direct_client_access ON public.%I',t);
    EXECUTE format('CREATE POLICY deny_direct_client_access ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',t);
  END LOOP;
END $$;
COMMIT;
-- Rollback: drop deny_direct_client_access per table only after confirming a direct-client dependency.
