-- test fixtures (local only)
INSERT INTO auth.users(id,email) VALUES
 ('00000000-0000-0000-0000-0000000000a1','admin@test.local'),
 ('00000000-0000-0000-0000-0000000000b2','nocontent@test.local') ON CONFLICT DO NOTHING;
INSERT INTO public.staff_profiles(user_id,display_name,is_active) VALUES
 ('00000000-0000-0000-0000-0000000000a1','Test Admin',true),
 ('00000000-0000-0000-0000-0000000000b2','Test Sales',true) ON CONFLICT DO NOTHING;
INSERT INTO public.staff_role_assignments(user_id,role_id) SELECT '00000000-0000-0000-0000-0000000000a1', id FROM public.staff_roles WHERE code='admin' ON CONFLICT DO NOTHING;
INSERT INTO public.staff_role_assignments(user_id,role_id) SELECT '00000000-0000-0000-0000-0000000000b2', id FROM public.staff_roles WHERE code='sales' ON CONFLICT DO NOTHING;
-- data: one active + one inactive row in sensitive public tables
INSERT INTO public.services(name,slug,description,is_active) VALUES ('Active Svc','active-svc','d',true),('Hidden Svc','hidden-svc','d',false);
INSERT INTO public.projects(title,slug,is_active,estimated_cost,actual_cost,project_value) VALUES ('Public Proj','public-proj',true,1000,900,2000),('Draft Proj','draft-proj',false,1,1,1);
