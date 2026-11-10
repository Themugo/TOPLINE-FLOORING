-- G-20 privacy request handling: persist identity-verification evidence and
-- prevent a request from being marked completed before verification.
BEGIN;

ALTER TABLE public.data_subject_requests
  ADD COLUMN IF NOT EXISTS identity_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS identity_verification_reference text;

ALTER TABLE public.data_subject_requests
  DROP CONSTRAINT IF EXISTS data_subject_request_identity_evidence_check;
ALTER TABLE public.data_subject_requests
  ADD CONSTRAINT data_subject_request_identity_evidence_check
  CHECK (
    (identity_verified_at IS NULL AND identity_verification_reference IS NULL)
    OR
    (identity_verified_at IS NOT NULL AND length(trim(identity_verification_reference)) BETWEEN 3 AND 500)
  );

CREATE OR REPLACE FUNCTION public.verify_data_subject_request(
  p_request_id uuid,
  p_identity_verification_reference text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user uuid := private.require_staff_permission('customers','update');
  v_reference text := NULLIF(trim(coalesce(p_identity_verification_reference,'')), '');
BEGIN
  IF v_reference IS NULL OR length(v_reference) < 3 OR length(v_reference) > 500 THEN
    RAISE EXCEPTION 'A valid identity-verification evidence reference (3-500 characters) is required';
  END IF;

  UPDATE public.data_subject_requests
     SET status = 'verifying',
         identity_verified_at = now(),
         identity_verification_reference = v_reference,
         updated_at = now()
   WHERE id = p_request_id
     AND status IN ('received','verifying','in_progress')
     AND identity_verified_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Open, not-yet-verified data-subject request not found';
  END IF;

  RETURN jsonb_build_object(
    'id', p_request_id,
    'status', 'verifying',
    'identity_verified', true,
    'verified_at', now(),
    'verified_by', v_user
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_data_subject_request(
  p_request_id uuid, p_status text, p_resolution text, p_evidence_reference text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user uuid := private.require_staff_permission('customers','update');
  v_evidence text := NULLIF(trim(coalesce(p_evidence_reference,'')), '');
  v_identity_verified_at timestamptz;
BEGIN
  IF p_status NOT IN ('completed','rejected','cancelled') THEN
    RAISE EXCEPTION 'Completion status required';
  END IF;
  IF length(trim(coalesce(p_resolution,''))) < 5 THEN
    RAISE EXCEPTION 'Resolution is required';
  END IF;
  IF v_evidence IS NULL OR length(v_evidence) < 3 OR length(v_evidence) > 500 THEN
    RAISE EXCEPTION 'A valid evidence reference (3-500 characters) is required before closure';
  END IF;

  SELECT identity_verified_at INTO v_identity_verified_at
    FROM public.data_subject_requests
   WHERE id = p_request_id
     AND status NOT IN ('completed','rejected','cancelled')
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Open data-subject request not found';
  END IF;
  IF p_status = 'completed' AND v_identity_verified_at IS NULL THEN
    RAISE EXCEPTION 'Identity verification is required before completing a data-subject request';
  END IF;

  UPDATE public.data_subject_requests
     SET status = p_status,
         resolution = trim(p_resolution),
         evidence_reference = v_evidence,
         completed_at = now(),
         updated_at = now()
   WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'id', p_request_id, 'status', p_status,
    'completed_at', now(), 'updated_by', v_user,
    'evidence_recorded', true,
    'identity_verified', v_identity_verified_at IS NOT NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_data_subject_request(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_data_subject_request(uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION public.complete_data_subject_request(uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_data_subject_request(uuid,text,text,text) TO authenticated;

COMMENT ON COLUMN public.data_subject_requests.identity_verification_reference IS
  'Reference to a protected identity-verification record; do not store identity documents or personal data in this field.';
COMMENT ON FUNCTION public.verify_data_subject_request(uuid,text) IS
  'Records staff-confirmed identity verification evidence for an open data-subject request; does not itself disclose, correct, restrict or erase customer data.';
COMMENT ON FUNCTION public.complete_data_subject_request(uuid,text,text,text) IS
  'Closes an open data-subject request with resolution and evidence; successful completion requires prior identity verification; does not itself execute data export, correction, restriction or erasure.';

CREATE OR REPLACE FUNCTION public.get_data_governance_360()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, private AS $$
DECLARE
  v_user uuid := private.require_staff_permission('reports','select');
  v_metrics jsonb;
  v_policies jsonb;
  v_requests jsonb;
  v_reviews jsonb;
BEGIN
  SELECT jsonb_build_object(
    'policies',count(*),
    'restricted',count(*) FILTER (WHERE classification='restricted'),
    'needs_review',count(*) FILTER (WHERE status='needs_review' OR (next_review_at IS NOT NULL AND next_review_at < now())),
    'overdue_requests',(SELECT count(*) FROM public.data_subject_requests dr WHERE dr.status NOT IN ('completed','rejected','cancelled') AND dr.due_at < now()),
    'open_requests',(SELECT count(*) FROM public.data_subject_requests dr WHERE dr.status NOT IN ('completed','rejected','cancelled')),
    'overdue_access_reviews',(SELECT count(*) FROM public.access_reviews ar WHERE ar.status='pending' AND ar.review_due_at < now()),
    'completed_access_reviews_90d',(SELECT count(*) FROM public.access_reviews ar WHERE ar.status <> 'pending' AND ar.completed_at >= now()-interval '90 days')
  ) INTO v_metrics FROM public.data_governance_policies;

  SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'domain',p.domain,'classification',p.classification,'title',p.title,'owner_id',p.owner_id,'retention_days',p.retention_days,'status',p.status,'next_review_at',p.next_review_at) ORDER BY CASE p.classification WHEN 'restricted' THEN 1 WHEN 'confidential' THEN 2 WHEN 'internal' THEN 3 ELSE 4 END,p.next_review_at NULLS LAST,p.title),'[]'::jsonb)
    INTO v_policies FROM public.data_governance_policies p WHERE p.status <> 'retired';

  SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'customer_id',r.customer_id,'request_type',r.request_type,'status',r.status,'received_at',r.received_at,'due_at',r.due_at,'completed_at',r.completed_at,'resolution',r.resolution,'identity_verified_at',r.identity_verified_at) ORDER BY r.due_at),'[]'::jsonb)
    INTO v_requests FROM public.data_subject_requests r WHERE r.status NOT IN ('completed','rejected','cancelled');

  SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'reviewed_user_id',a.reviewed_user_id,'review_due_at',a.review_due_at,'status',a.status,'completed_at',a.completed_at,'findings',a.findings) ORDER BY a.review_due_at),'[]'::jsonb)
    INTO v_reviews FROM public.access_reviews a WHERE a.status='pending';

  RETURN jsonb_build_object('generated_at',now(),'viewer',v_user,'metrics',v_metrics,'policies',v_policies,'open_requests',v_requests,'pending_access_reviews',v_reviews);
END;
$$;

REVOKE ALL ON FUNCTION public.get_data_governance_360() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_data_governance_360() TO authenticated;
COMMENT ON FUNCTION public.get_data_governance_360() IS
  'Staff-only governance snapshot; exposes identity-verification timestamp but not the protected evidence reference.';
COMMIT;
