-- ============================================================
-- 085: Identity & Privileged Access 360
-- Staff lifecycle, controlled role changes and privileged-access evidence.
-- Authentication remains Supabase Auth; this migration governs business access.
-- ============================================================

create table if not exists public.staff_identity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('onboarded','activated','deactivated','role_granted','role_revoked','access_reviewed','invitation_revoked')),
  role_code text,
  actor_id uuid references auth.users(id) on delete set null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.privileged_access_requests (
  id uuid primary key default gen_random_uuid(),
  requested_user_id uuid not null references auth.users(id) on delete cascade,
  requested_role_id uuid not null references public.staff_roles(id) on delete restrict,
  requested_by uuid not null references auth.users(id) on delete restrict,
  reason text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','revoked','expired')),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  expires_at timestamptz,
  decision_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(reason)) >= 10),
  check (expires_at is null or expires_at > created_at),
  check ((status='pending' and approved_at is null) or (status<>'pending'))
);

create index if not exists idx_staff_identity_events_user on public.staff_identity_events(user_id,created_at desc);
create index if not exists idx_staff_identity_events_type on public.staff_identity_events(event_type,created_at desc);
create index if not exists idx_privileged_access_requests_status on public.privileged_access_requests(status,expires_at,created_at desc);
create index if not exists idx_privileged_access_requests_user on public.privileged_access_requests(requested_user_id,created_at desc);

drop trigger if exists trg_privileged_access_requests_updated_at on public.privileged_access_requests;
create trigger trg_privileged_access_requests_updated_at before update on public.privileged_access_requests for each row execute function private.touch_updated_at();

alter table public.staff_identity_events enable row level security;
alter table public.privileged_access_requests enable row level security;
revoke all on public.staff_identity_events from public, anon, authenticated;
revoke all on public.privileged_access_requests from public, anon, authenticated;


create or replace function public.change_staff_status(p_user_id uuid, p_is_active boolean, p_reason text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare v_actor uuid := private.require_staff_permission('staff','update'); v_owner_count integer;
begin
  if p_user_id = v_actor then raise exception 'You cannot change your own staff status'; end if;
  if length(trim(coalesce(p_reason,''))) < 10 then raise exception 'Reason is required'; end if;
  if not exists(select 1 from public.staff_profiles where user_id=p_user_id) then raise exception 'Staff member not found'; end if;
  if not p_is_active then
    select count(*) into v_owner_count from public.staff_role_assignments ra join public.staff_roles r on r.id=ra.role_id join public.staff_profiles sp on sp.user_id=ra.user_id where r.code='owner' and sp.is_active;
    if exists(select 1 from public.staff_role_assignments ra join public.staff_roles r on r.id=ra.role_id where ra.user_id=p_user_id and r.code='owner') and v_owner_count <= 1 then raise exception 'Cannot deactivate the last active owner'; end if;
  end if;
  update public.staff_profiles set is_active=p_is_active where user_id=p_user_id;
  insert into public.staff_identity_events(user_id,event_type,actor_id,reason,metadata) values(p_user_id,case when p_is_active then 'activated' else 'deactivated' end,v_actor,trim(p_reason),'{}'::jsonb);
  return jsonb_build_object('user_id',p_user_id,'is_active',p_is_active);
end; $$;

create or replace function public.assign_staff_role(p_user_id uuid, p_role_code text, p_reason text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare v_actor uuid := private.require_staff_permission('staff','update'); v_role uuid; v_owner_count integer;
begin
  if length(trim(coalesce(p_reason,''))) < 10 then raise exception 'Reason is required'; end if;
  select id into v_role from public.staff_roles where code=trim(p_role_code);
  if v_role is null then raise exception 'Role not found'; end if;
  if not exists(select 1 from public.staff_profiles where user_id=p_user_id and is_active) then raise exception 'Target staff member is not active'; end if;
  if exists(select 1 from public.staff_role_assignments where user_id=p_user_id and role_id=v_role) then raise exception 'Role already assigned'; end if;
  insert into public.staff_role_assignments(user_id,role_id,assigned_by) values(p_user_id,v_role,v_actor);
  insert into public.staff_identity_events(user_id,event_type,role_code,actor_id,reason) values(p_user_id,'role_granted',trim(p_role_code),v_actor,trim(p_reason));
  return jsonb_build_object('user_id',p_user_id,'role_code',trim(p_role_code),'status','granted');
end; $$;

create or replace function public.revoke_staff_role(p_user_id uuid, p_role_code text, p_reason text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare v_actor uuid := private.require_staff_permission('staff','update'); v_role uuid; v_owner_count integer;
begin
  if p_user_id = v_actor then raise exception 'You cannot revoke your own role'; end if;
  if length(trim(coalesce(p_reason,''))) < 10 then raise exception 'Reason is required'; end if;
  select id into v_role from public.staff_roles where code=trim(p_role_code);
  if v_role is null then raise exception 'Role not found'; end if;
  if trim(p_role_code)='owner' then
    select count(*) into v_owner_count from public.staff_role_assignments ra join public.staff_roles r on r.id=ra.role_id join public.staff_profiles sp on sp.user_id=ra.user_id where r.code='owner' and sp.is_active;
    if v_owner_count <= 1 then raise exception 'Cannot revoke the last active owner'; end if;
  end if;
  delete from public.staff_role_assignments where user_id=p_user_id and role_id=v_role;
  if not found then raise exception 'Role assignment not found'; end if;
  insert into public.staff_identity_events(user_id,event_type,role_code,actor_id,reason) values(p_user_id,'role_revoked',trim(p_role_code),v_actor,trim(p_reason));
  return jsonb_build_object('user_id',p_user_id,'role_code',trim(p_role_code),'status','revoked');
end; $$;

create or replace function public.create_privileged_access_request(p_requested_user_id uuid,p_role_code text,p_reason text,p_expires_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare v_actor uuid := private.require_staff_permission('staff','update'); v_role uuid; v_id uuid;
begin
  if length(trim(coalesce(p_reason,''))) < 10 then raise exception 'Reason is required'; end if;
  select id into v_role from public.staff_roles where code=trim(p_role_code);
  if v_role is null then raise exception 'Role not found'; end if;
  if not exists(select 1 from public.staff_profiles where user_id=p_requested_user_id and is_active) then raise exception 'Target staff member is not active'; end if;
  if p_expires_at is not null and p_expires_at <= now() then raise exception 'Expiry must be in the future'; end if;
  insert into public.privileged_access_requests(requested_user_id,requested_role_id,requested_by,reason,expires_at) values(p_requested_user_id,v_role,v_actor,trim(p_reason),p_expires_at) returning id into v_id;
  return jsonb_build_object('id',v_id,'status','pending');
end; $$;

create or replace function public.decide_privileged_access_request(p_request_id uuid,p_status text,p_decision_notes text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare v_actor uuid := private.require_staff_permission('staff','update'); v_req public.privileged_access_requests%rowtype; v_role_code text;
begin
  if p_status not in ('approved','rejected','revoked') then raise exception 'Invalid decision'; end if;
  if length(trim(coalesce(p_decision_notes,''))) < 10 then raise exception 'Decision notes are required'; end if;
  select * into v_req from public.privileged_access_requests where id=p_request_id for update;
  if not found then raise exception 'Access request not found'; end if;
  if v_req.status <> 'pending' then raise exception 'Access request is no longer pending'; end if;
  if p_status='approved' then
    select code into v_role_code from public.staff_roles where id=v_req.requested_role_id;
    if v_req.expires_at is not null and v_req.expires_at <= now() then raise exception 'Access request has expired'; end if;
    if not exists(select 1 from public.staff_profiles where user_id=v_req.requested_user_id and is_active) then raise exception 'Target staff member is not active'; end if;
    if not exists(select 1 from public.staff_role_assignments where user_id=v_req.requested_user_id and role_id=v_req.requested_role_id) then insert into public.staff_role_assignments(user_id,role_id,assigned_by) values(v_req.requested_user_id,v_req.requested_role_id,v_actor); end if;
    insert into public.staff_identity_events(user_id,event_type,role_code,actor_id,reason) values(v_req.requested_user_id,'role_granted',v_role_code,v_actor,'Approved privileged access request: '||trim(p_decision_notes));
  end if;
  update public.privileged_access_requests set status=p_status,approved_by=v_actor,approved_at=now(),decision_notes=trim(p_decision_notes) where id=p_request_id;
  return jsonb_build_object('id',p_request_id,'status',p_status);
end; $$;

create or replace function public.get_identity_access_360()
returns jsonb language plpgsql security definer stable set search_path=public,private as $$
declare v_user uuid := private.require_staff_permission('staff','select'); v_metrics jsonb; v_staff jsonb; v_requests jsonb; v_events jsonb;
begin
 select jsonb_build_object(
  'active_staff',count(*) filter(where is_active), 'inactive_staff',count(*) filter(where not is_active),
  'pending_privileged_requests',(select count(*) from public.privileged_access_requests where status='pending'),
  'expiring_privileged_requests',(select count(*) from public.privileged_access_requests where status='approved' and expires_at is not null and expires_at between now() and now()+interval '30 days'),
  'identity_events_30d',(select count(*) from public.staff_identity_events where created_at>=now()-interval '30 days')
 ) into v_metrics from public.staff_profiles;
 select coalesce(jsonb_agg(jsonb_build_object('user_id',sp.user_id,'display_name',sp.display_name,'job_title',sp.job_title,'is_active',sp.is_active,'roles',coalesce((select jsonb_agg(sr.code order by sr.code) from public.staff_role_assignments ra join public.staff_roles sr on sr.id=ra.role_id where ra.user_id=sp.user_id),'[]'::jsonb)) order by sp.is_active desc,sp.display_name),'[]'::jsonb) into v_staff from public.staff_profiles sp;
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'requested_user_id',r.requested_user_id,'role_code',sr.code,'reason',r.reason,'status',r.status,'expires_at',r.expires_at,'created_at',r.created_at) order by r.created_at desc),'[]'::jsonb) into v_requests from public.privileged_access_requests r join public.staff_roles sr on sr.id=r.requested_role_id where r.status='pending';
 select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'user_id',e.user_id,'event_type',e.event_type,'role_code',e.role_code,'actor_id',e.actor_id,'reason',e.reason,'created_at',e.created_at) order by e.created_at desc),'[]'::jsonb) into v_events from public.staff_identity_events e where e.created_at>=now()-interval '30 days';
 return jsonb_build_object('generated_at',now(),'viewer',v_user,'metrics',v_metrics,'staff',v_staff,'pending_requests',v_requests,'recent_events',v_events);
end; $$;

revoke all on public.staff_identity_events from public,anon,authenticated;
revoke all on public.privileged_access_requests from public,anon,authenticated;
revoke insert,update,delete on public.staff_role_assignments from public,anon,authenticated;
revoke insert,update,delete on public.staff_profiles from public,anon,authenticated;
revoke insert,update,delete on public.staff_invitations from public,anon,authenticated;
grant execute on function public.change_staff_status(uuid,boolean,text) to authenticated;
grant execute on function public.assign_staff_role(uuid,text,text) to authenticated;
grant execute on function public.revoke_staff_role(uuid,text,text) to authenticated;
grant execute on function public.create_privileged_access_request(uuid,text,text,timestamptz) to authenticated;
grant execute on function public.decide_privileged_access_request(uuid,text,text) to authenticated;
grant execute on function public.get_identity_access_360() to authenticated;

comment on table public.staff_identity_events is 'Append-only evidence of staff identity and privileged access changes.';
comment on table public.privileged_access_requests is 'Controlled approval workflow for elevated staff roles; authentication/MFA remains Supabase Auth configuration.';
