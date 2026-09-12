-- Phase 12: Customer Portal 360 — secure self-service visibility across the customer lifecycle.
-- Read access is exposed through one SECURITY DEFINER RPC so the portal never needs broad table privileges.

CREATE OR REPLACE FUNCTION public.get_customer_portal_360()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  cid uuid;
BEGIN
  cid := public.get_current_customer_id();
  IF cid IS NULL THEN
    RAISE EXCEPTION 'Customer portal access is not available for this account';
  END IF;

  RETURN jsonb_build_object(
    'customer', (
      SELECT to_jsonb(c)
      FROM public.customers c
      WHERE c.id = cid
    ),
    'quotations', COALESCE((
      SELECT jsonb_agg(to_jsonb(q) ORDER BY q.created_at DESC)
      FROM public.quotations q
      WHERE q.customer_id = cid
         OR (q.customer_id IS NULL AND lower(q.email) = lower((SELECT c.email FROM public.customers c WHERE c.id = cid)))
    ), '[]'::jsonb),
    'orders', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', o.id,
        'order_number', o.order_number,
        'status', o.status,
        'total_amount', o.total_amount,
        'created_at', o.created_at,
        'notes', o.notes,
        'items', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'product_name', oi.product_name,
            'quantity', oi.quantity,
            'unit', oi.unit,
            'unit_price', oi.unit_price
          ) ORDER BY oi.created_at)
          FROM public.order_items oi
          WHERE oi.order_id = o.id
        ), '[]'::jsonb)
      ) ORDER BY o.created_at DESC)
      FROM public.orders o
      WHERE o.customer_id = cid
         OR (o.customer_id IS NULL AND lower(o.customer_email) = lower((SELECT c.email FROM public.customers c WHERE c.id = cid)))
    ), '[]'::jsonb),
    'projects', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id,
        'project_number', p.project_number,
        'title', p.title,
        'project_type', p.project_type,
        'service_type', p.service_type,
        'location', p.location,
        'status', p.status,
        'progress_percentage', p.progress_percentage,
        'progress_notes', p.progress_notes,
        'start_date', p.start_date,
        'end_date', p.end_date,
        'completion_date', p.completion_date,
        'project_value', p.project_value,
        'description', p.description,
        'completion_notes', p.completion_notes
      ) ORDER BY p.created_at DESC)
      FROM public.projects p
      WHERE p.customer_id = cid
    ), '[]'::jsonb),
    'invoices', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id,
        'invoice_number', i.invoice_number,
        'status', i.status,
        'subtotal', i.subtotal,
        'tax_amount', i.tax_amount,
        'total_amount', i.total_amount,
        'amount_paid', i.amount_paid,
        'due_date', i.due_date,
        'pdf_url', i.pdf_url,
        'created_at', i.created_at,
        'notes', i.notes,
        'items', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'description', ii.description,
            'quantity', ii.quantity,
            'unit_price', ii.unit_price,
            'line_total', ii.line_total
          ) ORDER BY ii.display_order, ii.created_at)
          FROM public.invoice_items ii
          WHERE ii.invoice_id = i.id
        ), '[]'::jsonb)
      ) ORDER BY i.created_at DESC)
      FROM public.invoices i
      WHERE i.customer_id = cid
    ), '[]'::jsonb),
    'service_cases', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s.id,
        'case_number', s.case_number,
        'type', s.type,
        'status', s.status,
        'priority', s.priority,
        'issue_title', s.issue_title,
        'description', s.description,
        'reported_at', s.reported_at,
        'scheduled_date', s.scheduled_date,
        'resolution', s.resolution,
        'resolved_at', s.resolved_at,
        'project_id', s.project_id,
        'order_id', s.order_id
      ) ORDER BY s.created_at DESC)
      FROM public.service_cases s
      WHERE s.customer_id = cid
    ), '[]'::jsonb),
    'site_visits', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', v.id,
        'scheduled_date', v.scheduled_date,
        'scheduled_time', v.scheduled_time,
        'visit_type', v.visit_type,
        'status', v.status,
        'visit_notes', v.visit_notes,
        'project_id', v.project_id,
        'quotation_id', v.quotation_id
      ) ORDER BY v.scheduled_date DESC NULLS LAST, v.created_at DESC)
      FROM public.site_visits v
      WHERE v.customer_id = cid
    ), '[]'::jsonb),
    'installations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', ins.id,
        'installation_number', ins.installation_number,
        'scheduled_date', ins.scheduled_date,
        'scheduled_time', ins.scheduled_time,
        'status', ins.status,
        'notes', ins.notes,
        'progress_photos', ins.progress_photos,
        'customer_confirmation', ins.customer_confirmation,
        'completion_certificate', ins.completion_certificate,
        'project_id', ins.project_id,
        'order_id', ins.order_id
      ) ORDER BY ins.scheduled_date DESC NULLS LAST, ins.created_at DESC)
      FROM public.installations ins
      LEFT JOIN public.projects p ON p.id = ins.project_id
      LEFT JOIN public.orders o ON o.id = ins.order_id
      WHERE p.customer_id = cid OR o.customer_id = cid
    ), '[]'::jsonb),
    'summary', jsonb_build_object(
      'active_projects', (SELECT count(*) FROM public.projects p WHERE p.customer_id = cid AND p.status IN ('pending','scheduled','in_progress')),
      'open_orders', (SELECT count(*) FROM public.orders o WHERE o.customer_id = cid AND o.status NOT IN ('completed','cancelled')),
      'outstanding_invoices', COALESCE((SELECT sum(GREATEST(i.total_amount - i.amount_paid, 0)) FROM public.invoices i WHERE i.customer_id = cid AND i.status NOT IN ('paid','cancelled')), 0),
      'open_service_cases', (SELECT count(*) FROM public.service_cases s WHERE s.customer_id = cid AND s.status NOT IN ('resolved','closed','rejected'))
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_customer_portal_360() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_customer_portal_360() TO authenticated;
