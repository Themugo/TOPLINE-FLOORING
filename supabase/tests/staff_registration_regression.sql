-- Pass 23: owner protection, staff invitation/registration, rights and hierarchy. Rolls back.
BEGIN;
DO $t$
DECLARE
  own uuid := gen_random_uuid(); own2 uuid := gen_random_uuid(); mgr uuid := gen_random_uuid(); sal uuid := gen_random_uuid(); newu uuid := gen_random_uuid(); stranger uuid := gen_random_uuid();
  r jsonb; inv uuid; denied boolean; n integer;
BEGIN
  INSERT INTO auth.users(id,email,email_confirmed_at) VALUES (own,'owner@t.invalid',now()),(own2,'owner2@t.invalid',now()),(mgr,'mgr@t.invalid',now()),(sal,'sal@t.invalid',now()),(newu,'newbie@t.invalid',now()),(stranger,'x@t.invalid',now());
  PERFORM private.bootstrap_owner(own,'Owner');
  PERFORM set_config('request.jwt.claim.sub',own::text,true); SET LOCAL ROLE authenticated;
  -- 1. Owner invites a manager and a salesperson; manager/admin invites are owner-only.
  r := public.invite_staff('mgr@t.invalid','manager','Mary Manager','Ops manager');
  r := public.invite_staff('sal@t.invalid','sales','Sam Sales');
  IF (r->>'status') <> 'pending' THEN RAISE EXCEPTION '1a invite not pending'; END IF;
  denied := false; BEGIN PERFORM public.invite_staff('o3@t.invalid','owner','Nope'); EXCEPTION WHEN OTHERS THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION '1b owner role must not be invitable'; END IF;
  RESET ROLE;
  IF NOT EXISTS (SELECT 1 FROM public.communication_outbox WHERE recipient='sal@t.invalid' AND subject LIKE 'You have been invited%') THEN RAISE EXCEPTION '1c invitation email not queued'; END IF;

  -- 2. A stranger without an invitation gets nothing; the invited people are onboarded after sign-in.
  PERFORM set_config('request.jwt.claim.sub',stranger::text,true); SET LOCAL ROLE authenticated;
  IF (public.accept_staff_invitation()->>'accepted')::boolean THEN RAISE EXCEPTION '2a stranger must not be accepted'; END IF;
  denied := false; BEGIN PERFORM public.invite_staff('z@t.invalid','sales','Z'); EXCEPTION WHEN OTHERS THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION '2b non-staff must not invite'; END IF;
  RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub',mgr::text,true); SET LOCAL ROLE authenticated;
  r := public.accept_staff_invitation(); RESET ROLE;
  IF NOT (r->>'accepted')::boolean OR r->>'role_code' <> 'manager' THEN RAISE EXCEPTION '2c manager not onboarded: %', r; END IF;
  PERFORM set_config('request.jwt.claim.sub',sal::text,true); SET LOCAL ROLE authenticated;
  r := public.accept_staff_invitation(); RESET ROLE;
  IF NOT (r->>'accepted')::boolean THEN RAISE EXCEPTION '2d sales not onboarded'; END IF;
  IF (SELECT count(*) FROM public.staff_profiles WHERE user_id IN (mgr,sal) AND is_active) <> 2 THEN RAISE EXCEPTION '2e profiles missing'; END IF;
  SELECT count(*) INTO n FROM public.staff_invitations WHERE accepted_at IS NOT NULL; IF n <> 2 THEN RAISE EXCEPTION '2f invitations not closed'; END IF;

  -- 3. Unconfirmed e-mail cannot claim an invitation.
  UPDATE auth.users SET email_confirmed_at = NULL WHERE id = newu;
  PERFORM set_config('request.jwt.claim.sub',own::text,true); SET LOCAL ROLE authenticated; PERFORM public.invite_staff('newbie@t.invalid','staff','New Bie'); RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub',newu::text,true); SET LOCAL ROLE authenticated;
  IF (public.accept_staff_invitation()->>'reason') <> 'email_not_confirmed' THEN RAISE EXCEPTION '3 unconfirmed email must not be accepted'; END IF;
  RESET ROLE;

  -- 4. Owner protection: nobody, not even another owner or direct writes, can deactivate/delete/demote the owner.
  PERFORM set_config('request.jwt.claim.sub',own::text,true); SET LOCAL ROLE authenticated;
  PERFORM public.assign_staff_role(mgr,'owner','Second owner for resilience'); RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub',mgr::text,true); SET LOCAL ROLE authenticated;
  denied := false; BEGIN PERFORM public.change_staff_status(own,false,'Trying to remove the owner'); EXCEPTION WHEN OTHERS THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION '4a second owner must not deactivate the owner'; END IF;
  denied := false; BEGIN PERFORM public.revoke_staff_role(own,'owner','Trying to demote the owner'); EXCEPTION WHEN OTHERS THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION '4b owner role must not be revoked'; END IF;
  RESET ROLE;
  denied := false; BEGIN UPDATE public.staff_profiles SET is_active = false WHERE user_id = own; EXCEPTION WHEN OTHERS THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION '4c direct deactivate of owner must be blocked'; END IF;
  denied := false; BEGIN DELETE FROM public.staff_profiles WHERE user_id = own; EXCEPTION WHEN OTHERS THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION '4d direct delete of owner must be blocked'; END IF;
  denied := false; BEGIN DELETE FROM public.staff_role_assignments WHERE user_id = own; EXCEPTION WHEN OTHERS THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION '4e direct removal of owner role must be blocked'; END IF;

  -- 5. Owner can deactivate and reactivate others; a salesperson cannot touch a manager; reasons are required.
  PERFORM set_config('request.jwt.claim.sub',own::text,true); SET LOCAL ROLE authenticated;
  PERFORM public.change_staff_status(sal,false,'Left the company in November'); RESET ROLE;
  IF (SELECT is_active FROM public.staff_profiles WHERE user_id = sal) THEN RAISE EXCEPTION '5a owner could not deactivate staff'; END IF;
  PERFORM set_config('request.jwt.claim.sub',own::text,true); SET LOCAL ROLE authenticated;
  PERFORM public.change_staff_status(sal,true,'Returned to the company'); RESET ROLE;
  IF NOT (SELECT is_active FROM public.staff_profiles WHERE user_id = sal) THEN RAISE EXCEPTION '5b reactivate failed'; END IF;
  PERFORM set_config('request.jwt.claim.sub',sal::text,true); SET LOCAL ROLE authenticated;
  denied := false; BEGIN PERFORM public.change_staff_status(mgr,false,'Sales trying to remove a manager'); EXCEPTION WHEN OTHERS THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION '5c salesperson must not deactivate a manager'; END IF;
  RESET ROLE;

  -- 6. Rights catalogue, snapshot protection flags, details update and invitation revoke.
  SELECT id INTO inv FROM public.staff_invitations WHERE lower(email)='newbie@t.invalid' AND accepted_at IS NULL AND revoked_at IS NULL;
  PERFORM set_config('request.jwt.claim.sub',own::text,true); SET LOCAL ROLE authenticated;
  IF jsonb_array_length(public.get_staff_role_catalog()) < 8 THEN RAISE EXCEPTION '6a role catalogue incomplete'; END IF;
  r := public.get_identity_access_360();
  IF NOT coalesce((SELECT (s->>'protected')::boolean FROM jsonb_array_elements(r->'staff') s WHERE s->>'user_id' = own::text),false) THEN RAISE EXCEPTION '6b owner must be flagged protected'; END IF;
  IF coalesce((SELECT (s->>'can_manage')::boolean FROM jsonb_array_elements(r->'staff') s WHERE s->>'user_id' = own::text),true) THEN RAISE EXCEPTION '6c owner must not be manageable'; END IF;
  PERFORM public.update_staff_member(sal,'Samuel Sales','Senior sales','0700111222');
  IF (SELECT display_name FROM public.staff_profiles WHERE user_id = sal) <> 'Samuel Sales' THEN RAISE EXCEPTION '6d update failed'; END IF;
  PERFORM public.revoke_staff_invitation(inv);
  IF (SELECT (e->>'status') FROM jsonb_array_elements(public.get_staff_invitations()) e WHERE e->>'email'='newbie@t.invalid' LIMIT 1) <> 'revoked' THEN RAISE EXCEPTION '6e revoke failed'; END IF;
  RESET ROLE;
  RAISE NOTICE 'ok 1 staff-registration';
END $t$;
ROLLBACK;
\echo ' staff_registration_regression: OK'
