-- Runtime SQL errors found by static analysis (plpgsql_check) of every PL/pgSQL function on the
-- replayed schema. Each function raised at call time, so the feature behind it was unusable:
--
--   prepare_customer_registration      same min(uuid) inside the auth.users trigger: EVERY customer sign-up
--                                      ('Database error saving new user') failed.
--   emit_customer_journey_event        min(uuid) does not exist (PostgreSQL has no min/max for uuid).
--                                      This AFTER trigger runs on every quotation write, so EVERY quotation
--                                      submission failed with 'function min(uuid) does not exist'.
--   record_inbound_communication_worker same min(uuid): inbound email/SMS/WhatsApp could not be recorded.
--   get_communications_release_gate_360 referenced columns (enabled, configured) that do not exist on
--                                      communication_provider_activation; now uses activation_status.
--   get_customer_lifecycle_360          ORDER BY x.created_at on a sub-select that did not project it.
--   get_customer_lifecycle_operations_360 ORDER BY x.customer_name; the sub-select exposes `name`.
--   get_data_governance_360             counted request due dates on data_governance_policies, which has no
--                                      due_at/request status; now counts data_subject_requests.
--   get_hse_site_compliance_360, get_quality_assurance_360  ORDER BY x.created_at on sub-selects that
--                                      did not project it.
--
-- min(id) is replaced with (array_agg(id))[1]; it is only used when exactly one row matched. Added
-- created_at fields only extend the returned JSON objects. Signatures, security settings and grants
-- are unchanged (CREATE OR REPLACE preserves privileges).

CREATE OR REPLACE FUNCTION public.emit_customer_journey_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, private
AS $function$
DECLARE
  cid uuid;
  old_status text;
  new_status text;
  et text;
  entity text := TG_TABLE_NAME;
  eid uuid := NEW.id;
  v_match_count integer := 0;
BEGIN
  IF TG_TABLE_NAME='orders' THEN
    cid:=NEW.customer_id; new_status:=NEW.status; et:='order.status';
  ELSIF TG_TABLE_NAME='quotations' THEN
    SELECT count(*), (array_agg(c.id))[1] INTO v_match_count, cid
    FROM public.customers c WHERE lower(c.email)=lower(trim(NEW.email));
    IF v_match_count <> 1 THEN cid:=NULL; END IF;
    new_status:=NEW.status; et:='quotation.status';
  ELSIF TG_TABLE_NAME='projects' THEN
    cid:=NEW.customer_id; new_status:=NEW.status; et:='project.status';
  ELSIF TG_TABLE_NAME='invoices' THEN
    cid:=NEW.customer_id; new_status:=NEW.status; et:='invoice.status';
  END IF;
  IF TG_OP='UPDATE' THEN old_status:=OLD.status; END IF;
  IF TG_OP='UPDATE' AND old_status IS NOT DISTINCT FROM new_status THEN RETURN NEW; END IF;
  INSERT INTO public.notification_events(event_type,entity_type,entity_id,customer_id,title,message,severity,audience,metadata)
  VALUES(et,entity,eid,cid,
    initcap(replace(entity,'_',' '))||' update',
    CASE WHEN old_status IS NULL THEN initcap(replace(entity,'_',' '))||' created.' ELSE initcap(replace(entity,'_',' '))||' changed from '||coalesce(old_status,'new')||' to '||coalesce(new_status,'updated')||'.' END,
    CASE WHEN new_status IN ('cancelled','lost') THEN 'warning' WHEN new_status IN ('completed','paid','won') THEN 'success' ELSE 'info' END,
    'both',jsonb_build_object('old_status',old_status,'new_status',new_status,'customer_match_count',v_match_count));
  IF cid IS NOT NULL THEN PERFORM public.queue_customer_notification_for_event(et,eid,cid,new_status); END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.record_inbound_communication_worker(p_provider text, p_channel text, p_sender text, p_recipient text DEFAULT NULL::text, p_subject text DEFAULT NULL::text, p_message text DEFAULT NULL::text, p_provider_message_id text DEFAULT NULL::text, p_conversation_id text DEFAULT NULL::text, p_media_url text DEFAULT NULL::text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, private
AS $function$
DECLARE
  v_id uuid; v_customer_id uuid; v_thread_id uuid;
  v_match_count integer:=0; v_match_status text:='unmatched'; v_match_reason text:='no_customer_match';
  v_normalized text;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
  IF p_channel NOT IN ('email','sms','whatsapp') THEN RAISE EXCEPTION 'Invalid inbound channel'; END IF;
  IF nullif(trim(coalesce(p_sender,'')),'') IS NULL OR nullif(trim(coalesce(p_message,'')),'') IS NULL THEN RAISE EXCEPTION 'Inbound sender and message are required'; END IF;

  IF p_channel='email' THEN
    SELECT count(*), (array_agg(id))[1] INTO v_match_count,v_customer_id FROM public.customers WHERE lower(trim(coalesce(email,'')))=lower(trim(p_sender));
    IF v_match_count=1 THEN v_match_status:='matched'; v_match_reason:='unique_email_match';
    ELSIF v_match_count>1 THEN v_customer_id:=NULL; v_match_status:='ambiguous'; v_match_reason:='duplicate_email_match'; END IF;
  ELSE
    v_normalized:=public.normalize_customer_phone(p_sender);
    IF v_normalized IS NOT NULL THEN
      SELECT count(*), (array_agg(id))[1] INTO v_match_count,v_customer_id FROM public.customers WHERE public.normalize_customer_phone(phone)=v_normalized;
      IF v_match_count=1 THEN v_match_status:='matched'; v_match_reason:='unique_phone_match';
      ELSIF v_match_count>1 THEN v_customer_id:=NULL; v_match_status:='ambiguous'; v_match_reason:='duplicate_phone_match'; END IF;
    ELSE
      v_customer_id:=NULL; v_match_status:='unmatched'; v_match_reason:='invalid_phone_format';
    END IF;
  END IF;

  -- Insert first. The unique provider/message key is the idempotency boundary;
  -- only a newly inserted inbound message may create/update a conversation.
  INSERT INTO public.communication_inbound(customer_id,channel,sender,recipient,subject,message,provider,provider_message_id,conversation_id,media_url,payload,match_status,match_reason,matched_at)
  VALUES(v_customer_id,p_channel,trim(p_sender),nullif(trim(p_recipient),''),nullif(trim(p_subject),''),trim(p_message),p_provider,p_provider_message_id,p_conversation_id,p_media_url,coalesce(p_payload,'{}'::jsonb),v_match_status,v_match_reason,CASE WHEN v_match_status='matched' THEN now() ELSE NULL END)
  ON CONFLICT (provider,channel,provider_message_id) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL AND p_provider_message_id IS NOT NULL THEN
    SELECT id INTO v_id FROM public.communication_inbound WHERE provider=p_provider AND channel=p_channel AND provider_message_id=p_provider_message_id LIMIT 1;
  END IF;
  IF v_id IS NULL THEN RETURN NULL; END IF;

  -- Existing rows have already been processed or are already in-flight. Do not
  -- increment thread counters or emit notifications for a duplicate webhook.
  IF EXISTS (SELECT 1 FROM public.communication_inbound WHERE id=v_id AND processed_at IS NOT NULL) THEN
    RETURN v_id;
  END IF;

  IF v_match_status='matched' THEN
    v_thread_id:=public.ensure_communication_conversation_worker(v_customer_id,p_channel,p_provider,p_conversation_id,p_subject,'inbound');
    UPDATE public.communication_inbound SET conversation_thread_id=v_thread_id WHERE id=v_id;
    INSERT INTO public.customer_communications(customer_id,channel,direction,subject,message,status,external_reference,created_at)
    VALUES(v_customer_id,p_channel,'inbound',nullif(trim(p_subject),''),trim(p_message),'logged',coalesce(p_provider_message_id,p_conversation_id),now());
    INSERT INTO public.notification_events(event_type,entity_type,entity_id,customer_id,title,message,severity,audience,metadata)
    VALUES('communication.inbound','communication',v_id,v_customer_id,'Customer response received',left(trim(p_message),500),'info','staff',jsonb_build_object('channel',p_channel,'provider',p_provider,'sender',p_sender,'match_status',v_match_status,'conversation_thread_id',v_thread_id));
  ELSE
    INSERT INTO public.notification_events(event_type,entity_type,entity_id,customer_id,title,message,severity,audience,metadata)
    VALUES('communication.inbound.review','communication',v_id,NULL,
      CASE WHEN v_match_status='ambiguous' THEN 'Ambiguous customer response requires review' ELSE 'Unmatched customer response requires review' END,
      left(trim(p_message),500),'warning','staff',jsonb_build_object('channel',p_channel,'provider',p_provider,'sender',p_sender,'match_status',v_match_status,'match_reason',v_match_reason));
  END IF;

  UPDATE public.communication_inbound SET processed_at=now() WHERE id=v_id;
  RETURN v_id;
END; $function$;

CREATE OR REPLACE FUNCTION public.get_communications_release_gate_360()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public, private
AS $function$
DECLARE
  v_failed_24h integer;
  v_stale integer;
  v_unknown integer;
  v_open_critical integer;
  v_provider_ready boolean;
  v_security_passed boolean;
  v_uat_passed boolean;
BEGIN
  PERFORM private.require_staff_permission('customers','read');
  SELECT count(*) INTO v_failed_24h FROM public.automation_job_runs
   WHERE job_key IN ('deliver_communications','reconcile_communications')
     AND status IN ('failed','timed_out') AND started_at >= now()-interval '24 hours';
  SELECT count(*) INTO v_stale FROM public.communication_outbox
   WHERE status='queued' AND created_at < now()-interval '30 minutes';
  SELECT count(*) INTO v_unknown FROM public.communication_outbox
   WHERE delivery_status='unknown' AND created_at >= now()-interval '24 hours';
  SELECT count(*) INTO v_open_critical FROM public.communication_incident_events
   WHERE severity='critical' AND status IN ('open','investigating');
  -- Ready only when at least one provider is switched on and every switched-on provider is ready or active.
  SELECT coalesce(bool_and(activation_status IN ('ready','active')),false) INTO v_provider_ready
    FROM public.communication_provider_activation
   WHERE activation_status <> 'disabled';
  SELECT coalesce(bool_and(status='passed'),false) INTO v_security_passed
    FROM public.communication_certification_runs
   WHERE certification_key='COMM-16-security' AND environment='staging';
  SELECT coalesce(bool_and(status='passed'),false) INTO v_uat_passed
    FROM public.communication_certification_runs
   WHERE certification_key='COMM-13-two-customer-uat' AND environment='staging';
  RETURN jsonb_build_object(
    'release_ready', (v_failed_24h=0 AND v_stale=0 AND v_unknown=0 AND v_open_critical=0 AND v_provider_ready AND v_security_passed AND v_uat_passed),
    'failed_workers_24h',v_failed_24h,
    'stale_queue',v_stale,
    'unknown_delivery_24h',v_unknown,
    'open_critical_incidents',v_open_critical,
    'providers_ready',v_provider_ready,
    'security_certified',v_security_passed,
    'two_customer_uat_certified',v_uat_passed
  );
END; $function$;

CREATE OR REPLACE FUNCTION public.get_customer_lifecycle_360(p_customer_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public, private
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_customer_id uuid;
  v_customer jsonb;
  v_summary jsonb;
  v_cases jsonb;
  v_feedback jsonb;
  v_maintenance jsonb;
  v_visits jsonb;
  v_renewals jsonb;
  v_events jsonb;
BEGIN
  IF private.current_user_is_staff() THEN
    PERFORM private.require_staff_permission('customers','select');
    v_customer_id := p_customer_id;
  ELSE
    v_customer_id := public.get_current_customer_id();
    IF v_customer_id IS NULL THEN RAISE EXCEPTION 'Customer portal access is not available for this account'; END IF;
    IF p_customer_id IS NOT NULL AND p_customer_id <> v_customer_id THEN RAISE EXCEPTION 'Customer access denied'; END IF;
  END IF;

  IF v_customer_id IS NOT NULL THEN
    SELECT to_jsonb(c) INTO v_customer FROM public.customers c WHERE c.id=v_customer_id;
    IF v_customer IS NULL THEN RAISE EXCEPTION 'Customer not found'; END IF;
  END IF;

  SELECT jsonb_build_object(
    'service_cases', count(*) FILTER (WHERE s.status NOT IN ('resolved','closed','rejected')),
    'overdue_cases', count(*) FILTER (WHERE s.status NOT IN ('resolved','closed','rejected') AND s.sla_due_at < now()),
    'warranty_active', count(*) FILTER (WHERE s.type='warranty' AND s.warranty_valid=true AND s.warranty_end >= current_date),
    'feedback_average', COALESCE(round(avg(f.rating)::numeric,2),0),
    'maintenance_active', (SELECT count(*) FROM public.maintenance_plans m WHERE m.status='active' AND (v_customer_id IS NULL OR m.customer_id=v_customer_id)),
    'maintenance_due_30_days', (SELECT count(*) FROM public.maintenance_plans m WHERE m.status='active' AND m.next_due_on BETWEEN current_date AND current_date+30 AND (v_customer_id IS NULL OR m.customer_id=v_customer_id)),
    'renewals_open', (SELECT count(*) FROM public.customer_renewal_opportunities o WHERE o.status IN ('open','contacted') AND (v_customer_id IS NULL OR o.customer_id=v_customer_id)),
    'renewals_overdue', (SELECT count(*) FROM public.customer_renewal_opportunities o WHERE o.status IN ('open','contacted') AND o.renewal_due_on < current_date AND (v_customer_id IS NULL OR o.customer_id=v_customer_id))
  ) INTO v_summary
  FROM public.service_cases s
  LEFT JOIN public.service_case_feedback f ON f.case_id=s.id
  WHERE v_customer_id IS NULL OR s.customer_id=v_customer_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.reported_at DESC),'[]'::jsonb) INTO v_cases
  FROM (
    SELECT s.id,s.case_number,s.type,s.status,s.priority,s.issue_title,s.description,s.reported_at,s.sla_due_at,s.escalation_level,s.warranty_start,s.warranty_end,s.warranty_valid,s.resolution,s.resolved_at,s.closed_at
    FROM public.service_cases s
    WHERE v_customer_id IS NULL OR s.customer_id=v_customer_id
    ORDER BY s.reported_at DESC LIMIT 100
  ) x;

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb) INTO v_feedback
  FROM (
    SELECT f.id,f.case_id,f.rating,f.outcome,f.comment,f.created_at,s.case_number,s.issue_title
    FROM public.service_case_feedback f JOIN public.service_cases s ON s.id=f.case_id
    WHERE v_customer_id IS NULL OR f.customer_id=v_customer_id
    ORDER BY f.created_at DESC LIMIT 100
  ) x;

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.next_due_on NULLS LAST,x.created_at DESC),'[]'::jsonb) INTO v_maintenance
  FROM (
    SELECT m.id,m.created_at,m.plan_number,m.name,m.description,m.frequency_months,m.status,m.starts_on,m.next_due_on,m.last_serviced_on,m.expires_on
    FROM public.maintenance_plans m WHERE v_customer_id IS NULL OR m.customer_id=v_customer_id
    ORDER BY m.next_due_on NULLS LAST,m.created_at DESC LIMIT 100
  ) x;

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.scheduled_for DESC),'[]'::jsonb) INTO v_visits
  FROM (
    SELECT v.id,v.plan_id,m.plan_number,m.name AS plan_name,v.scheduled_for,v.completed_on,v.status,v.notes
    FROM public.maintenance_plan_visits v JOIN public.maintenance_plans m ON m.id=v.plan_id
    WHERE v_customer_id IS NULL OR m.customer_id=v_customer_id
    ORDER BY v.scheduled_for DESC LIMIT 100
  ) x;

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.renewal_due_on ASC),'[]'::jsonb) INTO v_renewals
  FROM (
    SELECT o.id,o.maintenance_plan_id,o.renewal_due_on,o.status,o.priority,o.last_contacted_at,o.next_action_on,o.notes,m.plan_number,m.name AS plan_name
    FROM public.customer_renewal_opportunities o JOIN public.maintenance_plans m ON m.id=o.maintenance_plan_id
    WHERE (v_customer_id IS NULL OR o.customer_id=v_customer_id)
    ORDER BY o.renewal_due_on ASC LIMIT 100
  ) x;

  SELECT COALESCE(jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC),'[]'::jsonb) INTO v_events
  FROM public.customer_after_sales_events e
  WHERE v_customer_id IS NULL OR e.customer_id=v_customer_id;

  RETURN jsonb_build_object(
    'checked_at',now(),
    'customer',COALESCE(v_customer,'null'::jsonb),
    'summary',v_summary,
    'service_cases',v_cases,
    'feedback',v_feedback,
    'maintenance_plans',v_maintenance,
    'maintenance_visits',v_visits,
    'renewals',v_renewals,
    'events',v_events,
    'viewer',v_user
  );
END; $function$;

CREATE OR REPLACE FUNCTION public.get_customer_lifecycle_operations_360()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public, private
AS $function$
DECLARE
  v_user uuid := private.require_staff_permission('customers','select');
  v_metrics jsonb;
  v_customers jsonb;
BEGIN
  SELECT jsonb_build_object(
    'active_customers', (SELECT count(*) FROM public.customers),
    'open_service_cases', (SELECT count(*) FROM public.service_cases WHERE status NOT IN ('resolved','closed','rejected')),
    'overdue_service_cases', (SELECT count(*) FROM public.service_cases WHERE status NOT IN ('resolved','closed','rejected') AND sla_due_at < now()),
    'active_warranties', (SELECT count(*) FROM public.service_cases WHERE type='warranty' AND warranty_valid=true AND warranty_end >= current_date),
    'unverified_warranties', (SELECT count(*) FROM public.service_cases WHERE type='warranty' AND warranty_valid IS NULL),
    'low_feedback', (SELECT count(*) FROM public.service_case_feedback WHERE rating <= 2),
    'maintenance_due_30_days', (SELECT count(*) FROM public.maintenance_plans WHERE status='active' AND next_due_on BETWEEN current_date AND current_date+30),
    'maintenance_overdue', (SELECT count(*) FROM public.maintenance_plans WHERE status='active' AND next_due_on < current_date),
    'renewals_due_14_days', (SELECT count(*) FROM public.customer_renewal_opportunities WHERE status IN ('open','contacted') AND renewal_due_on BETWEEN current_date AND current_date+14),
    'renewals_overdue', (SELECT count(*) FROM public.customer_renewal_opportunities WHERE status IN ('open','contacted') AND renewal_due_on < current_date)
  ) INTO v_metrics;

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.risk_score DESC,x.name ASC),'[]'::jsonb) INTO v_customers
  FROM (
    SELECT c.id,c.name,c.email,c.phone,
      (SELECT count(*) FROM public.service_cases s WHERE s.customer_id=c.id AND s.status NOT IN ('resolved','closed','rejected')) AS open_service_cases,
      (SELECT count(*) FROM public.service_cases s WHERE s.customer_id=c.id AND s.status NOT IN ('resolved','closed','rejected') AND s.sla_due_at < now()) AS overdue_service_cases,
      (SELECT count(*) FROM public.maintenance_plans m WHERE m.customer_id=c.id AND m.status='active' AND m.next_due_on < current_date) AS overdue_maintenance,
      (SELECT count(*) FROM public.customer_renewal_opportunities o WHERE o.customer_id=c.id AND o.status IN ('open','contacted') AND o.renewal_due_on < current_date) AS overdue_renewals,
      (SELECT count(*) FROM public.service_case_feedback f WHERE f.customer_id=c.id AND f.rating <= 2) AS low_feedback,
      (
        (SELECT count(*) FROM public.service_cases s WHERE s.customer_id=c.id AND s.status NOT IN ('resolved','closed','rejected') AND s.sla_due_at < now()) * 4 +
        (SELECT count(*) FROM public.customer_renewal_opportunities o WHERE o.customer_id=c.id AND o.status IN ('open','contacted') AND o.renewal_due_on < current_date) * 3 +
        (SELECT count(*) FROM public.maintenance_plans m WHERE m.customer_id=c.id AND m.status='active' AND m.next_due_on < current_date) * 2 +
        (SELECT count(*) FROM public.service_case_feedback f WHERE f.customer_id=c.id AND f.rating <= 2) * 2
      ) AS risk_score
    FROM public.customers c
    WHERE EXISTS (SELECT 1 FROM public.service_cases s WHERE s.customer_id=c.id AND s.status NOT IN ('resolved','closed','rejected'))
       OR EXISTS (SELECT 1 FROM public.maintenance_plans m WHERE m.customer_id=c.id AND m.status='active')
       OR EXISTS (SELECT 1 FROM public.customer_renewal_opportunities o WHERE o.customer_id=c.id AND o.status IN ('open','contacted'))
    ORDER BY risk_score DESC,c.name ASC LIMIT 100
  ) x;

  RETURN jsonb_build_object('checked_at',now(),'metrics',v_metrics,'customers',v_customers,'viewer',v_user);
END; $function$;

CREATE OR REPLACE FUNCTION public.get_data_governance_360()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public, private
AS $function$
DECLARE v_user uuid := private.require_staff_permission('reports','select'); v_metrics jsonb; v_policies jsonb; v_requests jsonb; v_reviews jsonb;
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
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'domain',p.domain,'classification',p.classification,'title',p.title,'owner_id',p.owner_id,'retention_days',p.retention_days,'status',p.status,'next_review_at',p.next_review_at) ORDER BY CASE p.classification WHEN 'restricted' THEN 1 WHEN 'confidential' THEN 2 WHEN 'internal' THEN 3 ELSE 4 END,p.next_review_at NULLS LAST,p.title),'[]'::jsonb) INTO v_policies FROM public.data_governance_policies p WHERE p.status <> 'retired';
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'customer_id',r.customer_id,'request_type',r.request_type,'status',r.status,'received_at',r.received_at,'due_at',r.due_at,'completed_at',r.completed_at,'resolution',r.resolution) ORDER BY r.due_at),'[]'::jsonb) INTO v_requests FROM public.data_subject_requests r WHERE r.status NOT IN ('completed','rejected','cancelled');
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'reviewed_user_id',a.reviewed_user_id,'review_due_at',a.review_due_at,'status',a.status,'completed_at',a.completed_at,'findings',a.findings) ORDER BY a.review_due_at),'[]'::jsonb) INTO v_reviews FROM public.access_reviews a WHERE a.status='pending';
  RETURN jsonb_build_object('generated_at',now(),'viewer',v_user,'metrics',v_metrics,'policies',v_policies,'open_requests',v_requests,'pending_access_reviews',v_reviews);
END; $function$;

CREATE OR REPLACE FUNCTION public.get_hse_site_compliance_360()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public, private
AS $function$
declare v_actor uuid := private.require_staff_permission('projects','select');
begin
 return jsonb_build_object('generated_at',now(),'viewer',v_actor,
 'metrics',jsonb_build_object('sites_total',(select count(*) from public.hse_site_controls_360),'high_risk_sites',(select count(*) from public.hse_site_controls_360 where risk_level in ('high','critical') and status='active'),'open_events',(select count(*) from public.hse_site_events_360 where status not in ('resolved','closed')),'critical_events',(select count(*) from public.hse_site_events_360 where severity='critical' and status not in ('resolved','closed')),'overdue_actions',(select count(*) from public.hse_corrective_actions_360 where status not in ('verified','closed') and due_at is not null and due_at<now()),'review_due_sites',(select count(*) from public.hse_site_controls_360 where status='active' and review_due_at is not null and review_due_at<=now()+interval '30 days')),
 'sites',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from (select id,created_at,project_id,title,site_name,risk_level,status,induction_required,ppe_required,review_due_at from public.hse_site_controls_360 order by created_at desc limit 50)x),
 'events',(select coalesce(jsonb_agg(to_jsonb(x) order by x.occurred_at desc),'[]'::jsonb) from (select e.id,e.control_id,e.event_type,e.severity,e.description,e.status,e.occurred_at,c.site_name,c.title control_title from public.hse_site_events_360 e join public.hse_site_controls_360 c on c.id=e.control_id where e.status not in ('closed') order by e.occurred_at desc limit 100)x),
 'actions',(select coalesce(jsonb_agg(to_jsonb(x) order by x.due_at nulls last,x.created_at desc),'[]'::jsonb) from (select a.id,a.created_at,a.event_id,a.action_plan,a.owner_id,a.due_at,a.status,e.description event_description from public.hse_corrective_actions_360 a join public.hse_site_events_360 e on e.id=a.event_id where a.status not in ('closed') order by a.due_at nulls last,a.created_at desc limit 100)x));
end; $function$;

CREATE OR REPLACE FUNCTION public.get_quality_assurance_360()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public, private
AS $function$
declare v_actor uuid := private.require_staff_permission('projects','select');
begin
 return jsonb_build_object(
 'generated_at',now(),'viewer',v_actor,
 'metrics',jsonb_build_object(
  'inspections_total',(select count(*) from public.quality_inspections_360),
  'open_inspections',(select count(*) from public.quality_inspections_360 where status in ('open','in_progress','failed')),
  'failed_inspections',(select count(*) from public.quality_inspections_360 where status='failed'),
  'open_actions',(select count(*) from public.quality_corrective_actions_360 where status in ('open','in_progress','blocked')),
  'overdue_actions',(select count(*) from public.quality_corrective_actions_360 where status not in ('closed','verified') and due_at is not null and due_at<now()),
  'critical_actions',(select count(*) from public.quality_corrective_actions_360 where severity='critical' and status not in ('closed','verified'))
 ),
 'inspections',(select coalesce(jsonb_agg(to_jsonb(x) order by x.inspected_at desc),'[]'::jsonb) from (select id,reference_type,reference_id,title,status,score,findings_summary,inspected_at,closed_at from public.quality_inspections_360 order by inspected_at desc limit 50)x),
 'actions',(select coalesce(jsonb_agg(to_jsonb(x) order by x.due_at nulls last,x.created_at desc),'[]'::jsonb) from (select a.id,a.created_at,a.inspection_id,a.finding,a.severity,a.owner_id,a.due_at,a.action_plan,a.status,a.completed_at,a.verified_at,i.title inspection_title from public.quality_corrective_actions_360 a join public.quality_inspections_360 i on i.id=a.inspection_id where a.status not in ('closed') order by a.due_at nulls last,a.created_at desc limit 100)x)
 );
end; $function$;

CREATE OR REPLACE FUNCTION public.prepare_customer_registration()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  registration_requested boolean;
  existing_count integer;
  existing_customer uuid;
  registration_name text;
  registration_phone text;
  registration_company text;
BEGIN
  registration_requested := COALESCE((NEW.raw_user_meta_data ->> 'topline_customer_registration')::boolean, false);
  IF NOT registration_requested OR NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  registration_name := NULLIF(trim(NEW.raw_user_meta_data ->> 'name'), '');
  registration_phone := NULLIF(trim(NEW.raw_user_meta_data ->> 'phone'), '');
  registration_company := NULLIF(trim(NEW.raw_user_meta_data ->> 'company'), '');

  IF registration_name IS NULL OR registration_phone IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*), (array_agg(c.id))[1]
    INTO existing_count, existing_customer
    FROM public.customers c
   WHERE lower(trim(c.email)) = lower(trim(NEW.email));

  IF existing_count = 1 THEN
    RETURN NEW;
  END IF;

  IF existing_count = 0 THEN
    INSERT INTO public.customers(name, email, phone, company, notes)
    VALUES (
      registration_name,
      lower(trim(NEW.email)),
      registration_phone,
      registration_company,
      'Self-registered customer account; pending email verification.'
    );
  END IF;

  RETURN NEW;
END;
$function$;
