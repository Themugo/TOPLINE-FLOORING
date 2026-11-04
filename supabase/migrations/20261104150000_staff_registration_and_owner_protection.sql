-- Staff registration (invite -> sign up -> auto-accept), role/rights management and owner protection.
--
-- Owner protection: the system owner can never be deactivated, deleted or stripped of the owner role, by anyone,
-- including other owners and including direct table writes. Only owners can deactivate or change admin/manager staff.
-- Registration: staff are invited by email with a role. The invited person creates a normal account with that
-- email, confirms it, signs in at /admin/login and the invitation is accepted automatically. No token is ever
-- emailed or exposed: the confirmed e-mail address on the Supabase account is the proof of identity.

-- ------------------------------------------------------------------ helpers
CREATE OR REPLACE FUNCTION private.staff_has_role(p_user uuid, p_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.staff_role_assignments ra JOIN public.staff_roles r ON r.id = ra.role_id
                  WHERE ra.user_id = p_user AND r.code = p_code);
$$;
REVOKE ALL ON FUNCTION private.staff_has_role(uuid, text) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------ absolute owner protection (defence in depth)
CREATE OR REPLACE FUNCTION private.protect_owner_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF private.staff_has_role(OLD.user_id, 'owner') THEN
    IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'The system owner cannot be deleted'; END IF;
    IF NEW.is_active IS DISTINCT FROM true THEN RAISE EXCEPTION 'The system owner cannot be deactivated'; END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.protect_owner_profile() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_protect_owner_profile ON public.staff_profiles;
CREATE TRIGGER trg_protect_owner_profile BEFORE UPDATE OF is_active OR DELETE ON public.staff_profiles
  FOR EACH ROW EXECUTE FUNCTION private.protect_owner_profile();

CREATE OR REPLACE FUNCTION private.protect_owner_role() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.staff_roles r WHERE r.id = OLD.role_id AND r.code = 'owner')
     AND EXISTS (SELECT 1 FROM public.staff_profiles p WHERE p.user_id = OLD.user_id) THEN
    RAISE EXCEPTION 'The owner role cannot be removed';
  END IF;
  RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION private.protect_owner_role() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_protect_owner_role ON public.staff_role_assignments;
CREATE TRIGGER trg_protect_owner_role BEFORE DELETE ON public.staff_role_assignments
  FOR EACH ROW EXECUTE FUNCTION private.protect_owner_role();

-- ------------------------------------------------------------------ audit event types
ALTER TABLE public.staff_identity_events DROP CONSTRAINT IF EXISTS staff_identity_events_event_type_check;
ALTER TABLE public.staff_identity_events ADD CONSTRAINT staff_identity_events_event_type_check
  CHECK (event_type IN ('onboarded','activated','deactivated','role_granted','role_revoked','access_reviewed','invitation_revoked','invited','invitation_accepted','profile_updated'));
ALTER TABLE public.staff_invitations ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.staff_invitations ADD COLUMN IF NOT EXISTS job_title text;
-- staff_identity_events.user_id references auth.users; an invitation has no user yet, so invitations are logged on the inviter.

-- ------------------------------------------------------------------ status change with hierarchy rules
CREATE OR REPLACE FUNCTION public.change_staff_status(p_user_id uuid, p_is_active boolean, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_actor uuid := private.require_staff_permission('staff','update');
BEGIN
  IF p_user_id = v_actor THEN RAISE EXCEPTION 'You cannot change your own staff status'; END IF;
  IF length(trim(coalesce(p_reason,''))) < 10 THEN RAISE EXCEPTION 'Reason is required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.staff_profiles WHERE user_id = p_user_id) THEN RAISE EXCEPTION 'Staff member not found'; END IF;
  IF private.staff_has_role(p_user_id, 'owner') THEN RAISE EXCEPTION 'The system owner cannot be deactivated'; END IF;
  IF (private.staff_has_role(p_user_id, 'admin') OR private.staff_has_role(p_user_id, 'manager')) AND NOT private.staff_has_role(v_actor, 'owner') THEN
    RAISE EXCEPTION 'Only the owner can change administrators and managers';
  END IF;
  UPDATE public.staff_profiles SET is_active = p_is_active, updated_at = now() WHERE user_id = p_user_id;
  INSERT INTO public.staff_identity_events(user_id, event_type, actor_id, reason, metadata)
  VALUES (p_user_id, CASE WHEN p_is_active THEN 'activated' ELSE 'deactivated' END, v_actor, trim(p_reason), '{}'::jsonb);
  RETURN jsonb_build_object('user_id', p_user_id, 'is_active', p_is_active);
END $$;

CREATE OR REPLACE FUNCTION public.revoke_staff_role(p_user_id uuid, p_role_code text, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_actor uuid := private.require_staff_permission('staff','update'); v_role uuid; v_code text := trim(p_role_code);
BEGIN
  IF p_user_id = v_actor THEN RAISE EXCEPTION 'You cannot revoke your own role'; END IF;
  IF length(trim(coalesce(p_reason,''))) < 10 THEN RAISE EXCEPTION 'Reason is required'; END IF;
  SELECT id INTO v_role FROM public.staff_roles WHERE code = v_code;
  IF v_role IS NULL THEN RAISE EXCEPTION 'Role not found'; END IF;
  IF v_code = 'owner' OR private.staff_has_role(p_user_id, 'owner') THEN RAISE EXCEPTION 'The system owner''s access cannot be changed'; END IF;
  IF (v_code IN ('admin','manager') OR private.staff_has_role(p_user_id, 'admin') OR private.staff_has_role(p_user_id, 'manager'))
     AND NOT private.staff_has_role(v_actor, 'owner') THEN
    RAISE EXCEPTION 'Only the owner can change administrators and managers';
  END IF;
  DELETE FROM public.staff_role_assignments WHERE user_id = p_user_id AND role_id = v_role;
  IF NOT FOUND THEN RAISE EXCEPTION 'Role assignment not found'; END IF;
  INSERT INTO public.staff_identity_events(user_id, event_type, role_code, actor_id, reason) VALUES (p_user_id, 'role_revoked', v_code, v_actor, trim(p_reason));
  RETURN jsonb_build_object('user_id', p_user_id, 'role_code', v_code, 'status', 'revoked');
END $$;

-- ------------------------------------------------------------------ edit a staff member's details
CREATE OR REPLACE FUNCTION public.update_staff_member(p_user_id uuid, p_display_name text, p_job_title text DEFAULT NULL, p_phone text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_actor uuid := private.require_staff_permission('staff','update');
BEGIN
  IF nullif(trim(coalesce(p_display_name,'')), '') IS NULL THEN RAISE EXCEPTION 'Name is required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.staff_profiles WHERE user_id = p_user_id) THEN RAISE EXCEPTION 'Staff member not found'; END IF;
  IF p_user_id <> v_actor AND (private.staff_has_role(p_user_id,'owner') OR private.staff_has_role(p_user_id,'admin') OR private.staff_has_role(p_user_id,'manager'))
     AND NOT private.staff_has_role(v_actor,'owner') THEN
    RAISE EXCEPTION 'Only the owner can change administrators, managers and the owner';
  END IF;
  UPDATE public.staff_profiles SET display_name = left(trim(p_display_name), 120), job_title = nullif(left(trim(coalesce(p_job_title,'')), 120), ''),
         phone = nullif(left(trim(coalesce(p_phone,'')), 40), ''), updated_at = now() WHERE user_id = p_user_id;
  INSERT INTO public.staff_identity_events(user_id, event_type, actor_id, reason) VALUES (p_user_id, 'profile_updated', v_actor, 'Staff details updated');
  RETURN jsonb_build_object('user_id', p_user_id, 'status', 'updated');
END $$;

-- ------------------------------------------------------------------ invitations
CREATE OR REPLACE FUNCTION public.invite_staff(p_email text, p_role_code text, p_display_name text, p_job_title text DEFAULT NULL, p_valid_days integer DEFAULT 14)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_actor uuid := private.require_staff_permission('staff','insert'); v_email text := lower(btrim(coalesce(p_email,''))); v_role uuid; v_code text := trim(coalesce(p_role_code,''));
        v_id uuid; v_site text;
BEGIN
  IF v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Enter a valid email address'; END IF;
  IF nullif(trim(coalesce(p_display_name,'')), '') IS NULL THEN RAISE EXCEPTION 'Name is required'; END IF;
  IF p_valid_days < 1 OR p_valid_days > 60 THEN RAISE EXCEPTION 'Invitation validity must be 1 to 60 days'; END IF;
  SELECT id INTO v_role FROM public.staff_roles WHERE code = v_code;
  IF v_role IS NULL THEN RAISE EXCEPTION 'Role not found'; END IF;
  IF v_code = 'owner' THEN RAISE EXCEPTION 'The owner role cannot be given by invitation'; END IF;
  IF v_code IN ('admin','manager') AND NOT private.staff_has_role(v_actor, 'owner') THEN RAISE EXCEPTION 'Only the owner can invite administrators and managers'; END IF;
  IF EXISTS (SELECT 1 FROM public.staff_profiles sp JOIN auth.users u ON u.id = sp.user_id WHERE lower(u.email) = v_email) THEN RAISE EXCEPTION 'This person is already on the team'; END IF;
  UPDATE public.staff_invitations SET revoked_at = now() WHERE lower(email) = v_email AND accepted_at IS NULL AND revoked_at IS NULL;
  INSERT INTO public.staff_invitations(email, role_id, invited_by, token_hash, expires_at, display_name, job_title)
  VALUES (v_email, v_role, v_actor, encode(sha256(convert_to(gen_random_uuid()::text || clock_timestamp()::text, 'UTF8')), 'hex'), now() + make_interval(days => p_valid_days), left(trim(p_display_name), 120), nullif(left(trim(coalesce(p_job_title,'')), 120), ''))
  RETURNING id INTO v_id;
  INSERT INTO public.staff_identity_events(user_id, event_type, role_code, actor_id, reason, metadata)
  VALUES (v_actor, 'invited', v_code, v_actor, 'Invited ' || v_email, jsonb_build_object('invitation_id', v_id, 'email', v_email));
  v_site := private.topline_site_url();
  PERFORM private.queue_customer_email(NULL, v_email, 'staff-invite:' || v_id::text, 'You have been invited to the Topline team',
    format(E'Hello %s,\n\nYou have been invited to join the Topline Flooring & Waterproofing team as %s.\n\nTo get started:\n1. Open %s/admin/login and choose "Create staff account".\n2. Register with THIS email address (%s) and confirm it from the email we send.\n3. Sign in. Your access is activated automatically.\n\nThis invitation expires in %s days. If you were not expecting it, ignore this message.',
      left(trim(p_display_name), 120), (SELECT name FROM public.staff_roles WHERE id = v_role), v_site, v_email, p_valid_days));
  RETURN jsonb_build_object('id', v_id, 'email', v_email, 'role_code', v_code, 'status', 'pending');
END $$;

CREATE OR REPLACE FUNCTION public.get_staff_invitations()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v jsonb;
BEGIN
  PERFORM private.require_staff_permission('staff','select');
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'email', i.email, 'display_name', i.display_name, 'job_title', i.job_title, 'role_code', r.code, 'role_name', r.name,
           'status', CASE WHEN i.accepted_at IS NOT NULL THEN 'accepted' WHEN i.revoked_at IS NOT NULL THEN 'revoked' WHEN i.expires_at <= now() THEN 'expired' ELSE 'pending' END,
           'expires_at', i.expires_at, 'created_at', i.created_at) ORDER BY i.created_at DESC), '[]'::jsonb) INTO v
  FROM (SELECT * FROM public.staff_invitations ORDER BY created_at DESC LIMIT 100) i JOIN public.staff_roles r ON r.id = i.role_id;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.revoke_staff_invitation(p_invitation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_actor uuid := private.require_staff_permission('staff','insert'); v_email text;
BEGIN
  UPDATE public.staff_invitations SET revoked_at = now() WHERE id = p_invitation_id AND accepted_at IS NULL AND revoked_at IS NULL RETURNING email INTO v_email;
  IF v_email IS NULL THEN RAISE EXCEPTION 'Pending invitation not found'; END IF;
  INSERT INTO public.staff_identity_events(user_id, event_type, actor_id, reason, metadata) VALUES (v_actor, 'invitation_revoked', v_actor, 'Revoked invitation for ' || v_email, jsonb_build_object('invitation_id', p_invitation_id));
  RETURN jsonb_build_object('id', p_invitation_id, 'status', 'revoked');
END $$;

-- Called by the signed-in person after login. The confirmed e-mail on their Supabase account must match an open invitation.
CREATE OR REPLACE FUNCTION public.accept_staff_invitation()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_user uuid := auth.uid(); v_email text; v_confirmed timestamptz; v_inv public.staff_invitations%ROWTYPE; v_code text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF EXISTS (SELECT 1 FROM public.staff_profiles WHERE user_id = v_user) THEN RETURN jsonb_build_object('accepted', false, 'reason', 'already_staff'); END IF;
  SELECT lower(email), email_confirmed_at INTO v_email, v_confirmed FROM auth.users WHERE id = v_user;
  IF v_email IS NULL OR v_confirmed IS NULL THEN RETURN jsonb_build_object('accepted', false, 'reason', 'email_not_confirmed'); END IF;
  SELECT * INTO v_inv FROM public.staff_invitations WHERE lower(email) = v_email AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now() ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('accepted', false, 'reason', 'no_invitation'); END IF;
  SELECT code INTO v_code FROM public.staff_roles WHERE id = v_inv.role_id;
  INSERT INTO public.staff_profiles(user_id, display_name, job_title, is_active) VALUES (v_user, coalesce(v_inv.display_name, split_part(v_email, '@', 1)), v_inv.job_title, true);
  INSERT INTO public.staff_role_assignments(user_id, role_id, assigned_by) VALUES (v_user, v_inv.role_id, v_inv.invited_by);
  UPDATE public.staff_invitations SET accepted_at = now(), accepted_user_id = v_user WHERE id = v_inv.id;
  INSERT INTO public.staff_identity_events(user_id, event_type, role_code, actor_id, reason, metadata)
  VALUES (v_user, 'onboarded', v_code, v_inv.invited_by, 'Accepted staff invitation', jsonb_build_object('invitation_id', v_inv.id));
  RETURN jsonb_build_object('accepted', true, 'role_code', v_code);
END $$;

-- ------------------------------------------------------------------ roles and rights catalogue (read-only view of what each role can do)
CREATE OR REPLACE FUNCTION public.get_staff_role_catalog()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v jsonb;
BEGIN
  PERFORM private.require_staff_permission('staff','select');
  SELECT coalesce(jsonb_agg(jsonb_build_object('code', r.code, 'name', r.name, 'description', r.description,
    'members', (SELECT count(*) FROM public.staff_role_assignments ra JOIN public.staff_profiles sp ON sp.user_id = ra.user_id WHERE ra.role_id = r.id AND sp.is_active),
    'permissions', coalesce((SELECT jsonb_agg(jsonb_build_object('resource', p.resource, 'action', p.action) ORDER BY p.resource, p.action)
        FROM public.staff_role_permissions rp JOIN public.staff_permissions p ON p.id = rp.permission_id WHERE rp.role_id = r.id), '[]'::jsonb)
  ) ORDER BY CASE r.code WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'manager' THEN 2 ELSE 3 END, r.name), '[]'::jsonb) INTO v FROM public.staff_roles r;
  RETURN v;
END $$;

-- ------------------------------------------------------------------ staff list now carries e-mail, phone and protection flags
CREATE OR REPLACE FUNCTION public.get_identity_access_360()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_user uuid := private.require_staff_permission('staff','select'); v_metrics jsonb; v_staff jsonb; v_requests jsonb; v_events jsonb; v_is_owner boolean := private.staff_has_role(v_user, 'owner');
BEGIN
  SELECT jsonb_build_object(
    'active_staff', count(*) FILTER (WHERE is_active), 'inactive_staff', count(*) FILTER (WHERE NOT is_active),
    'pending_privileged_requests', (SELECT count(*) FROM public.privileged_access_requests WHERE status = 'pending'),
    'expiring_privileged_requests', (SELECT count(*) FROM public.privileged_access_requests WHERE status = 'approved' AND expires_at IS NOT NULL AND expires_at BETWEEN now() AND now() + interval '30 days'),
    'pending_invitations', (SELECT count(*) FROM public.staff_invitations WHERE accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now()),
    'identity_events_30d', (SELECT count(*) FROM public.staff_identity_events WHERE created_at >= now() - interval '30 days')
  ) INTO v_metrics FROM public.staff_profiles;
  SELECT coalesce(jsonb_agg(jsonb_build_object('user_id', sp.user_id, 'display_name', sp.display_name, 'job_title', sp.job_title, 'phone', sp.phone, 'email', u.email,
      'is_active', sp.is_active, 'is_self', sp.user_id = v_user,
      'protected', private.staff_has_role(sp.user_id, 'owner'),
      'can_manage', sp.user_id <> v_user AND NOT private.staff_has_role(sp.user_id, 'owner') AND (v_is_owner OR NOT (private.staff_has_role(sp.user_id, 'admin') OR private.staff_has_role(sp.user_id, 'manager'))),
      'roles', coalesce((SELECT jsonb_agg(sr.code ORDER BY sr.code) FROM public.staff_role_assignments ra JOIN public.staff_roles sr ON sr.id = ra.role_id WHERE ra.user_id = sp.user_id), '[]'::jsonb)
    ) ORDER BY sp.is_active DESC, sp.display_name), '[]'::jsonb) INTO v_staff
  FROM public.staff_profiles sp LEFT JOIN auth.users u ON u.id = sp.user_id;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'requested_user_id', r.requested_user_id, 'role_code', sr.code, 'reason', r.reason, 'status', r.status, 'expires_at', r.expires_at, 'created_at', r.created_at) ORDER BY r.created_at DESC), '[]'::jsonb)
    INTO v_requests FROM public.privileged_access_requests r JOIN public.staff_roles sr ON sr.id = r.requested_role_id WHERE r.status = 'pending';
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'user_id', e.user_id, 'event_type', e.event_type, 'role_code', e.role_code, 'actor_id', e.actor_id, 'reason', e.reason, 'created_at', e.created_at) ORDER BY e.created_at DESC), '[]'::jsonb)
    INTO v_events FROM (SELECT * FROM public.staff_identity_events WHERE created_at >= now() - interval '30 days' ORDER BY created_at DESC LIMIT 50) e;
  RETURN jsonb_build_object('generated_at', now(), 'viewer', v_user, 'viewer_is_owner', v_is_owner, 'metrics', v_metrics, 'staff', v_staff, 'pending_requests', v_requests, 'recent_events', v_events);
END $$;

-- ------------------------------------------------------------------ grants
REVOKE ALL ON FUNCTION public.update_staff_member(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.invite_staff(text, text, text, text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_staff_invitations() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_staff_invitation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_staff_invitation() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_staff_role_catalog() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_staff_member(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_staff(text, text, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_invitations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_staff_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_staff_invitation() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_role_catalog() TO authenticated;
