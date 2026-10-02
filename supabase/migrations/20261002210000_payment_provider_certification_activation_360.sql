-- Payment Provider Certification + Production Activation 360.
-- Additive only. Provider credentials remain Edge Function/deployment secrets.

CREATE TABLE IF NOT EXISTS public.payment_provider_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_key text NOT NULL,
  provider text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('sandbox','production')),
  status text NOT NULL DEFAULT 'not_tested' CHECK (status IN ('not_tested','testing','failed','certified')),
  test_results jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  certified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  certified_at timestamptz,
  expires_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(gateway_key, environment)
);
CREATE INDEX IF NOT EXISTS payment_provider_certifications_gateway_idx
  ON public.payment_provider_certifications(gateway_key, environment, status);
ALTER TABLE public.payment_provider_certifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_provider_certifications FROM anon, authenticated;
GRANT SELECT ON public.payment_provider_certifications TO authenticated;
DROP POLICY IF EXISTS payment_provider_certifications_staff_read ON public.payment_provider_certifications;
CREATE POLICY payment_provider_certifications_staff_read ON public.payment_provider_certifications
  FOR SELECT TO authenticated USING (private.current_user_has_permission('settings','select'));

CREATE OR REPLACE FUNCTION public.record_payment_provider_certification_360(
  p_gateway_key text,
  p_environment text,
  p_status text,
  p_test_results jsonb DEFAULT '{}'::jsonb,
  p_evidence jsonb DEFAULT '{}'::jsonb,
  p_notes text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
DECLARE v_user uuid; v_id uuid;
BEGIN
  v_user:=private.require_staff_permission('settings','update');
  IF p_environment NOT IN ('sandbox','production') THEN RAISE EXCEPTION 'Invalid certification environment'; END IF;
  IF p_status NOT IN ('not_tested','testing','failed','certified') THEN RAISE EXCEPTION 'Invalid certification status'; END IF;
  IF p_environment='production' AND p_status='certified' THEN
    IF coalesce(p_evidence->>'reference','')='' THEN RAISE EXCEPTION 'Production certification requires an evidence reference'; END IF;
    IF coalesce((p_test_results->>'successful_payment')::boolean,false) IS NOT TRUE
       OR coalesce((p_test_results->>'failed_payment')::boolean,false) IS NOT TRUE
       OR coalesce((p_test_results->>'duplicate_callback')::boolean,false) IS NOT TRUE
       OR coalesce((p_test_results->>'amount_reference_validation')::boolean,false) IS NOT TRUE
       OR coalesce((p_test_results->>'customer_return')::boolean,false) IS NOT TRUE
       OR coalesce((p_test_results->>'reconciliation')::boolean,false) IS NOT TRUE THEN
      RAISE EXCEPTION 'Production certification requires complete payment UAT evidence';
    END IF;
  END IF;
  INSERT INTO public.payment_provider_certifications(gateway_key,provider,environment,status,test_results,evidence,certified_by,certified_at,expires_at,notes,updated_at)
  SELECT gateway_key,provider,p_environment,p_status,coalesce(p_test_results,'{}'::jsonb),coalesce(p_evidence,'{}'::jsonb),CASE WHEN p_status='certified' THEN v_user ELSE NULL END,CASE WHEN p_status='certified' THEN now() ELSE NULL END,p_expires_at,p_notes,now()
  FROM public.payment_gateway_methods WHERE gateway_key=p_gateway_key
  ON CONFLICT (gateway_key,environment) DO UPDATE SET
    provider=EXCLUDED.provider,status=EXCLUDED.status,test_results=EXCLUDED.test_results,evidence=EXCLUDED.evidence,
    certified_by=EXCLUDED.certified_by,certified_at=EXCLUDED.certified_at,expires_at=EXCLUDED.expires_at,notes=EXCLUDED.notes,updated_at=now()
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Payment gateway not found'; END IF;
  RETURN jsonb_build_object('success',true,'id',v_id,'gateway_key',p_gateway_key,'environment',p_environment,'status',p_status,'certified_by',v_user);
END;$function$;
REVOKE ALL ON FUNCTION public.record_payment_provider_certification_360(text,text,text,jsonb,jsonb,text,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_payment_provider_certification_360(text,text,text,jsonb,jsonb,text,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_payment_provider_release_gate_360(p_gateway_key text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $function$
DECLARE v_cert public.payment_provider_certifications%ROWTYPE; v_gateway public.payment_gateway_methods%ROWTYPE; v_ready boolean:=false; v_expired boolean:=false;
BEGIN
  SELECT * INTO v_gateway FROM public.payment_gateway_methods WHERE gateway_key=p_gateway_key;
  IF NOT FOUND THEN RETURN jsonb_build_object('ready',false,'reason','gateway_not_found'); END IF;
  SELECT * INTO v_cert FROM public.payment_provider_certifications WHERE gateway_key=p_gateway_key AND environment='production' ORDER BY updated_at DESC LIMIT 1;
  v_expired:=v_cert.expires_at IS NOT NULL AND v_cert.expires_at<=now();
  v_ready:=v_cert.status='certified' AND NOT v_expired;
  RETURN jsonb_build_object('ready',v_ready,'gateway_key',v_gateway.gateway_key,'provider',v_gateway.provider,'payment_method',v_gateway.payment_method,'environment','production','status',coalesce(v_cert.status,'not_tested'),'expired',v_expired,'certified_at',v_cert.certified_at,'expires_at',v_cert.expires_at,'test_results',coalesce(v_cert.test_results,'{}'::jsonb),'evidence',coalesce(v_cert.evidence,'{}'::jsonb),'notes',v_cert.notes);
END;$function$;
REVOKE ALL ON FUNCTION public.get_payment_provider_release_gate_360(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_payment_provider_release_gate_360(text) TO authenticated, service_role;

-- All gateway edits now cross one server-authorized control boundary. Production customer enablement
-- for M-Pesa/card requires an unexpired production certification; bank transfer is exempt.
CREATE OR REPLACE FUNCTION public.save_payment_gateway_control_360(p_gateway_id uuid,p_patch jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
DECLARE v_user uuid; v_gateway public.payment_gateway_methods%ROWTYPE; v_cert public.payment_provider_certifications%ROWTYPE; v_enable boolean; v_visible boolean;
BEGIN
  v_user:=private.require_staff_permission('settings','update');
  SELECT * INTO v_gateway FROM public.payment_gateway_methods WHERE id=p_gateway_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment gateway not found'; END IF;
  v_enable:=coalesce((p_patch->>'is_enabled')::boolean,v_gateway.is_enabled);
  v_visible:=coalesce((p_patch->>'customer_visible')::boolean,v_gateway.customer_visible);
  IF v_enable AND v_visible AND v_gateway.payment_method IN ('mpesa','card') THEN
    SELECT * INTO v_cert FROM public.payment_provider_certifications WHERE gateway_key=v_gateway.gateway_key AND environment='production' AND status='certified' ORDER BY certified_at DESC LIMIT 1;
    IF NOT FOUND OR (v_cert.expires_at IS NOT NULL AND v_cert.expires_at<=now()) THEN RAISE EXCEPTION 'Production certification is required before enabling this payment gateway for customers'; END IF;
  END IF;
  UPDATE public.payment_gateway_methods SET
    display_name=coalesce(nullif(trim(p_patch->>'display_name'),''),display_name),
    customer_description=CASE WHEN p_patch ? 'customer_description' THEN nullif(trim(p_patch->>'customer_description'),'') ELSE customer_description END,
    icon_key=CASE WHEN p_patch ? 'icon_key' THEN nullif(trim(p_patch->>'icon_key'),'') ELSE icon_key END,
    is_enabled=v_enable,customer_visible=v_visible,
    supports_checkout=coalesce((p_patch->>'supports_checkout')::boolean,supports_checkout),
    supports_orders=coalesce((p_patch->>'supports_orders')::boolean,supports_orders),
    supports_invoices=coalesce((p_patch->>'supports_invoices')::boolean,supports_invoices),
    requires_customer_phone=coalesce((p_patch->>'requires_customer_phone')::boolean,requires_customer_phone),
    sort_order=coalesce((p_patch->>'sort_order')::integer,sort_order),
    public_config=CASE WHEN p_patch ? 'public_config' THEN coalesce(p_patch->'public_config','{}'::jsonb) ELSE public_config END,
    updated_at=now()
  WHERE id=p_gateway_id;
  RETURN jsonb_build_object('success',true,'gateway_id',p_gateway_id,'saved_by',v_user,'release_gate',public.get_payment_provider_release_gate_360(v_gateway.gateway_key));
END;$function$;
REVOKE ALL ON FUNCTION public.save_payment_gateway_control_360(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_payment_gateway_control_360(uuid,jsonb) TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.payment_gateway_methods FROM authenticated;
COMMENT ON TABLE public.payment_provider_certifications IS 'Provider UAT and production certification evidence. Secret values are never stored here.';

CREATE OR REPLACE FUNCTION public.expire_stale_payment_attempts_360(p_age_minutes integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
DECLARE v_count integer;
BEGIN
  IF p_age_minutes < 1 OR p_age_minutes > 1440 THEN RAISE EXCEPTION 'Invalid expiry window'; END IF;
  UPDATE public.payment_attempts a
  SET status='expired',failure_reason='Payment attempt expired without a final provider result',updated_at=now()
  FROM public.payment_transactions t
  WHERE a.payment_transaction_id=t.id
    AND a.status IN ('initiated','pending')
    AND t.status='pending'
    AND a.created_at < now() - make_interval(mins => p_age_minutes);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  UPDATE public.payment_transactions t
  SET status='failed',failure_reason='Payment attempt expired without a final provider result',completed_at=now(),updated_at=now()
  WHERE t.status='pending'
    AND t.id IN (SELECT payment_transaction_id FROM public.payment_attempts WHERE status='expired' AND updated_at >= now() - interval '5 minutes');
  RETURN jsonb_build_object('success',true,'expired_attempts',v_count);
END;$function$;
REVOKE ALL ON FUNCTION public.expire_stale_payment_attempts_360(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_payment_attempts_360(integer) TO service_role;
