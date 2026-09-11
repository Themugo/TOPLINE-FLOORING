-- Phase 47: warranty, service and post-delivery support lifecycle.

CREATE TABLE IF NOT EXISTS public.service_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text UNIQUE NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'warranty' CHECK (type IN ('warranty','service','maintenance')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_review','scheduled','in_progress','resolved','closed','rejected')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  issue_title text NOT NULL,
  description text NOT NULL,
  reported_at timestamptz NOT NULL DEFAULT now(),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  scheduled_date date,
  warranty_start date,
  warranty_end date,
  warranty_valid boolean,
  resolution text,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_cases_customer_idx ON public.service_cases(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS service_cases_status_idx ON public.service_cases(status, priority);
CREATE INDEX IF NOT EXISTS service_cases_project_idx ON public.service_cases(project_id);

ALTER TABLE public.service_cases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.service_cases FROM anon;
GRANT SELECT ON public.service_cases TO authenticated;
DROP POLICY IF EXISTS service_cases_staff_read ON public.service_cases;
CREATE POLICY service_cases_staff_read ON public.service_cases FOR SELECT TO authenticated
USING (private.current_user_has_permission('customers','select') OR private.current_user_has_permission('projects','select'));
DROP POLICY IF EXISTS service_cases_customer_read ON public.service_cases;
CREATE POLICY service_cases_customer_read ON public.service_cases FOR SELECT TO authenticated
USING (customer_id = public.get_current_customer_id());

CREATE OR REPLACE FUNCTION public.create_service_case(
  p_customer_id uuid,
  p_issue_title text,
  p_description text,
  p_type text DEFAULT 'warranty',
  p_priority text DEFAULT 'medium',
  p_project_id uuid DEFAULT NULL,
  p_order_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_case_id uuid; v_no text; v_staff boolean;
BEGIN
  v_staff := private.current_user_is_staff();
  IF NOT v_staff THEN
    IF p_customer_id <> public.get_current_customer_id() THEN RAISE EXCEPTION 'Customer access denied'; END IF;
    v_user := auth.uid();
  ELSE
    v_user := private.require_staff_permission('customers','insert');
  END IF;
  IF nullif(trim(p_issue_title),'') IS NULL OR nullif(trim(p_description),'') IS NULL THEN RAISE EXCEPTION 'Issue title and description are required'; END IF;
  IF p_type NOT IN ('warranty','service','maintenance') OR p_priority NOT IN ('low','medium','high','critical') THEN RAISE EXCEPTION 'Invalid service case type or priority'; END IF;
  v_no := 'TOP-' || to_char(current_date,'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  INSERT INTO public.service_cases(case_number,customer_id,project_id,order_id,type,priority,issue_title,description,created_by)
  VALUES(v_no,p_customer_id,p_project_id,p_order_id,p_type,p_priority,trim(p_issue_title),trim(p_description),v_user) RETURNING id INTO v_case_id;
  RETURN jsonb_build_object('success',true,'case_id',v_case_id,'case_number',v_no,'status','open');
END; $$;

CREATE OR REPLACE FUNCTION public.update_service_case(
  p_case_id uuid,
  p_status text,
  p_priority text DEFAULT NULL,
  p_assigned_to uuid DEFAULT NULL,
  p_scheduled_date date DEFAULT NULL,
  p_resolution text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_status text;
BEGIN
  v_user := private.require_staff_permission('customers','update');
  IF p_status NOT IN ('open','in_review','scheduled','in_progress','resolved','closed','rejected') THEN RAISE EXCEPTION 'Invalid service case status'; END IF;
  SELECT status INTO v_status FROM public.service_cases WHERE id=p_case_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Service case not found'; END IF;
  IF v_status='closed' AND p_status <> 'closed' THEN RAISE EXCEPTION 'Closed service case cannot be reopened'; END IF;
  UPDATE public.service_cases SET status=p_status,priority=COALESCE(p_priority,priority),assigned_to=COALESCE(p_assigned_to,assigned_to),scheduled_date=COALESCE(p_scheduled_date,scheduled_date),resolution=COALESCE(p_resolution,resolution),resolved_at=CASE WHEN p_status='resolved' THEN COALESCE(resolved_at,now()) ELSE resolved_at END,closed_at=CASE WHEN p_status='closed' THEN COALESCE(closed_at,now()) ELSE closed_at END,updated_at=now() WHERE id=p_case_id;
  RETURN jsonb_build_object('success',true,'case_id',p_case_id,'status',p_status,'updated_by',v_user);
END; $$;

GRANT EXECUTE ON FUNCTION public.create_service_case(uuid,text,text,text,text,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_service_case(uuid,text,text,uuid,date,text) TO authenticated;

DROP TRIGGER IF EXISTS trg_service_cases_updated_at ON public.service_cases;
CREATE TRIGGER trg_service_cases_updated_at BEFORE UPDATE ON public.service_cases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
