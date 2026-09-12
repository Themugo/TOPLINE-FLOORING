-- Operation 12 — Data Governance, Privacy & Access Governance 360
-- Controlled data ownership, retention policy, data-subject request tracking and periodic access review.

CREATE TABLE IF NOT EXISTS public.data_governance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL CHECK (domain IN ('customers','orders','finance','projects','inventory','communications','staff','content','system','other')),
  classification text NOT NULL CHECK (classification IN ('public','internal','confidential','restricted')),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 3 AND 180),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  retention_days integer NOT NULL CHECK (retention_days > 0),
  legal_basis text,
  handling_requirements text NOT NULL CHECK (length(trim(handling_requirements)) >= 10),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','needs_review','retired')),
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.data_subject_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  request_type text NOT NULL CHECK (request_type IN ('access','correction','deletion','restriction','portability','objection')),
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','verifying','in_progress','completed','rejected','cancelled')),
  received_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz NOT NULL,
  completed_at timestamptz,
  resolution text,
  evidence_reference text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status IN ('completed','rejected','cancelled') AND completed_at IS NOT NULL) OR status IN ('received','verifying','in_progress'))
);

CREATE TABLE IF NOT EXISTS public.access_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewed_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  review_due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','changes_required','revoked')),
  role_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  findings text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status <> 'pending' AND completed_at IS NOT NULL) OR status = 'pending')
);

CREATE INDEX IF NOT EXISTS idx_data_governance_policy_review ON public.data_governance_policies(status,next_review_at);
CREATE INDEX IF NOT EXISTS idx_data_subject_requests_due ON public.data_subject_requests(status,due_at);
CREATE INDEX IF NOT EXISTS idx_access_reviews_due ON public.access_reviews(status,review_due_at);
CREATE INDEX IF NOT EXISTS idx_access_reviews_user ON public.access_reviews(reviewed_user_id,created_at DESC);

ALTER TABLE public.data_governance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.data_governance_policies FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.data_subject_requests FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.access_reviews FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_data_governance_policy(
  p_domain text, p_classification text, p_title text, p_owner_id uuid,
  p_retention_days integer, p_legal_basis text, p_handling_requirements text,
  p_next_review_at timestamptz DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid := private.require_staff_permission('settings','update'); v_id uuid;
BEGIN
  IF p_domain NOT IN ('customers','orders','finance','projects','inventory','communications','staff','content','system','other') THEN RAISE EXCEPTION 'Invalid governance domain'; END IF;
  IF p_classification NOT IN ('public','internal','confidential','restricted') THEN RAISE EXCEPTION 'Invalid classification'; END IF;
  IF length(trim(coalesce(p_title,''))) < 3 THEN RAISE EXCEPTION 'Policy title is required'; END IF;
  IF p_retention_days IS NULL OR p_retention_days <= 0 THEN RAISE EXCEPTION 'Retention period must be positive'; END IF;
  IF length(trim(coalesce(p_handling_requirements,''))) < 10 THEN RAISE EXCEPTION 'Handling requirements are required'; END IF;
  INSERT INTO public.data_governance_policies(domain,classification,title,owner_id,retention_days,legal_basis,handling_requirements,next_review_at,last_reviewed_at,status,created_by)
  VALUES(p_domain,p_classification,trim(p_title),p_owner_id,p_retention_days,NULLIF(trim(p_legal_basis),''),trim(p_handling_requirements),p_next_review_at,now(),'active',v_user) RETURNING id INTO v_id;
  RETURN jsonb_build_object('id',v_id,'status','active');
END; $$;

CREATE OR REPLACE FUNCTION public.create_data_subject_request(
  p_customer_id uuid, p_request_type text, p_due_at timestamptz
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid := private.require_staff_permission('customers','insert'); v_id uuid;
BEGIN
  IF p_request_type NOT IN ('access','correction','deletion','restriction','portability','objection') THEN RAISE EXCEPTION 'Invalid data-subject request type'; END IF;
  IF p_due_at IS NULL OR p_due_at < now() THEN RAISE EXCEPTION 'Due date must be in the future'; END IF;
  IF p_customer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.customers WHERE id=p_customer_id) THEN RAISE EXCEPTION 'Customer not found'; END IF;
  INSERT INTO public.data_subject_requests(customer_id,request_type,due_at,created_by) VALUES(p_customer_id,p_request_type,p_due_at,v_user) RETURNING id INTO v_id;
  RETURN jsonb_build_object('id',v_id,'status','received');
END; $$;

CREATE OR REPLACE FUNCTION public.complete_data_subject_request(
  p_request_id uuid, p_status text, p_resolution text, p_evidence_reference text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid := private.require_staff_permission('customers','update');
BEGIN
  IF p_status NOT IN ('completed','rejected','cancelled') THEN RAISE EXCEPTION 'Completion status required'; END IF;
  IF length(trim(coalesce(p_resolution,''))) < 5 THEN RAISE EXCEPTION 'Resolution is required'; END IF;
  UPDATE public.data_subject_requests SET status=p_status,resolution=trim(p_resolution),evidence_reference=NULLIF(trim(p_evidence_reference),''),completed_at=now(),updated_at=now() WHERE id=p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Data-subject request not found'; END IF;
  RETURN jsonb_build_object('id',p_request_id,'status',p_status,'completed_at',now(),'updated_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.record_access_review(
  p_reviewed_user_id uuid, p_review_due_at timestamptz, p_status text DEFAULT 'approved', p_role_snapshot jsonb DEFAULT '[]'::jsonb, p_findings text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid := private.require_staff_permission('staff','update'); v_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff_profiles WHERE user_id=p_reviewed_user_id) THEN RAISE EXCEPTION 'Staff member not found'; END IF;
  IF p_status NOT IN ('pending','approved','changes_required','revoked') THEN RAISE EXCEPTION 'Invalid access review status'; END IF;
  IF p_review_due_at IS NULL THEN RAISE EXCEPTION 'Review due date is required'; END IF;
  INSERT INTO public.access_reviews(reviewed_user_id,reviewer_id,review_due_at,status,role_snapshot,findings,completed_at)
  VALUES(p_reviewed_user_id,v_user,p_review_due_at,p_status,coalesce(p_role_snapshot,'[]'::jsonb),NULLIF(trim(p_findings),''),CASE WHEN p_status='pending' THEN NULL ELSE now() END) RETURNING id INTO v_id;
  RETURN jsonb_build_object('id',v_id,'status',p_status);
END; $$;

CREATE OR REPLACE FUNCTION public.get_data_governance_360()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path=public,private AS $$
DECLARE v_user uuid := private.require_staff_permission('reports','select'); v_metrics jsonb; v_policies jsonb; v_requests jsonb; v_reviews jsonb;
BEGIN
  SELECT jsonb_build_object(
    'policies',count(*),
    'restricted',count(*) FILTER (WHERE classification='restricted'),
    'needs_review',count(*) FILTER (WHERE status='needs_review' OR (next_review_at IS NOT NULL AND next_review_at < now())),
    'overdue_requests',count(*) FILTER (WHERE status NOT IN ('completed','rejected','cancelled') AND due_at < now()),
    'open_requests',count(*) FILTER (WHERE status NOT IN ('completed','rejected','cancelled')),
    'overdue_access_reviews',(SELECT count(*) FROM public.access_reviews ar WHERE ar.status='pending' AND ar.review_due_at < now()),
    'completed_access_reviews_90d',(SELECT count(*) FROM public.access_reviews ar WHERE ar.status <> 'pending' AND ar.completed_at >= now()-interval '90 days')
  ) INTO v_metrics FROM public.data_governance_policies;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'domain',p.domain,'classification',p.classification,'title',p.title,'owner_id',p.owner_id,'retention_days',p.retention_days,'status',p.status,'next_review_at',p.next_review_at) ORDER BY CASE p.classification WHEN 'restricted' THEN 1 WHEN 'confidential' THEN 2 WHEN 'internal' THEN 3 ELSE 4 END,p.next_review_at NULLS LAST,p.title),'[]'::jsonb) INTO v_policies FROM public.data_governance_policies p WHERE p.status <> 'retired';
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'customer_id',r.customer_id,'request_type',r.request_type,'status',r.status,'received_at',r.received_at,'due_at',r.due_at,'completed_at',r.completed_at,'resolution',r.resolution) ORDER BY r.due_at),'[]'::jsonb) INTO v_requests FROM public.data_subject_requests r WHERE r.status NOT IN ('completed','rejected','cancelled');
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'reviewed_user_id',a.reviewed_user_id,'review_due_at',a.review_due_at,'status',a.status,'completed_at',a.completed_at,'findings',a.findings) ORDER BY a.review_due_at),'[]'::jsonb) INTO v_reviews FROM public.access_reviews a WHERE a.status='pending';
  RETURN jsonb_build_object('generated_at',now(),'viewer',v_user,'metrics',v_metrics,'policies',v_policies,'open_requests',v_requests,'pending_access_reviews',v_reviews);
END; $$;

REVOKE ALL ON FUNCTION public.create_data_governance_policy(text,text,text,uuid,integer,text,text,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_data_governance_policy(text,text,text,uuid,integer,text,text,timestamptz) TO authenticated;
REVOKE ALL ON FUNCTION public.create_data_subject_request(uuid,text,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_data_subject_request(uuid,text,timestamptz) TO authenticated;
REVOKE ALL ON FUNCTION public.complete_data_subject_request(uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_data_subject_request(uuid,text,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.record_access_review(uuid,timestamptz,text,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_access_review(uuid,timestamptz,text,jsonb,text) TO authenticated;
REVOKE ALL ON FUNCTION public.get_data_governance_360() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_data_governance_360() TO authenticated;

COMMENT ON TABLE public.data_governance_policies IS 'Application-owned data classification, retention and handling controls; does not itself execute provider deletion or backup policies.';
COMMENT ON TABLE public.data_subject_requests IS 'Controlled staff workflow for customer data-subject requests and evidence.';
COMMENT ON TABLE public.access_reviews IS 'Periodic staff access review evidence; does not grant or revoke roles by itself.';
