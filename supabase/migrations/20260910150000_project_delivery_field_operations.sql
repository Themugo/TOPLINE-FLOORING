-- Phases 18-20: Project Delivery & Field Operations
-- Canonical execution records and transactional field operations.

CREATE TABLE IF NOT EXISTS public.project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','blocked','completed','cancelled')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date date,
  completed_at timestamptz,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_material_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  quantity_allocated integer NOT NULL CHECK (quantity_allocated > 0),
  notes text,
  allocated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_signoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  approved boolean NOT NULL DEFAULT false,
  customer_name text,
  signature text,
  notes text,
  signed_at timestamptz,
  captured_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_tasks_project_status ON public.project_tasks(project_id,status);
CREATE INDEX IF NOT EXISTS idx_project_tasks_due_date ON public.project_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_project_material_project ON public.project_material_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_issues_project_status ON public.project_issues(project_id,status);
CREATE INDEX IF NOT EXISTS idx_project_signoffs_project ON public.project_signoffs(project_id);

DROP TRIGGER IF EXISTS trg_project_tasks_updated_at ON public.project_tasks;
CREATE TRIGGER trg_project_tasks_updated_at BEFORE UPDATE ON public.project_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_project_issues_updated_at ON public.project_issues;
CREATE TRIGGER trg_project_issues_updated_at BEFORE UPDATE ON public.project_issues FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_material_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_signoffs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_project_progress(
  p_project_id uuid, p_progress integer, p_status text DEFAULT NULL, p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_user uuid; v_status text; v_id uuid;
BEGIN
  v_user := private.require_staff_permission('projects','update');
  IF p_progress < 0 OR p_progress > 100 THEN RAISE EXCEPTION 'Progress must be between 0 and 100'; END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('pending','scheduled','in_progress','completed','cancelled') THEN RAISE EXCEPTION 'Invalid project status'; END IF;
  v_status := COALESCE(p_status, CASE WHEN p_progress=100 THEN 'completed' WHEN p_progress>0 THEN 'in_progress' ELSE 'pending' END);
  UPDATE public.projects SET progress_percentage=p_progress, status=v_status, progress_notes=COALESCE(p_notes,progress_notes), completion_date=CASE WHEN v_status='completed' THEN COALESCE(completion_date,current_date) ELSE completion_date END, updated_at=now() WHERE id=p_project_id RETURNING id INTO v_id;
  IF v_id IS NULL THEN RETURN jsonb_build_object('success',false,'error','Project not found'); END IF;
  RETURN jsonb_build_object('success',true,'project_id',v_id,'progress',p_progress,'status',v_status,'updated_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.create_project_task(
  p_project_id uuid, p_title text, p_description text DEFAULT NULL, p_due_date date DEFAULT NULL, p_assigned_to uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_user uuid; v_id uuid;
BEGIN
  v_user := private.require_staff_permission('projects','insert');
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id=p_project_id) THEN RAISE EXCEPTION 'Project not found'; END IF;
  IF nullif(trim(p_title),'') IS NULL THEN RAISE EXCEPTION 'Task title is required'; END IF;
  INSERT INTO public.project_tasks(project_id,title,description,due_date,assigned_to,display_order) VALUES(p_project_id,trim(p_title),p_description,p_due_date,p_assigned_to,(SELECT COALESCE(MAX(display_order),0)+1 FROM public.project_tasks WHERE project_id=p_project_id)) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.update_project_task(
  p_task_id uuid, p_status text, p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_user uuid; v_project uuid; v_id uuid;
BEGIN
  v_user := private.require_staff_permission('projects','update');
  IF p_status NOT IN ('pending','in_progress','blocked','completed','cancelled') THEN RAISE EXCEPTION 'Invalid task status'; END IF;
  UPDATE public.project_tasks SET status=p_status, description=COALESCE(p_notes,description), completed_at=CASE WHEN p_status='completed' THEN COALESCE(completed_at,now()) ELSE completed_at END, updated_at=now() WHERE id=p_task_id RETURNING id,project_id INTO v_id,v_project;
  IF v_id IS NULL THEN RETURN jsonb_build_object('success',false,'error','Task not found'); END IF;
  RETURN jsonb_build_object('success',true,'task_id',v_id,'project_id',v_project,'status',p_status,'updated_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.allocate_project_material(
  p_project_id uuid, p_product_id uuid, p_warehouse_id uuid, p_quantity integer, p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_user uuid; v_stock integer; v_product_stock integer; v_alloc uuid; v_new integer;
BEGIN
  v_user := private.require_staff_permission('inventory','update');
  IF p_quantity <= 0 THEN RAISE EXCEPTION 'Allocation quantity must be positive'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id=p_project_id) THEN RAISE EXCEPTION 'Project not found'; END IF;
  SELECT quantity INTO v_stock FROM public.warehouse_stock WHERE warehouse_id=p_warehouse_id AND product_id=p_product_id FOR UPDATE;
  v_stock := COALESCE(v_stock,0);
  IF v_stock < p_quantity THEN RAISE EXCEPTION 'Insufficient warehouse stock'; END IF;
  SELECT stock_quantity INTO v_product_stock FROM public.products WHERE id=p_product_id FOR UPDATE;
  IF NOT FOUND OR v_product_stock < p_quantity THEN RAISE EXCEPTION 'Insufficient total product stock'; END IF;
  UPDATE public.warehouse_stock SET quantity=v_stock-p_quantity,updated_at=now() WHERE warehouse_id=p_warehouse_id AND product_id=p_product_id;
  v_new := v_product_stock-p_quantity;
  UPDATE public.products SET stock_quantity=v_new,in_stock=(v_new>0),updated_at=now() WHERE id=p_product_id;
  INSERT INTO public.project_material_allocations(project_id,product_id,warehouse_id,quantity_allocated,notes,allocated_by) VALUES(p_project_id,p_product_id,p_warehouse_id,p_quantity,p_notes,v_user) RETURNING id INTO v_alloc;
  INSERT INTO public.inventory_movements(product_id,warehouse_id,movement_type,quantity,previous_stock,new_stock,reference_type,reference_id,notes,created_by)
  VALUES(p_product_id,p_warehouse_id,'out',p_quantity,v_product_stock,v_new,'project_allocation',v_alloc::text,COALESCE(p_notes,'Allocated to project'),v_user);
  RETURN jsonb_build_object('success',true,'allocation_id',v_alloc,'warehouse_stock',v_stock-p_quantity,'product_stock',v_new);
END; $$;

CREATE OR REPLACE FUNCTION public.create_project_issue(
  p_project_id uuid, p_title text, p_description text DEFAULT NULL, p_severity text DEFAULT 'medium', p_assigned_to uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_user uuid; v_id uuid;
BEGIN
  v_user := private.require_staff_permission('projects','insert');
  IF p_severity NOT IN ('low','medium','high','critical') THEN RAISE EXCEPTION 'Invalid issue severity'; END IF;
  IF nullif(trim(p_title),'') IS NULL THEN RAISE EXCEPTION 'Issue title is required'; END IF;
  INSERT INTO public.project_issues(project_id,title,description,severity,assigned_to,created_by) VALUES(p_project_id,trim(p_title),p_description,p_severity,p_assigned_to,v_user) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.resolve_project_issue(
  p_issue_id uuid, p_status text, p_resolution text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_user uuid; v_id uuid;
BEGIN
  v_user := private.require_staff_permission('projects','update');
  IF p_status NOT IN ('open','in_progress','resolved','closed') THEN RAISE EXCEPTION 'Invalid issue status'; END IF;
  UPDATE public.project_issues SET status=p_status,resolution=COALESCE(p_resolution,resolution),resolved_at=CASE WHEN p_status IN ('resolved','closed') THEN COALESCE(resolved_at,now()) ELSE resolved_at END,updated_at=now() WHERE id=p_issue_id RETURNING id INTO v_id;
  IF v_id IS NULL THEN RETURN jsonb_build_object('success',false,'error','Issue not found'); END IF;
  RETURN jsonb_build_object('success',true,'issue_id',v_id,'status',p_status,'updated_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.complete_project_with_signoff(
  p_project_id uuid, p_approved boolean, p_customer_name text DEFAULT NULL, p_signature text DEFAULT NULL, p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_user uuid; v_customer uuid; v_signoff uuid; v_id uuid;
BEGIN
  v_user := private.require_staff_permission('projects','update');
  SELECT customer_id INTO v_customer FROM public.projects WHERE id=p_project_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Project not found'); END IF;
  INSERT INTO public.project_signoffs(project_id,customer_id,approved,customer_name,signature,notes,signed_at,captured_by) VALUES(p_project_id,v_customer,p_approved,p_customer_name,p_signature,p_notes,CASE WHEN p_approved THEN now() ELSE NULL END,v_user) RETURNING id INTO v_signoff;
  UPDATE public.projects SET customer_approval=p_approved, completion_notes=COALESCE(p_notes,completion_notes), status=CASE WHEN p_approved THEN 'completed' ELSE status END, progress_percentage=CASE WHEN p_approved THEN 100 ELSE progress_percentage END, completion_date=CASE WHEN p_approved THEN COALESCE(completion_date,current_date) ELSE completion_date END, updated_at=now() WHERE id=p_project_id RETURNING id INTO v_id;
  RETURN jsonb_build_object('success',true,'project_id',v_id,'signoff_id',v_signoff,'approved',p_approved);
END; $$;

GRANT EXECUTE ON FUNCTION public.update_project_progress(uuid,integer,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_project_task(uuid,text,text,date,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_project_task(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_project_material(uuid,uuid,uuid,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_project_issue(uuid,text,text,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_project_issue(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_project_with_signoff(uuid,boolean,text,text,text) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_material_allocations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_issues TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_signoffs TO authenticated;

DROP POLICY IF EXISTS project_tasks_staff_read ON public.project_tasks;
CREATE POLICY project_tasks_staff_read ON public.project_tasks FOR SELECT TO authenticated USING (private.current_user_has_permission('projects','read'));
DROP POLICY IF EXISTS project_tasks_staff_insert ON public.project_tasks;
CREATE POLICY project_tasks_staff_insert ON public.project_tasks FOR INSERT TO authenticated WITH CHECK (private.current_user_has_permission('projects','insert'));
DROP POLICY IF EXISTS project_tasks_staff_update ON public.project_tasks;
CREATE POLICY project_tasks_staff_update ON public.project_tasks FOR UPDATE TO authenticated USING (private.current_user_has_permission('projects','update')) WITH CHECK (private.current_user_has_permission('projects','update'));
DROP POLICY IF EXISTS project_tasks_staff_delete ON public.project_tasks;
CREATE POLICY project_tasks_staff_delete ON public.project_tasks FOR DELETE TO authenticated USING (private.current_user_has_permission('projects','delete'));

DROP POLICY IF EXISTS project_material_staff_read ON public.project_material_allocations;
CREATE POLICY project_material_staff_read ON public.project_material_allocations FOR SELECT TO authenticated USING (private.current_user_has_permission('projects','read'));
DROP POLICY IF EXISTS project_material_staff_insert ON public.project_material_allocations;
CREATE POLICY project_material_staff_insert ON public.project_material_allocations FOR INSERT TO authenticated WITH CHECK (private.current_user_has_permission('inventory','update'));
DROP POLICY IF EXISTS project_material_staff_update ON public.project_material_allocations;
CREATE POLICY project_material_staff_update ON public.project_material_allocations FOR UPDATE TO authenticated USING (private.current_user_has_permission('inventory','update')) WITH CHECK (private.current_user_has_permission('inventory','update'));
DROP POLICY IF EXISTS project_material_staff_delete ON public.project_material_allocations;
CREATE POLICY project_material_staff_delete ON public.project_material_allocations FOR DELETE TO authenticated USING (private.current_user_has_permission('inventory','update'));

DROP POLICY IF EXISTS project_issues_staff_read ON public.project_issues;
CREATE POLICY project_issues_staff_read ON public.project_issues FOR SELECT TO authenticated USING (private.current_user_has_permission('projects','read'));
DROP POLICY IF EXISTS project_issues_staff_insert ON public.project_issues;
CREATE POLICY project_issues_staff_insert ON public.project_issues FOR INSERT TO authenticated WITH CHECK (private.current_user_has_permission('projects','insert'));
DROP POLICY IF EXISTS project_issues_staff_update ON public.project_issues;
CREATE POLICY project_issues_staff_update ON public.project_issues FOR UPDATE TO authenticated USING (private.current_user_has_permission('projects','update')) WITH CHECK (private.current_user_has_permission('projects','update'));
DROP POLICY IF EXISTS project_issues_staff_delete ON public.project_issues;
CREATE POLICY project_issues_staff_delete ON public.project_issues FOR DELETE TO authenticated USING (private.current_user_has_permission('projects','delete'));

DROP POLICY IF EXISTS project_signoffs_staff_read ON public.project_signoffs;
CREATE POLICY project_signoffs_staff_read ON public.project_signoffs FOR SELECT TO authenticated USING (private.current_user_has_permission('projects','read'));
DROP POLICY IF EXISTS project_signoffs_staff_insert ON public.project_signoffs;
CREATE POLICY project_signoffs_staff_insert ON public.project_signoffs FOR INSERT TO authenticated WITH CHECK (private.current_user_has_permission('projects','insert'));
DROP POLICY IF EXISTS project_signoffs_staff_update ON public.project_signoffs;
CREATE POLICY project_signoffs_staff_update ON public.project_signoffs FOR UPDATE TO authenticated USING (private.current_user_has_permission('projects','update')) WITH CHECK (private.current_user_has_permission('projects','update'));

CREATE TABLE IF NOT EXISTS public.project_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  label text NOT NULL,
  value numeric(12,3) NOT NULL CHECK (value >= 0),
  unit text NOT NULL DEFAULT 'm²',
  notes text,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_measurements_project ON public.project_measurements(project_id);
ALTER TABLE public.project_measurements ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_measurements TO authenticated;
DROP POLICY IF EXISTS project_measurements_staff_read ON public.project_measurements;
CREATE POLICY project_measurements_staff_read ON public.project_measurements FOR SELECT TO authenticated USING (private.current_user_has_permission('projects','read'));
DROP POLICY IF EXISTS project_measurements_staff_insert ON public.project_measurements;
CREATE POLICY project_measurements_staff_insert ON public.project_measurements FOR INSERT TO authenticated WITH CHECK (private.current_user_has_permission('projects','insert'));
DROP POLICY IF EXISTS project_measurements_staff_update ON public.project_measurements;
CREATE POLICY project_measurements_staff_update ON public.project_measurements FOR UPDATE TO authenticated USING (private.current_user_has_permission('projects','update')) WITH CHECK (private.current_user_has_permission('projects','update'));
DROP POLICY IF EXISTS project_measurements_staff_delete ON public.project_measurements;
CREATE POLICY project_measurements_staff_delete ON public.project_measurements FOR DELETE TO authenticated USING (private.current_user_has_permission('projects','delete'));

CREATE OR REPLACE FUNCTION public.schedule_project_installation(
  p_project_id uuid, p_order_id uuid DEFAULT NULL, p_scheduled_date date DEFAULT NULL, p_scheduled_time time DEFAULT NULL, p_assigned_team jsonb DEFAULT '[]'::jsonb, p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_user uuid; v_id uuid; v_no text;
BEGIN
  v_user := private.require_staff_permission('projects','insert');
  IF p_scheduled_date IS NULL THEN RAISE EXCEPTION 'Installation date is required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id=p_project_id) THEN RAISE EXCEPTION 'Project not found'; END IF;
  v_id := gen_random_uuid(); v_no := 'INS-' || to_char(now(),'YYYYMMDDHH24MISS') || '-' || substr(replace(v_id::text,'-',''),1,6);
  INSERT INTO public.installations(id,installation_number,order_id,project_id,scheduled_date,scheduled_time,assigned_team,status,notes) VALUES(v_id,v_no,p_order_id,p_project_id,p_scheduled_date,p_scheduled_time,COALESCE(p_assigned_team,'[]'::jsonb),'scheduled',p_notes);
  UPDATE public.projects SET status='scheduled',start_date=COALESCE(start_date,p_scheduled_date),updated_at=now() WHERE id=p_project_id;
  RETURN jsonb_build_object('success',true,'installation_id',v_id,'installation_number',v_no,'scheduled_date',p_scheduled_date,'created_by',v_user);
END; $$;
GRANT EXECUTE ON FUNCTION public.schedule_project_installation(uuid,uuid,date,time,jsonb,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_project_measurement(
  p_project_id uuid, p_label text, p_value numeric, p_unit text DEFAULT 'm²', p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_user uuid; v_id uuid;
BEGIN
  v_user := private.require_staff_permission('projects','insert');
  IF nullif(trim(p_label),'') IS NULL OR p_value < 0 THEN RAISE EXCEPTION 'Invalid measurement'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id=p_project_id) THEN RAISE EXCEPTION 'Project not found'; END IF;
  INSERT INTO public.project_measurements(project_id,label,value,unit,notes,recorded_by) VALUES(p_project_id,trim(p_label),p_value,COALESCE(NULLIF(trim(p_unit),''),'m²'),p_notes,v_user) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.record_project_measurement(uuid,text,numeric,text,text) TO authenticated;
