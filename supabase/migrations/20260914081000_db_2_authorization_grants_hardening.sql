-- DB-2: remove anonymous mutation privileges from internal operational tables.
REVOKE ALL PRIVILEGES ON TABLE
  public.commercial_lifecycle_events,
  public.customer_communications,
  public.lead_activities,
  public.project_issues,
  public.project_material_allocations,
  public.project_measurements,
  public.project_signoffs,
  public.project_tasks,
  public.rpc_authorization_certifications,
  public.sales_tasks,
  public.staff_invitations,
  public.staff_permissions,
  public.staff_profiles,
  public.staff_role_assignments,
  public.staff_role_permissions,
  public.staff_roles
FROM anon;

GRANT INSERT ON TABLE
  public.contact_messages,
  public.leads,
  public.page_visits,
  public.quotations
TO anon;
