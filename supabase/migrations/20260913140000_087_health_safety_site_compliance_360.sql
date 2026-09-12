-- 087: Health, Safety & Site Compliance 360
-- Site/project -> hazard -> control -> observation/incident -> corrective action -> verification -> close.
create table if not exists public.hse_site_controls_360 (
 id uuid primary key default gen_random_uuid(),
 project_id uuid references public.projects(id) on delete set null,
 title text not null,
 site_name text not null,
 risk_level text not null default 'medium' check (risk_level in ('low','medium','high','critical')),
 responsible_id uuid references auth.users(id) on delete set null,
 status text not null default 'active' check (status in ('draft','active','suspended','closed')),
 induction_required boolean not null default true,
 ppe_required text,
 emergency_notes text,
 review_due_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(length(trim(title))>=3), check(length(trim(site_name))>=2)
);
create table if not exists public.hse_site_events_360 (
 id uuid primary key default gen_random_uuid(),
 control_id uuid not null references public.hse_site_controls_360(id) on delete cascade,
 event_type text not null check(event_type in ('hazard','near_miss','incident','observation','toolbox_talk')),
 severity text not null default 'medium' check(severity in ('low','medium','high','critical')),
 description text not null,
 reported_by uuid references auth.users(id) on delete set null,
 occurred_at timestamptz not null default now(),
 status text not null default 'open' check(status in ('open','investigating','controlled','resolved','closed')),
 immediate_control text,
 closed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(length(trim(description))>=5)
);
create table if not exists public.hse_corrective_actions_360 (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.hse_site_events_360(id) on delete cascade,
 action_plan text not null,
 owner_id uuid references auth.users(id) on delete set null,
 due_at timestamptz,
 status text not null default 'open' check(status in ('open','in_progress','blocked','completed','verified','closed')),
 completed_at timestamptz,
 verified_by uuid references auth.users(id) on delete set null,
 verified_at timestamptz,
 verification_notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(length(trim(action_plan))>=10)
);
create index if not exists idx_hse_controls_status on public.hse_site_controls_360(status,risk_level,review_due_at);
create index if not exists idx_hse_events_status on public.hse_site_events_360(status,severity,occurred_at desc);
create index if not exists idx_hse_actions_status on public.hse_corrective_actions_360(status,due_at);

drop trigger if exists trg_hse_controls_updated_at on public.hse_site_controls_360;
create trigger trg_hse_controls_updated_at before update on public.hse_site_controls_360 for each row execute function private.touch_updated_at();
drop trigger if exists trg_hse_events_updated_at on public.hse_site_events_360;
create trigger trg_hse_events_updated_at before update on public.hse_site_events_360 for each row execute function private.touch_updated_at();
drop trigger if exists trg_hse_actions_updated_at on public.hse_corrective_actions_360;
create trigger trg_hse_actions_updated_at before update on public.hse_corrective_actions_360 for each row execute function private.touch_updated_at();

alter table public.hse_site_controls_360 enable row level security;
alter table public.hse_site_events_360 enable row level security;
alter table public.hse_corrective_actions_360 enable row level security;
revoke all on public.hse_site_controls_360 from public,anon,authenticated;
revoke all on public.hse_site_events_360 from public,anon,authenticated;
revoke all on public.hse_corrective_actions_360 from public,anon,authenticated;

create or replace function public.create_hse_site_control_360(p_project_id uuid,p_title text,p_site_name text,p_risk_level text default 'medium',p_responsible_id uuid default null,p_induction_required boolean default true,p_ppe_required text default null,p_emergency_notes text default null,p_review_due_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare v_actor uuid := private.require_staff_permission('projects','update'); v_id uuid;
begin
 if p_risk_level not in ('low','medium','high','critical') then raise exception 'Invalid risk level'; end if;
 if length(trim(coalesce(p_title,'')))<3 or length(trim(coalesce(p_site_name,'')))<2 then raise exception 'Title and site name are required'; end if;
 insert into public.hse_site_controls_360(project_id,title,site_name,risk_level,responsible_id,induction_required,ppe_required,emergency_notes,review_due_at) values(p_project_id,trim(p_title),trim(p_site_name),p_risk_level,p_responsible_id,coalesce(p_induction_required,true),nullif(trim(coalesce(p_ppe_required,'')),''),nullif(trim(coalesce(p_emergency_notes,'')),''),p_review_due_at) returning id into v_id;
 return jsonb_build_object('id',v_id,'status','active','actor',v_actor);
end; $$;

create or replace function public.create_hse_site_event_360(p_control_id uuid,p_event_type text,p_severity text,p_description text,p_immediate_control text default null)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare v_actor uuid := private.require_staff_permission('projects','update'); v_id uuid;
begin
 if not exists(select 1 from public.hse_site_controls_360 where id=p_control_id and status='active') then raise exception 'Active HSE site control not found'; end if;
 if p_event_type not in ('hazard','near_miss','incident','observation','toolbox_talk') then raise exception 'Invalid event type'; end if;
 if p_severity not in ('low','medium','high','critical') then raise exception 'Invalid severity'; end if;
 if length(trim(coalesce(p_description,'')))<5 then raise exception 'Description is required'; end if;
 insert into public.hse_site_events_360(control_id,event_type,severity,description,reported_by,immediate_control,status) values(p_control_id,p_event_type,p_severity,trim(p_description),v_actor,nullif(trim(coalesce(p_immediate_control,'')),''),case when p_event_type='toolbox_talk' then 'resolved' else 'open' end) returning id into v_id;
 return jsonb_build_object('id',v_id,'status',(select status from public.hse_site_events_360 where id=v_id));
end; $$;

create or replace function public.create_hse_corrective_action_360(p_event_id uuid,p_action_plan text,p_owner_id uuid default null,p_due_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare v_actor uuid := private.require_staff_permission('projects','update'); v_id uuid;
begin
 if not exists(select 1 from public.hse_site_events_360 where id=p_event_id) then raise exception 'HSE event not found'; end if;
 if length(trim(coalesce(p_action_plan,'')))<10 then raise exception 'Action plan is required'; end if;
 insert into public.hse_corrective_actions_360(event_id,action_plan,owner_id,due_at) values(p_event_id,trim(p_action_plan),p_owner_id,p_due_at) returning id into v_id;
 update public.hse_site_events_360 set status=case when status='open' then 'investigating' else status end where id=p_event_id;
 return jsonb_build_object('id',v_id,'status','open','actor',v_actor);
end; $$;

create or replace function public.update_hse_event_360(p_event_id uuid,p_status text,p_immediate_control text default null)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare v_actor uuid := private.require_staff_permission('projects','update'); v_event public.hse_site_events_360%rowtype;
begin
 if p_status not in ('open','investigating','controlled','resolved','closed') then raise exception 'Invalid HSE event status'; end if;
 select * into v_event from public.hse_site_events_360 where id=p_event_id for update;
 if not found then raise exception 'HSE event not found'; end if;
 if p_status='closed' and exists(select 1 from public.hse_corrective_actions_360 where event_id=p_event_id and status not in ('closed','verified')) then raise exception 'All HSE corrective actions must be verified or closed before event closure'; end if;
 update public.hse_site_events_360 set status=p_status, immediate_control=case when p_immediate_control is not null then nullif(trim(p_immediate_control),'') else immediate_control end, closed_at=case when p_status='closed' then coalesce(closed_at,now()) else closed_at end where id=p_event_id;
 return jsonb_build_object('id',p_event_id,'status',p_status,'actor',v_actor);
end; $$;

create or replace function public.update_hse_corrective_action_360(p_action_id uuid,p_status text,p_verification_notes text default null)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare v_actor uuid := private.require_staff_permission('projects','update'); v_action public.hse_corrective_actions_360%rowtype;
begin
 if p_status not in ('open','in_progress','blocked','completed','verified','closed') then raise exception 'Invalid corrective action status'; end if;
 select * into v_action from public.hse_corrective_actions_360 where id=p_action_id for update;
 if not found then raise exception 'HSE corrective action not found'; end if;
 if p_status in ('verified','closed') and length(trim(coalesce(p_verification_notes,'')))<10 then raise exception 'Verification notes are required'; end if;
 update public.hse_corrective_actions_360 set status=p_status, completed_at=case when p_status in ('completed','verified','closed') then coalesce(completed_at,now()) else completed_at end, verified_by=case when p_status in ('verified','closed') then v_actor else verified_by end, verified_at=case when p_status in ('verified','closed') then now() else verified_at end, verification_notes=case when p_verification_notes is not null then trim(p_verification_notes) else verification_notes end where id=p_action_id;
 return jsonb_build_object('id',p_action_id,'status',p_status,'actor',v_actor);
end; $$;

create or replace function public.get_hse_site_compliance_360()
returns jsonb language plpgsql security definer stable set search_path=public,private as $$
declare v_actor uuid := private.require_staff_permission('projects','select');
begin
 return jsonb_build_object('generated_at',now(),'viewer',v_actor,
 'metrics',jsonb_build_object('sites_total',(select count(*) from public.hse_site_controls_360),'high_risk_sites',(select count(*) from public.hse_site_controls_360 where risk_level in ('high','critical') and status='active'),'open_events',(select count(*) from public.hse_site_events_360 where status not in ('resolved','closed')),'critical_events',(select count(*) from public.hse_site_events_360 where severity='critical' and status not in ('resolved','closed')),'overdue_actions',(select count(*) from public.hse_corrective_actions_360 where status not in ('verified','closed') and due_at is not null and due_at<now()),'review_due_sites',(select count(*) from public.hse_site_controls_360 where status='active' and review_due_at is not null and review_due_at<=now()+interval '30 days')),
 'sites',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from (select id,project_id,title,site_name,risk_level,status,induction_required,ppe_required,review_due_at from public.hse_site_controls_360 order by created_at desc limit 50)x),
 'events',(select coalesce(jsonb_agg(to_jsonb(x) order by x.occurred_at desc),'[]'::jsonb) from (select e.id,e.control_id,e.event_type,e.severity,e.description,e.status,e.occurred_at,c.site_name,c.title control_title from public.hse_site_events_360 e join public.hse_site_controls_360 c on c.id=e.control_id where e.status not in ('closed') order by e.occurred_at desc limit 100)x),
 'actions',(select coalesce(jsonb_agg(to_jsonb(x) order by x.due_at nulls last,x.created_at desc),'[]'::jsonb) from (select a.id,a.event_id,a.action_plan,a.owner_id,a.due_at,a.status,e.description event_description from public.hse_corrective_actions_360 a join public.hse_site_events_360 e on e.id=a.event_id where a.status not in ('closed') order by a.due_at nulls last,a.created_at desc limit 100)x));
end; $$;

grant execute on function public.create_hse_site_control_360(uuid,text,text,text,uuid,boolean,text,text,timestamptz) to authenticated;
grant execute on function public.create_hse_site_event_360(uuid,text,text,text,text) to authenticated;
grant execute on function public.create_hse_corrective_action_360(uuid,text,uuid,timestamptz) to authenticated;
grant execute on function public.update_hse_event_360(uuid,text,text) to authenticated;
grant execute on function public.update_hse_corrective_action_360(uuid,text,text) to authenticated;
grant execute on function public.get_hse_site_compliance_360() to authenticated;
