-- 086: Quality Assurance & Corrective Action 360
-- Standard -> inspection -> finding -> corrective action -> verification -> closure.
create table if not exists public.quality_inspections_360 (
 id uuid primary key default gen_random_uuid(),
 reference_type text not null check (reference_type in ('project','supplier','delivery','service_case','maintenance','warehouse','other')),
 reference_id uuid,
 title text not null,
 inspector_id uuid references auth.users(id) on delete set null,
 status text not null default 'open' check (status in ('open','in_progress','passed','failed','waived','closed')),
 score numeric(5,2) check (score is null or (score>=0 and score<=100)),
 findings_summary text,
 inspected_at timestamptz not null default now(),
 closed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (length(trim(title)) >= 3)
);
create table if not exists public.quality_corrective_actions_360 (
 id uuid primary key default gen_random_uuid(),
 inspection_id uuid not null references public.quality_inspections_360(id) on delete cascade,
 finding text not null,
 severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
 owner_id uuid references auth.users(id) on delete set null,
 due_at timestamptz,
 action_plan text not null,
 status text not null default 'open' check (status in ('open','in_progress','blocked','completed','verified','closed')),
 completed_at timestamptz,
 verified_by uuid references auth.users(id) on delete set null,
 verified_at timestamptz,
 verification_notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (length(trim(finding)) >= 5), check (length(trim(action_plan)) >= 10)
);
create index if not exists idx_quality_inspections_status on public.quality_inspections_360(status,inspected_at desc);
create index if not exists idx_quality_actions_status on public.quality_corrective_actions_360(status,due_at,created_at desc);
create index if not exists idx_quality_actions_inspection on public.quality_corrective_actions_360(inspection_id);
drop trigger if exists trg_quality_inspections_updated_at on public.quality_inspections_360;
create trigger trg_quality_inspections_updated_at before update on public.quality_inspections_360 for each row execute function private.touch_updated_at();
drop trigger if exists trg_quality_actions_updated_at on public.quality_corrective_actions_360;
create trigger trg_quality_actions_updated_at before update on public.quality_corrective_actions_360 for each row execute function private.touch_updated_at();
alter table public.quality_inspections_360 enable row level security;
alter table public.quality_corrective_actions_360 enable row level security;
revoke all on public.quality_inspections_360 from public,anon,authenticated;
revoke all on public.quality_corrective_actions_360 from public,anon,authenticated;

create or replace function public.create_quality_inspection_360(p_reference_type text,p_reference_id uuid,p_title text,p_score numeric,p_findings_summary text default null)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare v_actor uuid := private.require_staff_permission('projects','update'); v_id uuid;
begin
 if p_reference_type not in ('project','supplier','delivery','service_case','maintenance','warehouse','other') then raise exception 'Invalid reference type'; end if;
 if length(trim(coalesce(p_title,'')))<3 then raise exception 'Inspection title is required'; end if;
 if p_score is not null and (p_score<0 or p_score>100) then raise exception 'Score must be between 0 and 100'; end if;
 insert into public.quality_inspections_360(reference_type,reference_id,title,inspector_id,status,score,findings_summary) values(p_reference_type,p_reference_id,trim(p_title),v_actor,case when p_score is not null and p_score>=80 then 'passed' else 'open' end,p_score,nullif(trim(coalesce(p_findings_summary,'')),'')) returning id into v_id;
 return jsonb_build_object('id',v_id,'status',(select status from public.quality_inspections_360 where id=v_id));
end; $$;

create or replace function public.create_quality_corrective_action_360(p_inspection_id uuid,p_finding text,p_severity text,p_action_plan text,p_owner_id uuid default null,p_due_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare v_actor uuid := private.require_staff_permission('projects','update'); v_id uuid;
begin
 if not exists(select 1 from public.quality_inspections_360 where id=p_inspection_id) then raise exception 'Inspection not found'; end if;
 if p_severity not in ('low','medium','high','critical') then raise exception 'Invalid severity'; end if;
 if length(trim(coalesce(p_finding,'')))<5 or length(trim(coalesce(p_action_plan,'')))<10 then raise exception 'Finding and action plan are required'; end if;
 insert into public.quality_corrective_actions_360(inspection_id,finding,severity,owner_id,due_at,action_plan) values(p_inspection_id,trim(p_finding),p_severity,p_owner_id,p_due_at,trim(p_action_plan)) returning id into v_id;
 update public.quality_inspections_360 set status='failed' where id=p_inspection_id and status not in ('closed','waived');
 return jsonb_build_object('id',v_id,'status','open');
end; $$;

create or replace function public.update_quality_corrective_action_360(p_action_id uuid,p_status text,p_verification_notes text default null)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare v_actor uuid := private.require_staff_permission('projects','update'); v_action public.quality_corrective_actions_360%rowtype;
begin
 if p_status not in ('open','in_progress','blocked','completed','verified','closed') then raise exception 'Invalid status'; end if;
 select * into v_action from public.quality_corrective_actions_360 where id=p_action_id for update;
 if not found then raise exception 'Corrective action not found'; end if;
 if p_status in ('verified','closed') and length(trim(coalesce(p_verification_notes,'')))<10 then raise exception 'Verification notes are required'; end if;
 if p_status in ('completed','verified','closed') then update public.quality_corrective_actions_360 set status=p_status,completed_at=coalesce(completed_at,now()),verified_by=case when p_status in ('verified','closed') then v_actor else verified_by end,verified_at=case when p_status in ('verified','closed') then now() else verified_at end,verification_notes=case when p_verification_notes is not null then trim(p_verification_notes) else verification_notes end where id=p_action_id;
 else update public.quality_corrective_actions_360 set status=p_status where id=p_action_id; end if;
 if p_status='closed' then if exists(select 1 from public.quality_corrective_actions_360 where inspection_id=v_action.inspection_id and status<>'closed') then raise exception 'All corrective actions must be closed before final closure'; end if; update public.quality_inspections_360 set status='closed',closed_at=now() where id=v_action.inspection_id; end if;
 return jsonb_build_object('id',p_action_id,'status',p_status);
end; $$;

create or replace function public.get_quality_assurance_360()
returns jsonb language plpgsql security definer stable set search_path=public,private as $$
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
 'actions',(select coalesce(jsonb_agg(to_jsonb(x) order by x.due_at nulls last,x.created_at desc),'[]'::jsonb) from (select a.id,a.inspection_id,a.finding,a.severity,a.owner_id,a.due_at,a.action_plan,a.status,a.completed_at,a.verified_at,i.title inspection_title from public.quality_corrective_actions_360 a join public.quality_inspections_360 i on i.id=a.inspection_id where a.status not in ('closed') order by a.due_at nulls last,a.created_at desc limit 100)x)
 );
end; $$;
grant execute on function public.create_quality_inspection_360(text,uuid,text,numeric,text) to authenticated;
grant execute on function public.create_quality_corrective_action_360(uuid,text,text,text,uuid,timestamptz) to authenticated;
grant execute on function public.update_quality_corrective_action_360(uuid,text,text) to authenticated;
grant execute on function public.get_quality_assurance_360() to authenticated;
comment on table public.quality_inspections_360 is 'Cross-operation quality inspection register and outcome evidence.';
comment on table public.quality_corrective_actions_360 is 'Corrective/preventive action register with verification and closure controls.';
