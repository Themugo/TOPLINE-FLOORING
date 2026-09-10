-- Phases 21-23: finance integrity, customer communications, analytics
CREATE OR REPLACE FUNCTION public.create_invoice_transaction(
  p_customer_id uuid DEFAULT NULL, p_order_id uuid DEFAULT NULL, p_quotation_id uuid DEFAULT NULL,
  p_customer_name text DEFAULT NULL, p_customer_email text DEFAULT NULL, p_customer_phone text DEFAULT NULL,
  p_billing_address text DEFAULT NULL, p_tax_rate numeric DEFAULT 16, p_due_date date DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_id uuid; v_no text;
BEGIN
 v_user:=private.require_staff_permission('invoices','insert');
 IF nullif(trim(coalesce(p_customer_name,'')),'') IS NULL THEN RAISE EXCEPTION 'Customer name is required'; END IF;
 IF p_tax_rate < 0 OR p_tax_rate > 100 THEN RAISE EXCEPTION 'Invalid tax rate'; END IF;
 v_id:=gen_random_uuid(); v_no:='INV-'||to_char(now(),'YYYYMMDDHH24MISS')||'-'||substr(replace(v_id::text,'-',''),1,6);
 INSERT INTO public.invoices(id,invoice_number,customer_id,order_id,quotation_id,customer_name,customer_email,customer_phone,billing_address,status,tax_rate,due_date,notes) VALUES(v_id,v_no,p_customer_id,p_order_id,p_quotation_id,trim(p_customer_name),nullif(trim(p_customer_email),''),nullif(trim(p_customer_phone),''),p_billing_address,'draft',p_tax_rate,p_due_date,p_notes);
 RETURN jsonb_build_object('success',true,'invoice_id',v_id,'invoice_number',v_no,'created_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.add_invoice_item_transaction(p_invoice_id uuid,p_description text,p_quantity numeric,p_unit_price numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_sub numeric; v_tax numeric; v_total numeric; v_taxrate numeric;
BEGIN
 v_user:=private.require_staff_permission('invoices','update');
 IF p_quantity <= 0 OR p_unit_price < 0 OR nullif(trim(p_description),'') IS NULL THEN RAISE EXCEPTION 'Invalid invoice item'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.invoices WHERE id=p_invoice_id AND status NOT IN ('paid','cancelled')) THEN RAISE EXCEPTION 'Invoice unavailable for editing'; END IF;
 INSERT INTO public.invoice_items(invoice_id,description,quantity,unit_price) VALUES(p_invoice_id,trim(p_description),p_quantity,p_unit_price);
 SELECT COALESCE(sum(line_total),0),tax_rate INTO v_sub,v_taxrate FROM public.invoice_items ii JOIN public.invoices i ON i.id=ii.invoice_id WHERE ii.invoice_id=p_invoice_id GROUP BY i.tax_rate;
 v_tax:=round(v_sub*v_taxrate/100,2); v_total:=v_sub+v_tax;
 UPDATE public.invoices SET subtotal=v_sub,tax_amount=v_tax,total_amount=v_total,updated_at=now() WHERE id=p_invoice_id;
 RETURN jsonb_build_object('success',true,'subtotal',v_sub,'tax_amount',v_tax,'total_amount',v_total,'updated_by',v_user);
END; $$;

CREATE OR REPLACE FUNCTION public.record_invoice_payment_transaction(p_invoice_id uuid,p_amount numeric,p_method text,p_reference text DEFAULT NULL,p_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_total numeric; v_paid numeric; v_new numeric; v_status text; v_id uuid;
BEGIN
 v_user:=private.require_staff_permission('invoices','update');
 IF p_amount <= 0 THEN RAISE EXCEPTION 'Payment amount must be positive'; END IF;
 IF p_method NOT IN ('cash','mpesa','bank_transfer','card','cheque','other') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;
 SELECT total_amount,amount_paid INTO v_total,v_paid FROM public.invoices WHERE id=p_invoice_id FOR UPDATE;
 IF NOT FOUND OR EXISTS(SELECT 1 FROM public.invoices WHERE id=p_invoice_id AND status='cancelled') THEN RAISE EXCEPTION 'Invoice unavailable'; END IF;
 v_new:=v_paid+p_amount; IF v_new > v_total THEN RAISE EXCEPTION 'Payment exceeds invoice balance'; END IF;
 INSERT INTO public.payments(invoice_id,amount,method,reference,recorded_by,notes) VALUES(p_invoice_id,p_amount,p_method,nullif(trim(p_reference),''),v_user,p_notes) RETURNING id INTO v_id;
 v_status:=CASE WHEN v_new >= v_total THEN 'paid' ELSE 'partial' END;
 UPDATE public.invoices SET amount_paid=v_new,status=v_status,updated_at=now() WHERE id=p_invoice_id;
 RETURN jsonb_build_object('success',true,'payment_id',v_id,'amount_paid',v_new,'balance_due',v_total-v_new,'status',v_status);
END; $$;

CREATE OR REPLACE FUNCTION public.update_invoice_status_transaction(p_invoice_id uuid,p_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid;
BEGIN
 v_user:=private.require_staff_permission('invoices','update');
 IF p_status NOT IN ('draft','sent','paid','partial','overdue','cancelled') THEN RAISE EXCEPTION 'Invalid invoice status'; END IF;
 UPDATE public.invoices SET status=p_status,updated_at=now() WHERE id=p_invoice_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
 RETURN jsonb_build_object('success',true,'invoice_id',p_invoice_id,'status',p_status,'updated_by',v_user);
END; $$;

CREATE TABLE IF NOT EXISTS public.customer_communications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
 project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL, order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
 invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL, channel text NOT NULL CHECK(channel IN ('email','whatsapp','phone','sms','note')),
 direction text NOT NULL DEFAULT 'outbound' CHECK(direction IN ('inbound','outbound')), subject text, message text NOT NULL,
 status text NOT NULL DEFAULT 'logged' CHECK(status IN ('draft','logged','sent','failed')), external_reference text,
 created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_communications_customer_idx ON public.customer_communications(customer_id,created_at DESC);
ALTER TABLE public.customer_communications ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON public.customer_communications TO authenticated;
DROP POLICY IF EXISTS customer_communications_read ON public.customer_communications;
CREATE POLICY customer_communications_read ON public.customer_communications FOR SELECT TO authenticated USING(private.current_user_has_permission('customers','read'));
DROP POLICY IF EXISTS customer_communications_write ON public.customer_communications;
CREATE POLICY customer_communications_write ON public.customer_communications FOR INSERT TO authenticated WITH CHECK(private.current_user_has_permission('customers','update'));

CREATE OR REPLACE FUNCTION public.log_customer_communication(p_customer_id uuid,p_channel text,p_message text,p_subject text DEFAULT NULL,p_direction text DEFAULT 'outbound',p_project_id uuid DEFAULT NULL,p_order_id uuid DEFAULT NULL,p_invoice_id uuid DEFAULT NULL,p_status text DEFAULT 'logged',p_external_reference text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_id uuid;
BEGIN
 v_user:=private.require_staff_permission('customers','update');
 IF p_channel NOT IN ('email','whatsapp','phone','sms','note') OR p_direction NOT IN ('inbound','outbound') OR nullif(trim(p_message),'') IS NULL THEN RAISE EXCEPTION 'Invalid communication'; END IF;
 INSERT INTO public.customer_communications(customer_id,project_id,order_id,invoice_id,channel,direction,subject,message,status,external_reference,created_by) VALUES(p_customer_id,p_project_id,p_order_id,p_invoice_id,p_channel,p_direction,p_subject,trim(p_message),coalesce(p_status,'logged'),p_external_reference,v_user) RETURNING id INTO v_id;
 RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_business_analytics(p_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_user uuid; v_since timestamptz; v_result jsonb;
BEGIN
 v_user:=private.require_staff_permission('reports','read'); v_since:=now()-make_interval(days=>greatest(1,least(coalesce(p_days,30),365)));
 SELECT jsonb_build_object(
  'days',greatest(1,least(coalesce(p_days,30),365)),
  'visits',(SELECT count(*) FROM public.page_visits WHERE visited_at>=v_since),
  'unique_paths',(SELECT count(DISTINCT page_path) FROM public.page_visits WHERE visited_at>=v_since),
  'orders',(SELECT count(*) FROM public.orders WHERE created_at>=v_since),
  'sales',(SELECT COALESCE(sum(total_amount),0) FROM public.orders WHERE created_at>=v_since AND status<>'cancelled'),
  'invoiced',(SELECT COALESCE(sum(total_amount),0) FROM public.invoices WHERE created_at>=v_since AND status<>'cancelled'),
  'collected',(SELECT COALESCE(sum(amount),0) FROM public.payments WHERE paid_at>=v_since),
  'outstanding',(SELECT COALESCE(sum(total_amount-amount_paid),0) FROM public.invoices WHERE status NOT IN ('paid','cancelled')),
  'top_pages',(SELECT COALESCE(jsonb_agg(x ORDER BY x.visits DESC),'[]'::jsonb) FROM (SELECT page_path,count(*) visits FROM public.page_visits WHERE visited_at>=v_since GROUP BY page_path ORDER BY count(*) DESC LIMIT 10)x)
 ) INTO v_result;
 RETURN v_result;
END; $$;

GRANT EXECUTE ON FUNCTION public.create_invoice_transaction(uuid,uuid,uuid,text,text,text,text,numeric,date,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_invoice_item_transaction(uuid,text,numeric,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_invoice_payment_transaction(uuid,numeric,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_invoice_status_transaction(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_customer_communication(uuid,text,text,text,text,uuid,uuid,uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_analytics(integer) TO authenticated;
