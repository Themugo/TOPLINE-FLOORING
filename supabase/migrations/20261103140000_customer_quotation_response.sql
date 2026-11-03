-- Pass 15: customers could view a quotation in the portal but had no way to answer it.
-- Server-enforced response: only the owning customer, only while the quote is open.
CREATE OR REPLACE FUNCTION public.respond_to_customer_quotation(
  p_quotation_id uuid,
  p_action text,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cid uuid := public.get_current_customer_id();
  v_q public.quotations%ROWTYPE;
  v_new text;
  v_note text := left(nullif(trim(coalesce(p_note, '')), ''), 1000);
BEGIN
  IF v_cid IS NULL THEN
    RAISE EXCEPTION 'Customer portal access is not available for this account';
  END IF;
  IF p_action NOT IN ('accept', 'decline', 'request_changes') THEN
    RAISE EXCEPTION 'Unknown quotation response';
  END IF;

  SELECT q.* INTO v_q
    FROM public.quotations q
   WHERE q.id = p_quotation_id
     AND (q.customer_id = v_cid
          OR (q.customer_id IS NULL AND lower(trim(q.email)) = lower(trim((SELECT c.email FROM public.customers c WHERE c.id = v_cid)))))
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation not found';
  END IF;

  IF v_q.status NOT IN ('quoted', 'sent', 'negotiating') THEN
    RAISE EXCEPTION 'This quotation is no longer open for a response (status: %)', v_q.status;
  END IF;
  IF p_action = 'accept' AND v_q.valid_until IS NOT NULL AND v_q.valid_until < current_date THEN
    RAISE EXCEPTION 'This quotation expired on %. Please request changes and we will refresh it.', v_q.valid_until;
  END IF;
  IF p_action IN ('decline', 'request_changes') AND v_note IS NULL THEN
    RAISE EXCEPTION 'Please tell us briefly why, so we can help';
  END IF;

  v_new := CASE p_action WHEN 'accept' THEN 'accepted' WHEN 'decline' THEN 'rejected' ELSE 'negotiating' END;

  UPDATE public.quotations
     SET status = v_new,
         responded_at = now(),
         message = CASE WHEN v_note IS NULL THEN message
                        ELSE coalesce(message, '') || E'\n\n[Customer response ' || to_char(now(), 'YYYY-MM-DD HH24:MI') || ' – ' || p_action || '] ' || v_note END
   WHERE id = v_q.id;

  RETURN jsonb_build_object('id', v_q.id, 'status', v_new);
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_customer_quotation(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_customer_quotation(uuid, text, text) TO authenticated;
COMMENT ON FUNCTION public.respond_to_customer_quotation(uuid, text, text) IS 'Owning customer accepts, declines or asks for changes on an open quotation; status moves to accepted/rejected/negotiating and the team sees it in the admin pipeline.';
