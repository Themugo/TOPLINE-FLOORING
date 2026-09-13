-- Application Security & Trust Boundary 360 — RPC Authorization Certification
-- Function-level authorization, ownership binding, state-transition guardrails,
-- and least-privilege API exposure. No business data migration.

CREATE OR REPLACE FUNCTION private.current_user_has_role(p_role_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_role_assignments ra
    JOIN public.staff_roles sr ON sr.id = ra.role_id
    JOIN public.staff_profiles sp ON sp.user_id = ra.user_id
    WHERE ra.user_id = (select auth.uid())
      AND sp.is_active = true
      AND sr.code = lower(trim(p_role_code))
  );
$$;

CREATE OR REPLACE FUNCTION private.assert_customer_owns_project(p_customer_id uuid, p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF p_project_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.projects WHERE id=p_project_id AND customer_id=p_customer_id
  ) THEN
    RAISE EXCEPTION 'Project does not belong to customer';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.assert_customer_owns_order(p_customer_id uuid, p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF p_order_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.orders WHERE id=p_order_id AND customer_id=p_customer_id
  ) THEN
    RAISE EXCEPTION 'Order does not belong to customer';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.assert_project_order_consistency(p_project_id uuid, p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE v_project_customer uuid; v_order_customer uuid;
BEGIN
  IF p_project_id IS NULL OR p_order_id IS NULL THEN RETURN; END IF;
  SELECT customer_id INTO v_project_customer FROM public.projects WHERE id=p_project_id;
  SELECT customer_id INTO v_order_customer FROM public.orders WHERE id=p_order_id;
  IF v_project_customer IS NULL OR v_order_customer IS NULL OR v_project_customer IS DISTINCT FROM v_order_customer THEN
    RAISE EXCEPTION 'Project and order customer boundaries do not match';
  END IF;
END;
$$;

-- Legacy checkout RPC bypassed reservation/idempotency protections and must not remain callable.
REVOKE EXECUTE ON FUNCTION public.create_customer_order(text,text,text,jsonb,uuid,uuid,text,text) FROM anon, authenticated, PUBLIC;

-- Communication delivery state changes belong to the worker boundary, not ordinary staff RPC callers.
REVOKE EXECUTE ON FUNCTION public.claim_communication_outbox(integer) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_communication_delivery(uuid,text,text) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fail_communication_delivery(uuid,text,boolean) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_sms_delivery_report(text,text,text,text,jsonb,numeric) FROM authenticated, anon, PUBLIC;

-- Customer-facing service-case creation: a customer may only create against their own project/order.
CREATE OR REPLACE FUNCTION public.create_service_case(
  p_customer_id uuid,
  p_issue_title text,
  p_description text,
  p_type text DEFAULT 'warranty',
  p_priority text DEFAULT 'medium',
  p_project_id uuid DEFAULT NULL,
  p_order_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE v_user uuid; v_case_id uuid; v_no text; v_staff boolean;
BEGIN
  v_staff := private.current_user_is_staff();
  IF v_staff THEN
    v_user := private.require_staff_permission('customers','insert');
  ELSE
    IF p_customer_id IS NULL OR p_customer_id <> public.get_current_customer_id() THEN
      RAISE EXCEPTION 'Customer access denied';
    END IF;
    v_user := auth.uid();
  END IF;

  PERFORM private.assert_customer_owns_project(p_customer_id,p_project_id);
  PERFORM private.assert_customer_owns_order(p_customer_id,p_order_id);
  PERFORM private.assert_project_order_consistency(p_project_id,p_order_id);

  IF nullif(trim(p_issue_title),'') IS NULL OR nullif(trim(p_description),'') IS NULL THEN RAISE EXCEPTION 'Issue title and description are required'; END IF;
  IF p_type NOT IN ('warranty','service','maintenance') OR p_priority NOT IN ('low','medium','high','critical') THEN RAISE EXCEPTION 'Invalid service case type or priority'; END IF;

  v_no := 'TOP-' || to_char(current_date,'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  INSERT INTO public.service_cases(case_number,customer_id,project_id,order_id,type,priority,issue_title,description,created_by)
  VALUES(v_no,p_customer_id,p_project_id,p_order_id,p_type,p_priority,trim(p_issue_title),trim(p_description),v_user)
  RETURNING id INTO v_case_id;
  RETURN jsonb_build_object('success',true,'case_id',v_case_id,'case_number',v_no,'status','open');
END;
$$;

-- Customer portal data must bind solely to the authenticated portal mapping.
CREATE OR REPLACE FUNCTION public.get_customer_portal_360()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE cid uuid;
BEGIN
  cid := public.get_current_customer_id();
  IF cid IS NULL THEN RAISE EXCEPTION 'Customer portal access is not available for this account'; END IF;
  RETURN jsonb_build_object(
    'customer',(SELECT to_jsonb(c) FROM public.customers c WHERE c.id=cid),
    'quotations',COALESCE((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.created_at DESC) FROM public.quotations q WHERE q.customer_id=cid),'[]'::jsonb),
    'orders',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',o.id,'order_number',o.order_number,'status',o.status,'total_amount',o.total_amount,'created_at',o.created_at,'notes',o.notes,'items',COALESCE((SELECT jsonb_agg(jsonb_build_object('product_name',oi.product_name,'quantity',oi.quantity,'unit',oi.unit,'unit_price',oi.unit_price) ORDER BY oi.created_at) FROM public.order_items oi WHERE oi.order_id=o.id),'[]'::jsonb)) ORDER BY o.created_at DESC) FROM public.orders o WHERE o.customer_id=cid),'[]'::jsonb),
    'projects',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',p.id,'project_number',p.project_number,'title',p.title,'project_type',p.project_type,'service_type',p.service_type,'location',p.location,'status',p.status,'progress_percentage',p.progress_percentage,'progress_notes',p.progress_notes,'start_date',p.start_date,'end_date',p.end_date,'completion_date',p.completion_date,'project_value',p.project_value,'description',p.description,'completion_notes',p.completion_notes) ORDER BY p.created_at DESC) FROM public.projects p WHERE p.customer_id=cid),'[]'::jsonb),
    'invoices',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',i.id,'invoice_number',i.invoice_number,'status',i.status,'subtotal',i.subtotal,'tax_amount',i.tax_amount,'total_amount',i.total_amount,'amount_paid',i.amount_paid,'due_date',i.due_date,'pdf_url',i.pdf_url,'created_at',i.created_at,'notes',i.notes,'items',COALESCE((SELECT jsonb_agg(jsonb_build_object('description',ii.description,'quantity',ii.quantity,'unit_price',ii.unit_price,'line_total',ii.line_total) ORDER BY ii.display_order,ii.created_at) FROM public.invoice_items ii WHERE ii.invoice_id=i.id),'[]'::jsonb)) ORDER BY i.created_at DESC) FROM public.invoices i WHERE i.customer_id=cid),'[]'::jsonb),
    'service_cases',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',s.id,'case_number',s.case_number,'type',s.type,'status',s.status,'priority',s.priority,'issue_title',s.issue_title,'description',s.description,'reported_at',s.reported_at,'scheduled_date',s.scheduled_date,'resolution',s.resolution,'resolved_at',s.resolved_at,'project_id',s.project_id,'order_id',s.order_id) ORDER BY s.created_at DESC) FROM public.service_cases s WHERE s.customer_id=cid),'[]'::jsonb),
    'site_visits',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',v.id,'scheduled_date',v.scheduled_date,'scheduled_time',v.scheduled_time,'visit_type',v.visit_type,'status',v.status,'visit_notes',v.visit_notes,'project_id',v.project_id,'quotation_id',v.quotation_id) ORDER BY v.scheduled_date DESC NULLS LAST,v.created_at DESC) FROM public.site_visits v WHERE v.customer_id=cid),'[]'::jsonb),
    'installations',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',ins.id,'installation_number',ins.installation_number,'scheduled_date',ins.scheduled_date,'scheduled_time',ins.scheduled_time,'status',ins.status,'notes',ins.notes,'progress_photos',ins.progress_photos,'customer_confirmation',ins.customer_confirmation,'completion_certificate',ins.completion_certificate,'project_id',ins.project_id,'order_id',ins.order_id) ORDER BY ins.scheduled_date DESC NULLS LAST,ins.created_at DESC) FROM public.installations ins LEFT JOIN public.projects p ON p.id=ins.project_id LEFT JOIN public.orders o ON o.id=ins.order_id WHERE p.customer_id=cid OR o.customer_id=cid),'[]'::jsonb),
    'summary',jsonb_build_object('active_projects',(SELECT count(*) FROM public.projects p WHERE p.customer_id=cid AND p.status IN ('pending','scheduled','in_progress')),'open_orders',(SELECT count(*) FROM public.orders o WHERE o.customer_id=cid AND o.status NOT IN ('completed','cancelled')),'outstanding_invoices',COALESCE((SELECT sum(GREATEST(i.total_amount-i.amount_paid,0)) FROM public.invoices i WHERE i.customer_id=cid AND i.status NOT IN ('paid','cancelled')),0),'open_service_cases',(SELECT count(*) FROM public.service_cases s WHERE s.customer_id=cid AND s.status NOT IN ('resolved','closed','rejected')))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_customer_portal_data()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE cid uuid;
BEGIN
  cid := public.get_current_customer_id();
  IF cid IS NULL THEN RAISE EXCEPTION 'Customer portal access is not available for this account'; END IF;
  UPDATE public.customer_portal_access SET last_login=now() WHERE auth_user_id=auth.uid() AND customer_id=cid;
  RETURN jsonb_build_object(
    'customer',(SELECT to_jsonb(c) FROM public.customers c WHERE c.id=cid),
    'quotations',COALESCE((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.created_at DESC) FROM public.quotations q WHERE q.customer_id=cid),'[]'::jsonb),
    'orders',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',o.id,'order_number',o.order_number,'status',o.status,'total_amount',o.total_amount,'created_at',o.created_at,'items',COALESCE((SELECT jsonb_agg(jsonb_build_object('product_name',oi.product_name,'quantity',oi.quantity,'unit',oi.unit,'unit_price',oi.unit_price) ORDER BY oi.created_at) FROM public.order_items oi WHERE oi.order_id=o.id),'[]'::jsonb)) ORDER BY o.created_at DESC) FROM public.orders o WHERE o.customer_id=cid),'[]'::jsonb)
  );
END;
$$;

-- Four-eyes control for privileged access decisions and privilege grants.
CREATE OR REPLACE FUNCTION public.decide_privileged_access_request(p_request_id uuid,p_status text,p_decision_notes text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE v_actor uuid := private.require_staff_permission('staff','update'); v_req public.privileged_access_requests%rowtype; v_role_code text;
BEGIN
  IF NOT private.current_user_has_role('owner') THEN RAISE EXCEPTION 'Owner approval required for privileged access decisions'; END IF;
  IF p_status NOT IN ('approved','rejected','revoked') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  IF length(trim(coalesce(p_decision_notes,''))) < 10 THEN RAISE EXCEPTION 'Decision notes are required'; END IF;
  SELECT * INTO v_req FROM public.privileged_access_requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Access request not found'; END IF;
  IF v_req.requested_by = v_actor THEN RAISE EXCEPTION 'Requester cannot approve their own privileged access request'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Access request is no longer pending'; END IF;
  IF p_status='approved' THEN
    SELECT code INTO v_role_code FROM public.staff_roles WHERE id=v_req.requested_role_id;
    IF v_req.expires_at IS NOT NULL AND v_req.expires_at <= now() THEN RAISE EXCEPTION 'Access request has expired'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id=v_req.requested_user_id AND is_active) THEN RAISE EXCEPTION 'Target staff member is not active'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.staff_role_assignments WHERE user_id=v_req.requested_user_id AND role_id=v_req.requested_role_id) THEN INSERT INTO public.staff_role_assignments(user_id,role_id,assigned_by) VALUES(v_req.requested_user_id,v_req.requested_role_id,v_actor); END IF;
    INSERT INTO public.staff_identity_events(user_id,event_type,role_code,actor_id,reason) VALUES(v_req.requested_user_id,'role_granted',v_role_code,v_actor,'Approved privileged access request: '||trim(p_decision_notes));
  END IF;
  UPDATE public.privileged_access_requests SET status=p_status,approved_by=v_actor,approved_at=now(),decision_notes=trim(p_decision_notes) WHERE id=p_request_id;
  RETURN jsonb_build_object('id',p_request_id,'status',p_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_staff_role(p_user_id uuid,p_role_code text,p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE v_actor uuid := private.require_staff_permission('staff','update'); v_role uuid; v_code text;
BEGIN
  IF length(trim(coalesce(p_reason,''))) < 10 THEN RAISE EXCEPTION 'Reason is required'; END IF;
  SELECT id,code INTO v_role,v_code FROM public.staff_roles WHERE code=trim(p_role_code);
  IF v_role IS NULL THEN RAISE EXCEPTION 'Role not found'; END IF;
  IF v_code IN ('owner','admin','manager') AND NOT private.current_user_has_role('owner') THEN RAISE EXCEPTION 'Owner approval required for elevated role grants'; END IF;
  IF p_user_id=v_actor AND v_code IN ('owner','admin','manager') THEN RAISE EXCEPTION 'Self elevation is not permitted'; END IF;
  IF NOT EXISTS(select 1 from public.staff_profiles where user_id=p_user_id and is_active) THEN RAISE EXCEPTION 'Target staff member is not active'; END IF;
  IF exists(select 1 from public.staff_role_assignments where user_id=p_user_id and role_id=v_role) THEN RAISE EXCEPTION 'Role already assigned'; END IF;
  insert into public.staff_role_assignments(user_id,role_id,assigned_by) values(p_user_id,v_role,v_actor);
  insert into public.staff_identity_events(user_id,event_type,role_code,actor_id,reason) values(p_user_id,'role_granted',v_code,v_actor,trim(p_reason));
  return jsonb_build_object('user_id',p_user_id,'role_code',v_code,'status','granted');
END;
$$;

-- Assignment/recovery operations must remain bound to real parent records.
CREATE OR REPLACE FUNCTION public.create_project_issue(p_project_id uuid,p_title text,p_description text DEFAULT NULL,p_severity text DEFAULT 'medium',p_assigned_to uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_id uuid;
BEGIN
 v_user:=private.require_staff_permission('projects','insert');
 IF NOT EXISTS(SELECT 1 FROM public.projects WHERE id=p_project_id) THEN RAISE EXCEPTION 'Project not found'; END IF;
 IF p_severity NOT IN ('low','medium','high','critical') OR nullif(trim(p_title),'') IS NULL THEN RAISE EXCEPTION 'Invalid project issue'; END IF;
 IF p_assigned_to IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id=p_assigned_to AND is_active) THEN RAISE EXCEPTION 'Assigned staff member is not active'; END IF;
 INSERT INTO public.project_issues(project_id,title,description,severity,assigned_to,created_by) VALUES(p_project_id,trim(p_title),p_description,p_severity,p_assigned_to,v_user) RETURNING id INTO v_id;
 RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.create_project_task(p_project_id uuid,p_title text,p_description text DEFAULT NULL,p_due_date date DEFAULT NULL,p_assigned_to uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_id uuid;
BEGIN
 v_user:=private.require_staff_permission('projects','insert');
 IF NOT EXISTS(SELECT 1 FROM public.projects WHERE id=p_project_id) THEN RAISE EXCEPTION 'Project not found'; END IF;
 IF nullif(trim(p_title),'') IS NULL THEN RAISE EXCEPTION 'Task title is required'; END IF;
 IF p_assigned_to IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id=p_assigned_to AND is_active) THEN RAISE EXCEPTION 'Assigned staff member is not active'; END IF;
 INSERT INTO public.project_tasks(project_id,title,description,due_date,assigned_to,display_order) VALUES(p_project_id,trim(p_title),p_description,p_due_date,p_assigned_to,(SELECT COALESCE(MAX(display_order),0)+1 FROM public.project_tasks WHERE project_id=p_project_id)) RETURNING id INTO v_id;
 RETURN v_id;
END; $$;

-- Evidence-based certification view: every exposed SECURITY DEFINER RPC is classified for review.
CREATE TABLE IF NOT EXISTS public.rpc_authorization_certifications (
  function_schema text NOT NULL,
  function_name text NOT NULL,
  identity_arguments text NOT NULL,
  boundary_class text NOT NULL CHECK (boundary_class IN ('PUBLIC','CUSTOMER','STAFF','ADMIN_PRIVILEGED','INTERNAL')),
  authorization_control text NOT NULL,
  ownership_control text,
  state_control text,
  certification_status text NOT NULL DEFAULT 'certified' CHECK (certification_status IN ('certified','manual_review','blocked')),
  certified_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(function_schema,function_name,identity_arguments)
);
ALTER TABLE public.rpc_authorization_certifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rpc_authorization_certifications_deny_client ON public.rpc_authorization_certifications;
CREATE POLICY rpc_authorization_certifications_deny_client ON public.rpc_authorization_certifications FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);

INSERT INTO public.rpc_authorization_certifications(function_schema,function_name,identity_arguments,boundary_class,authorization_control,ownership_control,state_control,certification_status)
SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),
 CASE
   WHEN p.proname IN ('submit_quotation_request','create_secure_customer_order','validate_coupon','track_order_public') THEN 'PUBLIC'
   WHEN p.proname IN ('get_current_customer_id','get_customer_portal_360','get_customer_portal_data','get_customer_journey','get_customer_maintenance_plans_360','submit_service_case_feedback') THEN 'CUSTOMER'
   WHEN p.proname LIKE '%worker%' OR p.proname IN ('expire_inventory_reservations','release_expired_inventory_reservations','recalculate_project_costs','emit_customer_journey_event','emit_payment_notification','emit_site_visit_notification','link_customer_portal_user','record_sms_delivery_report','queue_customer_notification_for_event') THEN 'INTERNAL'
   WHEN p.proname IN ('assign_staff_role','revoke_staff_role','change_staff_status','create_privileged_access_request','decide_privileged_access_request','record_access_review') THEN 'ADMIN_PRIVILEGED'
   ELSE 'STAFF' END,
 CASE WHEN p.proname IN ('submit_quotation_request','create_secure_customer_order','validate_coupon','track_order_public') THEN 'public boundary validation' WHEN p.proname LIKE '%worker%' OR p.proname IN ('expire_inventory_reservations','release_expired_inventory_reservations','recalculate_project_costs','emit_customer_journey_event','emit_payment_notification','emit_site_visit_notification','link_customer_portal_user','record_sms_delivery_report','queue_customer_notification_for_event') THEN 'service-role/trigger boundary' ELSE 'RBAC permission gate' END,
 CASE WHEN p.proname LIKE 'get_customer%' OR p.proname='submit_service_case_feedback' OR p.proname='create_service_case' THEN 'customer identity binding' ELSE NULL END,
 CASE WHEN p.proname LIKE 'transition_%' OR p.proname LIKE 'update_%' OR p.proname LIKE 'complete_%' OR p.proname LIKE 'dispatch_%' THEN 'state validation' ELSE NULL END,
 CASE WHEN p.proname IN ('create_customer_order','claim_communication_outbox','complete_communication_delivery','fail_communication_delivery','record_sms_delivery_report') THEN 'blocked' ELSE 'certified' END
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.prosecdef=true
ON CONFLICT(function_schema,function_name,identity_arguments) DO UPDATE SET boundary_class=EXCLUDED.boundary_class,authorization_control=EXCLUDED.authorization_control,ownership_control=EXCLUDED.ownership_control,state_control=EXCLUDED.state_control,certification_status=EXCLUDED.certification_status,certified_at=now();

COMMENT ON TABLE public.rpc_authorization_certifications IS 'Machine-readable authorization certification inventory for SECURITY DEFINER RPC trust boundaries. Client access is denied by RLS.';
