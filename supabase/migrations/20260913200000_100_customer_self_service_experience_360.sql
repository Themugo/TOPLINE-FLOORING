-- Customer Self-Service Experience 360
-- Secure, customer-bound preferences and document metadata access.

CREATE OR REPLACE FUNCTION public.get_customer_portal_preferences()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE cid uuid := public.get_current_customer_id();
BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Customer portal access is not available for this account'; END IF;
  RETURN jsonb_build_object(
    'customer_preferences', COALESCE((SELECT to_jsonb(cp) FROM public.customer_preferences cp WHERE cp.customer_id=cid), '{}'::jsonb),
    'notification_preferences', COALESCE((SELECT to_jsonb(np) FROM public.customer_notification_preferences np WHERE np.customer_id=cid), jsonb_build_object('customer_id',cid,'email_enabled',true,'sms_enabled',true,'whatsapp_enabled',true,'marketing_email_enabled',false,'marketing_sms_enabled',false))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_customer_notification_preferences(
  p_email_enabled boolean,
  p_sms_enabled boolean,
  p_whatsapp_enabled boolean,
  p_marketing_email_enabled boolean DEFAULT false,
  p_marketing_sms_enabled boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE cid uuid := public.get_current_customer_id(); v public.customer_notification_preferences;
BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Customer portal access is not available for this account'; END IF;
  INSERT INTO public.customer_notification_preferences(customer_id,email_enabled,sms_enabled,whatsapp_enabled,marketing_email_enabled,marketing_sms_enabled,updated_at)
  VALUES(cid,p_email_enabled,p_sms_enabled,p_whatsapp_enabled,coalesce(p_marketing_email_enabled,false),coalesce(p_marketing_sms_enabled,false),now())
  ON CONFLICT(customer_id) DO UPDATE SET
    email_enabled=EXCLUDED.email_enabled,
    sms_enabled=EXCLUDED.sms_enabled,
    whatsapp_enabled=EXCLUDED.whatsapp_enabled,
    marketing_email_enabled=EXCLUDED.marketing_email_enabled,
    marketing_sms_enabled=EXCLUDED.marketing_sms_enabled,
    updated_at=now()
  RETURNING * INTO v;
  RETURN to_jsonb(v);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_customer_portal_documents()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE cid uuid := public.get_current_customer_id();
BEGIN
  IF cid IS NULL THEN RAISE EXCEPTION 'Customer portal access is not available for this account'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id',d.id,'document_type',d.document_type,'document_name',d.document_name,
    'description',d.description,'created_at',d.created_at
  ) ORDER BY d.created_at DESC) FROM public.customer_documents d WHERE d.customer_id=cid),'[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_customer_portal_preferences() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_customer_notification_preferences(boolean,boolean,boolean,boolean,boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_customer_portal_documents() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_customer_portal_preferences() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_customer_notification_preferences(boolean,boolean,boolean,boolean,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_portal_documents() TO authenticated;

COMMENT ON FUNCTION public.get_customer_portal_preferences() IS 'Customer-bound portal preference view; identity resolved only through the authenticated customer portal mapping.';
COMMENT ON FUNCTION public.update_customer_notification_preferences(boolean,boolean,boolean,boolean,boolean) IS 'Customer-bound notification preference mutation; never accepts a customer id from the browser.';
COMMENT ON FUNCTION public.get_customer_portal_documents() IS 'Customer-bound document metadata view; file URLs are intentionally excluded from this RPC.';
