-- Phase 8 — communications callback integrity and provider readiness.
-- Route SMS DLRs through the same monotonic delivery transition ledger as other providers.

CREATE OR REPLACE FUNCTION public.record_sms_delivery_report(
  p_provider_reference text,
  p_status text,
  p_phone text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_cost numeric DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_status text := lower(coalesce(p_status,'unknown'));
  v_recorded boolean;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required';
  END IF;
  IF nullif(trim(p_provider_reference),'') IS NULL THEN
    RAISE EXCEPTION 'Provider message reference is required';
  END IF;
  IF p_cost IS NOT NULL AND p_cost < 0 THEN
    RAISE EXCEPTION 'Provider cost cannot be negative';
  END IF;
  IF v_status NOT IN ('sent','submitted','buffered','success','delivered','rejected','failed','expired') THEN
    v_status := 'unknown';
  ELSIF v_status = 'sent' THEN
    v_status := 'submitted';
  END IF;

  v_recorded := public.record_provider_delivery_event_worker(
    'africastalking','sms',v_status,p_provider_reference,p_provider_reference,
    p_phone,coalesce(p_payload,'{}'::jsonb) || jsonb_build_object('description',p_description)
  );

  IF v_recorded AND p_cost IS NOT NULL THEN
    UPDATE public.communication_outbox
    SET provider_cost = p_cost
    WHERE channel='sms' AND provider_reference=p_provider_reference;
  END IF;
  RETURN coalesce(v_recorded,false);
END;
$$;

REVOKE ALL ON FUNCTION public.record_sms_delivery_report(text,text,text,text,jsonb,numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_sms_delivery_report(text,text,text,text,jsonb,numeric) TO service_role;
