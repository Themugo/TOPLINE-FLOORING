-- Communications COMM-07 through COMM-09
-- Customer communication experience, Admin Communication Center 360, and Customer 360 communications.

-- COMM-09: customer-safe communication history. The browser never supplies a customer_id.
CREATE OR REPLACE FUNCTION public.get_customer_communications_self_service_360()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,private AS $$
DECLARE
  cid uuid := public.get_current_customer_id();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF cid IS NULL THEN RAISE EXCEPTION 'Customer portal account is not linked'; END IF;
  RETURN jsonb_build_object(
    'customer_id', cid,
    'timeline', COALESCE((
      SELECT jsonb_agg(x ORDER BY x.created_at DESC)
      FROM (
        SELECT c.id,c.channel,c.direction,c.subject,c.message,c.status,c.external_reference,c.created_at
        FROM public.customer_communications c WHERE c.customer_id=cid
        UNION ALL
        SELECT o.id,o.channel,'outbound'::text,o.subject,o.message,
               COALESCE(o.delivery_status,o.status),o.provider_reference,o.created_at
        FROM public.communication_outbox o
        WHERE o.customer_id=cid
          AND NOT EXISTS (SELECT 1 FROM public.customer_communications cc WHERE cc.external_reference=o.provider_message_id AND cc.customer_id=cid)
      ) x
    ),'[]'::jsonb)
  );
END; $$;
REVOKE ALL ON FUNCTION public.get_customer_communications_self_service_360() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_customer_communications_self_service_360() TO authenticated;

-- COMM-08: staff-facing control-plane RPC. Keep sensitive communication reads behind staff permission
-- rather than relying on broad browser table reads for the operational view.
CREATE OR REPLACE FUNCTION public.get_communications_center_360(
  p_days integer DEFAULT 30,
  p_channel text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_days integer:=greatest(1,least(coalesce(p_days,30),365));
BEGIN
  PERFORM private.require_staff_permission('customers','read');
  RETURN jsonb_build_object(
    'period_days',v_days,
    'outbound',COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC) FROM (
      SELECT o.id,o.customer_id,c.name customer_name,o.channel,o.recipient,o.subject,o.message,o.status,o.delivery_status,
             o.provider,o.provider_reference,o.provider_message_id,o.last_provider_event,o.error_message,o.attempt_count,o.created_at,o.sent_at
      FROM public.communication_outbox o LEFT JOIN public.customers c ON c.id=o.customer_id
      WHERE o.created_at >= now()-make_interval(days=>v_days)
        AND (p_channel IS NULL OR o.channel=p_channel)
        AND (p_status IS NULL OR o.status=p_status OR o.delivery_status=p_status)
        AND (p_customer_id IS NULL OR o.customer_id=p_customer_id)
      LIMIT 200
    ) x),'[]'::jsonb),
    'inbound',COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.received_at DESC) FROM (
      SELECT i.id,i.customer_id,c.name customer_name,i.channel,i.sender,i.subject,i.message,i.provider,
             i.match_status,i.match_reason,i.received_at,i.processed_at
      FROM public.communication_inbound i LEFT JOIN public.customers c ON c.id=i.customer_id
      WHERE i.received_at >= now()-make_interval(days=>v_days)
        AND (p_channel IS NULL OR i.channel=p_channel)
        AND (p_customer_id IS NULL OR i.customer_id=p_customer_id)
      LIMIT 200
    ) x),'[]'::jsonb),
    'customers',COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.name) FROM (
      SELECT id,name,email,phone FROM public.customers ORDER BY name LIMIT 500
    ) x),'[]'::jsonb)
  );
END; $$;
REVOKE ALL ON FUNCTION public.get_communications_center_360(integer,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_communications_center_360(integer,text,text,uuid) TO authenticated;

COMMENT ON FUNCTION public.get_customer_communications_self_service_360() IS 'Customer-bound communications timeline. Customer identity is resolved server-side from authenticated portal mapping.';
COMMENT ON FUNCTION public.get_communications_center_360(integer,text,text,uuid) IS 'Staff communications control-plane read model with customer names, provider state and inbound match status.';
