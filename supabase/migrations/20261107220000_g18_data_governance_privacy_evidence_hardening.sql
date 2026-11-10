-- G-18 Data Governance & Privacy: close evidence and access-review integrity gaps.
-- Safe additive hardening; does not execute erasure or alter customer/provider data.
BEGIN;

CREATE OR REPLACE FUNCTION public.complete_data_subject_request(
  p_request_id uuid, p_status text, p_resolution text, p_evidence_reference text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user uuid := private.require_staff_permission('customers','update');
  v_evidence text := NULLIF(trim(coalesce(p_evidence_reference,'')), '');
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

  UPDATE public.data_subject_requests
     SET status = p_status,
         resolution = trim(p_resolution),
         evidence_reference = v_evidence,
         completed_at = now(),
         updated_at = now()
   WHERE id = p_request_id
     AND status NOT IN ('completed','rejected','cancelled');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Open data-subject request not found';
  END IF;
  RETURN jsonb_build_object(
    'id', p_request_id, 'status', p_status,
    'completed_at', now(), 'updated_by', v_user,
    'evidence_recorded', true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_access_review(
  p_reviewed_user_id uuid,
  p_review_due_at timestamptz,
  p_status text DEFAULT 'pending',
  p_role_snapshot jsonb DEFAULT '[]'::jsonb,
  p_findings text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user uuid := private.require_staff_permission('staff','update');
  v_id uuid;
  v_snapshot jsonb := coalesce(p_role_snapshot, '[]'::jsonb);
  v_findings text := NULLIF(trim(coalesce(p_findings,'')), '');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff_profiles WHERE user_id = p_reviewed_user_id) THEN
    RAISE EXCEPTION 'Staff member not found';
  END IF;
  IF p_reviewed_user_id = v_user THEN
    RAISE EXCEPTION 'Independent access review is required; reviewers cannot review themselves';
  END IF;
  IF p_status NOT IN ('pending','approved','changes_required','revoked') THEN
    RAISE EXCEPTION 'Invalid access review status';
  END IF;
  IF p_review_due_at IS NULL OR p_review_due_at < now() THEN
    RAISE EXCEPTION 'Review due date must not be in the past';
  END IF;
  IF jsonb_typeof(v_snapshot) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Role snapshot must be a JSON array';
  END IF;
  IF jsonb_array_length(v_snapshot) > 100 THEN
    RAISE EXCEPTION 'Role snapshot must contain at most 100 entries';
  END IF;
  IF p_status <> 'pending' AND jsonb_array_length(v_snapshot) = 0 THEN
    RAISE EXCEPTION 'A role snapshot is required to complete an access review';
  END IF;
  IF p_status IN ('changes_required','revoked') AND v_findings IS NULL THEN
    RAISE EXCEPTION 'Findings are required when access changes or revocation are required';
  END IF;

  INSERT INTO public.access_reviews(
    reviewed_user_id, reviewer_id, review_due_at, status,
    role_snapshot, findings, completed_at
  )
  VALUES (
    p_reviewed_user_id, v_user, p_review_due_at, p_status,
    v_snapshot, v_findings,
    CASE WHEN p_status = 'pending' THEN NULL ELSE now() END
  )
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('id',v_id,'status',p_status,'reviewer_id',v_user);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_data_subject_request(uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_data_subject_request(uuid,text,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.record_access_review(uuid,timestamptz,text,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_access_review(uuid,timestamptz,text,jsonb,text) TO authenticated;

COMMENT ON FUNCTION public.complete_data_subject_request(uuid,text,text,text)
IS 'Closes an open data-subject request only with an explicit outcome and durable evidence reference; does not itself erase or export data.';
COMMENT ON FUNCTION public.record_access_review(uuid,timestamptz,text,jsonb,text)
IS 'Records an independently reviewed staff access snapshot; does not itself change roles or permissions.';

COMMIT;
