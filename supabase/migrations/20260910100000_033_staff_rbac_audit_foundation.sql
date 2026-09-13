-- ============================================================
-- 033: Topline Staff, RBAC, RLS and Audit Foundation
--
-- This migration establishes the single-business authorization model.
-- It does NOT create or manage a Supabase project. It is designed to be
-- deployed only to the dedicated Topline Supabase project.
--
-- Security model:
--   auth.users                = identity / authentication
--   staff_profiles            = Topline staff membership
--   staff_roles               = named business roles
--   staff_permissions         = granular resource/action permissions
--   staff_role_permissions    = role -> permission mapping
--   staff_role_assignments    = user -> role assignment
--   staff_invitations         = owner/admin controlled onboarding
--   activity_logs             = append-only audit trail with actor identity
--
-- Authorization data is NEVER read from user-editable user_metadata.
-- RLS calls private SECURITY DEFINER helpers with a fixed search_path.
-- ============================================================

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Retire the historical auth.role()-based admin helper. RBAC is now the sole authorization model.
drop function if exists public.is_admin() cascade;

-- ------------------------------------------------------------
-- Staff identity and RBAC tables
-- ------------------------------------------------------------

create table if not exists public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  phone text,
  job_title text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.staff_permissions (
  id uuid primary key default gen_random_uuid(),
  resource text not null,
  action text not null check (action in ('select','insert','update','delete','manage')),
  description text,
  created_at timestamptz not null default now(),
  unique(resource, action)
);

create table if not exists public.staff_role_permissions (
  role_id uuid not null references public.staff_roles(id) on delete cascade,
  permission_id uuid not null references public.staff_permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(role_id, permission_id)
);

create table if not exists public.staff_role_assignments (
  user_id uuid not null references public.staff_profiles(user_id) on delete cascade,
  role_id uuid not null references public.staff_roles(id) on delete restrict,
  assigned_by uuid references public.staff_profiles(user_id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key(user_id, role_id)
);

create table if not exists public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role_id uuid not null references public.staff_roles(id) on delete restrict,
  invited_by uuid not null references public.staff_profiles(user_id) on delete restrict,
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_user_id uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create index if not exists idx_staff_role_assignments_user
  on public.staff_role_assignments(user_id);
create index if not exists idx_staff_role_assignments_role
  on public.staff_role_assignments(role_id);
create index if not exists idx_staff_invitations_email
  on public.staff_invitations(lower(email));
create index if not exists idx_staff_invitations_active
  on public.staff_invitations(email, expires_at)
  where accepted_at is null and revoked_at is null;

-- ------------------------------------------------------------
-- Updated-at helper
-- ------------------------------------------------------------

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

 drop trigger if exists trg_staff_profiles_updated_at on public.staff_profiles;
create trigger trg_staff_profiles_updated_at
before update on public.staff_profiles
for each row execute function private.touch_updated_at();

-- ------------------------------------------------------------
-- Seed the system roles and permission catalogue.
-- ------------------------------------------------------------

insert into public.staff_roles(code, name, description)
values
  ('owner', 'Owner', 'Full control of the Topline business and staff.'),
  ('admin', 'Administrator', 'Full operational administration excluding ownership transfer.'),
  ('manager', 'Manager', 'Cross-functional management access.'),
  ('sales', 'Sales & CRM', 'Leads, customers, quotations and order-facing workflows.'),
  ('operations', 'Operations', 'Projects, inventory, procurement, deliveries and warehouses.'),
  ('finance', 'Finance', 'Orders, invoices, payments and financial reporting.'),
  ('marketing', 'Marketing & Content', 'Website content, media, promotions and SEO.'),
  ('staff', 'Staff', 'Standard internal operational access.')
on conflict(code) do nothing;

insert into public.staff_permissions(resource, action, description)
select v.resource, v.action, v.description
from (values
  ('dashboard','select','View internal dashboards'),
  ('staff','select','View staff and role assignments'),
  ('staff','insert','Invite staff'),
  ('staff','update','Update staff membership and roles'),
  ('staff','delete','Deactivate staff membership'),
  ('customers','select','View customers'), ('customers','insert','Create customers'), ('customers','update','Update customers'), ('customers','delete','Delete customers'),
  ('leads','select','View leads'), ('leads','insert','Create leads'), ('leads','update','Update leads'), ('leads','delete','Delete leads'),
  ('quotations','select','View quotations'), ('quotations','insert','Create quotations'), ('quotations','update','Update quotations'), ('quotations','delete','Delete quotations'),
  ('orders','select','View orders'), ('orders','insert','Create orders'), ('orders','update','Update orders'), ('orders','delete','Delete orders'),
  ('invoices','select','View invoices'), ('invoices','insert','Create invoices'), ('invoices','update','Update invoices'), ('invoices','delete','Delete invoices'),
  ('payments','select','View payments'), ('payments','insert','Create payments'), ('payments','update','Update payments'), ('payments','delete','Delete payments'),
  ('projects','select','View projects'), ('projects','insert','Create projects'), ('projects','update','Update projects'), ('projects','delete','Delete projects'),
  ('inventory','select','View inventory'), ('inventory','insert','Adjust inventory'), ('inventory','update','Update inventory'), ('inventory','delete','Delete inventory'),
  ('procurement','select','View procurement'), ('procurement','insert','Create purchase orders'), ('procurement','update','Update procurement'), ('procurement','delete','Delete procurement'),
  ('warehouses','select','View warehouses'), ('warehouses','insert','Manage warehouses'), ('warehouses','update','Update warehouses'), ('warehouses','delete','Delete warehouses'),
  ('content','select','View website content'), ('content','insert','Create website content'), ('content','update','Update website content'), ('content','delete','Delete website content'),
  ('media','select','View media'), ('media','insert','Upload media'), ('media','update','Update media'), ('media','delete','Delete media'),
  ('marketing','select','View marketing'), ('marketing','insert','Create marketing items'), ('marketing','update','Update marketing items'), ('marketing','delete','Delete marketing items'),
  ('reports','select','View reports'),
  ('audit','select','View audit logs'),
  ('settings','select','View system settings'), ('settings','update','Update system settings'),
  ('catalog','select','View catalogue'), ('catalog','insert','Create catalogue data'), ('catalog','update','Update catalogue data'), ('catalog','delete','Delete catalogue data')
) as v(resource, action, description)
on conflict(resource, action) do nothing;

-- Owner/admin get every permission. Other roles receive least-privilege bundles.
insert into public.staff_role_permissions(role_id, permission_id)
select r.id, p.id
from public.staff_roles r
cross join public.staff_permissions p
where r.code in ('owner','admin')
on conflict do nothing;

insert into public.staff_role_permissions(role_id, permission_id)
select r.id, p.id
from public.staff_roles r
join public.staff_permissions p on (
  (r.code = 'manager' and p.resource in ('dashboard','staff','customers','leads','quotations','orders','projects','inventory','procurement','warehouses','reports','audit','catalog','content'))
  or (r.code = 'sales' and p.resource in ('dashboard','customers','leads','quotations','orders'))
  or (r.code = 'operations' and p.resource in ('dashboard','customers','leads','quotations','orders','projects','inventory','procurement','warehouses','reports'))
  or (r.code = 'finance' and p.resource in ('dashboard','customers','orders','invoices','payments','reports'))
  or (r.code = 'marketing' and p.resource in ('dashboard','content','media','marketing','catalog','reports'))
  or (r.code = 'staff' and p.resource in ('dashboard','customers','leads','quotations','projects'))
)
on conflict do nothing;

-- ------------------------------------------------------------
-- Private authorization helpers.
-- These are deliberately outside the exposed public schema.
-- ------------------------------------------------------------

create or replace function private.current_user_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.staff_profiles sp
    where sp.user_id = (select auth.uid())
      and sp.is_active = true
  );
$$;

create or replace function private.current_user_has_permission(p_resource text, p_action text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.staff_profiles sp
    join public.staff_role_assignments sra on sra.user_id = sp.user_id
    join public.staff_roles sr on sr.id = sra.role_id
    join public.staff_role_permissions srp on srp.role_id = sr.id
    join public.staff_permissions p on p.id = srp.permission_id
    where sp.user_id = (select auth.uid())
      and sp.is_active = true
      and p.resource = p_resource
      and (p.action = p_action or p.action = 'manage')
  );
$$;

revoke all on function private.current_user_is_staff() from public, anon, authenticated;
revoke all on function private.current_user_has_permission(text,text) from public, anon, authenticated;

-- Public RPC: returns only the current user's own staff profile/roles.
create or replace function public.get_current_staff_profile()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_build_object(
    'user_id', sp.user_id,
    'display_name', sp.display_name,
    'phone', sp.phone,
    'job_title', sp.job_title,
    'is_active', sp.is_active,
    'roles', coalesce((
      select jsonb_agg(jsonb_build_object('code', sr.code, 'name', sr.name) order by sr.code)
      from public.staff_role_assignments sra
      join public.staff_roles sr on sr.id = sra.role_id
      where sra.user_id = sp.user_id
    ), '[]'::jsonb)
  ), '{}'::jsonb)
  from public.staff_profiles sp
  where sp.user_id = (select auth.uid())
    and sp.is_active = true;
$$;

revoke all on function public.get_current_staff_profile() from public, anon;
grant execute on function public.get_current_staff_profile() to authenticated;

-- ------------------------------------------------------------
-- RLS on RBAC tables.
-- ------------------------------------------------------------

alter table public.staff_profiles enable row level security;
alter table public.staff_roles enable row level security;
alter table public.staff_permissions enable row level security;
alter table public.staff_role_permissions enable row level security;
alter table public.staff_role_assignments enable row level security;
alter table public.staff_invitations enable row level security;

grant select, insert, update, delete on table public.staff_profiles to authenticated;
grant select, insert, update, delete on table public.staff_roles to authenticated;
grant select on table public.staff_permissions to authenticated;
grant select, insert, update, delete on table public.staff_role_permissions to authenticated;
grant select, insert, update, delete on table public.staff_role_assignments to authenticated;
grant select, insert, update, delete on table public.staff_invitations to authenticated;


create policy staff_profiles_self_read
  on public.staff_profiles for select to authenticated
  using (user_id = (select auth.uid()) or private.current_user_has_permission('staff','select'));

create policy staff_profiles_admin_insert
  on public.staff_profiles for insert to authenticated
  with check (private.current_user_has_permission('staff','insert'));

create policy staff_profiles_admin_update
  on public.staff_profiles for update to authenticated
  using (private.current_user_has_permission('staff','update'))
  with check (private.current_user_has_permission('staff','update'));

create policy staff_profiles_admin_delete
  on public.staff_profiles for delete to authenticated
  using (private.current_user_has_permission('staff','delete'));

create policy staff_roles_staff_read
  on public.staff_roles for select to authenticated
  using (private.current_user_has_permission('staff','select'));

create policy staff_roles_admin_update
  on public.staff_roles for update to authenticated
  using (private.current_user_has_permission('staff','update'))
  with check (private.current_user_has_permission('staff','update'));

create policy staff_permissions_staff_read
  on public.staff_permissions for select to authenticated
  using (private.current_user_has_permission('staff','select'));

create policy staff_role_permissions_staff_read
  on public.staff_role_permissions for select to authenticated
  using (private.current_user_has_permission('staff','select'));

create policy staff_role_permissions_admin_insert
  on public.staff_role_permissions for insert to authenticated
  with check (private.current_user_has_permission('staff','update'));

create policy staff_role_permissions_admin_delete
  on public.staff_role_permissions for delete to authenticated
  using (private.current_user_has_permission('staff','update'));

create policy staff_role_assignments_staff_read
  on public.staff_role_assignments for select to authenticated
  using (user_id = (select auth.uid()) or private.current_user_has_permission('staff','select'));

create policy staff_role_assignments_admin_insert
  on public.staff_role_assignments for insert to authenticated
  with check (private.current_user_has_permission('staff','update'));

create policy staff_role_assignments_admin_update
  on public.staff_role_assignments for update to authenticated
  using (private.current_user_has_permission('staff','update'))
  with check (private.current_user_has_permission('staff','update'));

create policy staff_role_assignments_admin_delete
  on public.staff_role_assignments for delete to authenticated
  using (private.current_user_has_permission('staff','delete'));

create policy staff_invitations_admin_insert
  on public.staff_invitations for insert to authenticated
  with check (private.current_user_has_permission('staff','insert'));

create policy staff_invitations_admin_update
  on public.staff_invitations for update to authenticated
  using (private.current_user_has_permission('staff','update'))
  with check (private.current_user_has_permission('staff','update'));

create policy staff_invitations_admin_delete
  on public.staff_invitations for delete to authenticated
  using (private.current_user_has_permission('staff','delete'));

-- ------------------------------------------------------------
-- Replace historical authenticated-wide admin policies.
-- The old migrations intentionally remain immutable history; this migration
-- removes their effective policies from the live database.
-- ------------------------------------------------------------


-- Tables whose SELECT is intentionally public because they power the public site.
do $$
declare
  t text;
  p record;
  public_predicate text;
begin
  foreach t in array array[
    'categories','products','hero_slides','testimonials','partners','services',
    'site_settings','navigation_menus','theme_settings','homepage_sections',
    'product_images','product_specifications','product_variants','product_documents',
    'product_tags','product_tag_relations','product_brands','product_collections','product_collection_relations','delivery_zones',
    'promotions','projects','project_images','project_services','seo_pages',
    'cms_content','faq_items','product_reviews','review_images','media_files'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      public_predicate := case
        when t = 'product_reviews' then 'is_approved = true'
        when t = 'review_images' then 'exists (select 1 from public.product_reviews pr where pr.id = review_id and pr.is_approved = true)'
        when t in ('categories','products','hero_slides','testimonials','partners','services','navigation_menus','theme_settings','homepage_sections','delivery_zones','promotions','projects','product_collections','faq_items') then 'is_active = true'
        when t = 'media_files' then 'is_public = true'
        else 'true'
      end;
      execute format('revoke all on table public.%I from anon, authenticated', t);
      execute format('grant select on table public.%I to anon, authenticated', t);
      for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
        execute format('drop policy if exists %I on public.%I', p.policyname, t);
      end loop;
      execute format('create policy rbac_public_read_%I on public.%I for select to anon, authenticated using (%s)', t, t, public_predicate);
      execute format('grant insert, update, delete on table public.%I to authenticated', t);
      execute format('create policy rbac_%I_insert on public.%I for insert to authenticated with check (private.current_user_has_permission(%L, ''insert''))', t, t, case when t in ('products','categories','product_images','product_specifications','product_variants','product_documents','product_tags','product_tag_relations','product_brands','product_collections','product_collection_relations','product_reviews','review_images') then 'catalog' when t in ('hero_slides','testimonials','partners','services','site_settings','navigation_menus','theme_settings','homepage_sections','cms_content','faq_items','seo_pages') then 'content' when t in ('promotions') then 'marketing' when t in ('media_files') then 'media' when t in ('delivery_zones') then 'orders' else 'projects' end);
      execute format('create policy rbac_%I_update on public.%I for update to authenticated using (private.current_user_has_permission(%L, ''update'')) with check (private.current_user_has_permission(%L, ''update''))', t, t, case when t in ('products','categories','product_images','product_specifications','product_variants','product_documents','product_tags','product_tag_relations','product_brands','product_collections','product_collection_relations','product_reviews','review_images') then 'catalog' when t in ('hero_slides','testimonials','partners','services','site_settings','navigation_menus','theme_settings','homepage_sections','cms_content','faq_items','seo_pages') then 'content' when t in ('promotions') then 'marketing' when t in ('media_files') then 'media' when t in ('delivery_zones') then 'orders' else 'projects' end, case when t in ('products','categories','product_images','product_specifications','product_variants','product_documents','product_tags','product_tag_relations','product_brands','product_collections','product_collection_relations','product_reviews','review_images') then 'catalog' when t in ('hero_slides','testimonials','partners','services','site_settings','navigation_menus','theme_settings','homepage_sections','cms_content','faq_items','seo_pages') then 'content' when t in ('promotions') then 'marketing' when t in ('media_files') then 'media' when t in ('delivery_zones') then 'orders' else 'projects' end);
      execute format('create policy rbac_%I_delete on public.%I for delete to authenticated using (private.current_user_has_permission(%L, ''delete''))', t, t, case when t in ('products','categories','product_images','product_specifications','product_variants','product_documents','product_tags','product_tag_relations','product_brands','product_collections','product_collection_relations','product_reviews','review_images') then 'catalog' when t in ('hero_slides','testimonials','partners','services','site_settings','navigation_menus','theme_settings','homepage_sections','cms_content','faq_items','seo_pages') then 'content' when t in ('promotions') then 'marketing' when t in ('media_files') then 'media' when t in ('delivery_zones') then 'orders' else 'projects' end);
    end if;
  end loop;
end $$;

-- Sensitive/business-operational tables: no anonymous Data API access.
do $$
declare
  t text;
  p record;
  resource text;
begin
  foreach t in array array[
    'customers','orders','order_items','quotations','quotation_items','leads','lead_notes','lead_reminders',
    'invoices','invoice_items','payments','suppliers','purchase_orders','purchase_order_items',
    'installations','customer_portal_access','dashboard_metrics','site_visits','materials','stock_movements',
    'warehouses','warehouse_stock','stock_transfers','inventory_movements','inventory_alerts','deliveries',
    'coupons','activity_logs','media_folders','contact_messages',
    'customer_contact_persons','customer_addresses','communication_history','customer_documents',
    'customer_preferences','customer_notes','wishlists','recently_viewed','product_comparisons'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      resource := case
        when t in ('customers','customer_contact_persons','customer_addresses','customer_documents','customer_preferences','customer_notes','communication_history') then 'customers'
        when t in ('quotations','quotation_items') then 'quotations'
        when t in ('leads','lead_notes','lead_reminders') then 'leads'
        when t in ('orders','order_items') then 'orders'
        when t in ('invoices','invoice_items') then 'invoices'
        when t = 'payments' then 'payments'
        when t in ('suppliers','purchase_orders','purchase_order_items') then 'procurement'
        when t in ('warehouses','warehouse_stock','stock_transfers') then 'warehouses'
        when t in ('inventory_movements','inventory_alerts','stock_movements','materials') then 'inventory'
        when t = 'deliveries' then 'orders'
        when t = 'coupons' then 'marketing'
        when t in ('media_files','media_folders','review_images') then 'media'
        when t = 'activity_logs' then 'audit'
        when t = 'contact_messages' then 'leads'
        else 'customers'
      end;

      for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
        execute format('drop policy if exists %I on public.%I', p.policyname, t);
      end loop;

      execute format('revoke all on table public.%I from anon', t);
      execute format('grant select, insert, update, delete on table public.%I to authenticated', t);

      execute format('create policy rbac_%I_select on public.%I for select to authenticated using (private.current_user_has_permission(%L, ''select''))', t, t, resource);
      execute format('create policy rbac_%I_insert on public.%I for insert to authenticated with check (private.current_user_has_permission(%L, ''insert''))', t, t, resource);
      execute format('create policy rbac_%I_update on public.%I for update to authenticated using (private.current_user_has_permission(%L, ''update'')) with check (private.current_user_has_permission(%L, ''update''))', t, t, resource, resource);
      execute format('create policy rbac_%I_delete on public.%I for delete to authenticated using (private.current_user_has_permission(%L, ''delete''))', t, t, resource);
    end if;
  end loop;
end $$;

-- Public website submissions should use controlled RPCs rather than direct
-- anonymous writes into operational tables. Remove any historical anon table grants.
do $$
declare t text;
begin
  foreach t in array array['customers','orders','order_items','quotations','quotation_items','leads','invoices','payments','contact_messages'] loop
    if to_regclass('public.' || t) is not null then
      execute format('revoke all on table public.%I from anon', t);
    end if;
  end loop;
end $$;

-- Least-privilege cleanup: non-admin roles do not receive destructive permissions.
delete from public.staff_role_permissions srp
using public.staff_roles r, public.staff_permissions p
where srp.role_id = r.id
  and srp.permission_id = p.id
  and r.code in ('manager','sales','operations','finance','marketing','staff')
  and p.action = 'delete';

-- ------------------------------------------------------------
-- Audit trail hardening
-- ------------------------------------------------------------

alter table public.activity_logs
  add column if not exists actor_user_id uuid references auth.users(id) on delete set null,
  add column if not exists actor_email text,
  add column if not exists request_id text;

create index if not exists idx_activity_logs_actor
  on public.activity_logs(actor_user_id, created_at desc);
create index if not exists idx_activity_logs_entity
  on public.activity_logs(entity_type, entity_id, created_at desc);

-- Remove the old exposed SECURITY DEFINER audit function. The replacement lives
-- in the private schema and cannot be called by anon/authenticated clients.
drop function if exists public.audit_log_change() cascade;

create or replace function private.audit_log_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_action text;
  v_entity_id text;
  v_details jsonb;
  v_actor uuid;
  v_email text;
begin
  v_actor := (select auth.uid());
  v_email := (select email from auth.users where id = v_actor);

  if tg_op = 'INSERT' then
    v_action := 'create';
    v_entity_id := coalesce(to_jsonb(new)->>'id', to_jsonb(new)->>'user_id', to_jsonb(new)->>'code', 'unknown');
    v_details := jsonb_build_object('new', to_jsonb(new));
  elsif tg_op = 'UPDATE' then
    v_action := 'update';
    v_entity_id := coalesce(to_jsonb(new)->>'id', to_jsonb(new)->>'user_id', to_jsonb(new)->>'code', 'unknown');
    v_details := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  else
    v_action := 'delete';
    v_entity_id := coalesce(to_jsonb(old)->>'id', to_jsonb(old)->>'user_id', to_jsonb(old)->>'code', 'unknown');
    v_details := jsonb_build_object('old', to_jsonb(old));
  end if;

  insert into public.activity_logs(action, entity_type, entity_id, details, actor_user_id, actor_email)
  values (v_action, tg_table_name, v_entity_id, v_details, v_actor, v_email);

  return coalesce(new, old);
end;
$$;

revoke all on function private.audit_log_change() from public, anon, authenticated;

-- Audit all meaningful operational mutations. Triggers execute with the
-- controlled private function above, while reads remain permission-gated.
do $$
declare
  t text;
begin
  foreach t in array array[
    'customers','orders','quotations','leads','invoices','payments','projects',
    'suppliers','purchase_orders','warehouses','warehouse_stock','stock_transfers',
    'inventory_movements','deliveries','coupons','media_files','site_settings',
    'products','services','staff_profiles','staff_role_assignments'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists trg_topline_audit_%I on public.%I', t, t);
      execute format('create trigger trg_topline_audit_%I after insert or update or delete on public.%I for each row execute function private.audit_log_change()', t, t);
    end if;
  end loop;
end $$;

-- activity_logs is append-only from the application's perspective.
revoke all on table public.activity_logs from anon, authenticated;
grant select on table public.activity_logs to authenticated;
drop policy if exists rbac_activity_logs_select on public.activity_logs;
create policy rbac_activity_logs_select
  on public.activity_logs for select to authenticated
  using (private.current_user_has_permission('audit','select'));

-- No direct client writes to the audit table.

-- ------------------------------------------------------------
-- Staff bootstrap guard
-- ------------------------------------------------------------

create or replace function private.bootstrap_owner(p_user_id uuid, p_display_name text default '')
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role_id uuid;
  v_existing_staff integer;
begin
  if (select auth.uid()) is not null then
    raise exception 'bootstrap_owner is a service-role operation';
  end if;

  select count(*) into v_existing_staff from public.staff_profiles;
  if v_existing_staff > 0 then
    raise exception 'Owner bootstrap has already been completed';
  end if;

  select id into v_role_id from public.staff_roles where code = 'owner';
  if v_role_id is null then
    raise exception 'Owner role is missing';
  end if;

  insert into public.staff_profiles(user_id, display_name, is_active)
  values (p_user_id, coalesce(nullif(trim(p_display_name), ''), 'Topline Owner'), true);

  insert into public.staff_role_assignments(user_id, role_id)
  values (p_user_id, v_role_id);
end;
$$;

revoke all on function private.bootstrap_owner(uuid,text) from public, anon, authenticated;

comment on table public.staff_profiles is 'Topline staff membership; authentication lives in auth.users.';
comment on table public.staff_role_assignments is 'Topline RBAC role assignments; never derive authorization from user_metadata.';
comment on table public.staff_invitations is 'Owner/admin-controlled staff onboarding records.';
comment on table public.activity_logs is 'Append-only audit trail generated by private triggers.';
