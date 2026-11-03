-- Pass 13: (1) business_payment_accounts could never be saved because RLS asks for
-- settings:insert / settings:delete, which were never seeded (only select/update exist).
-- (2) signed-in customers with no customer_portal_access row got a dead-end dashboard.

-- 1. Permissions -------------------------------------------------------------
INSERT INTO public.staff_permissions(resource, action, description) VALUES
  ('settings','insert','Create system settings and payment details'),
  ('settings','delete','Delete system settings and payment details')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO public.staff_role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM public.staff_roles r
CROSS JOIN public.staff_permissions p
WHERE r.code IN ('owner','admin')
ON CONFLICT DO NOTHING;

-- 2. Self-service portal claim ------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_customer_portal_access()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid uuid := auth.uid();
  u_email text;
  u_confirmed timestamptz;
  u_meta jsonb;
  existing uuid;
  matched uuid;
  matched_count integer;
  new_customer uuid;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('status','unauthenticated');
  END IF;

  SELECT cpa.customer_id INTO existing
    FROM public.customer_portal_access cpa
   WHERE cpa.auth_user_id = uid AND cpa.is_active = true LIMIT 1;
  IF existing IS NOT NULL THEN
    UPDATE public.customer_portal_access SET last_login = now() WHERE auth_user_id = uid;
    RETURN jsonb_build_object('status','already_linked');
  END IF;

  SELECT u.email, u.email_confirmed_at, u.raw_user_meta_data
    INTO u_email, u_confirmed, u_meta
    FROM auth.users u WHERE u.id = uid;

  IF u_email IS NULL OR u_confirmed IS NULL THEN
    RETURN jsonb_build_object('status','unverified');
  END IF;

  SELECT count(*) INTO matched_count
    FROM public.customers c WHERE lower(trim(c.email)) = lower(trim(u_email));

  IF matched_count > 1 THEN
    RETURN jsonb_build_object('status','ambiguous');
  END IF;

  IF matched_count = 1 THEN
    SELECT c.id INTO matched FROM public.customers c WHERE lower(trim(c.email)) = lower(trim(u_email));
    IF EXISTS (SELECT 1 FROM public.customer_portal_access cpa
                WHERE cpa.customer_id = matched AND cpa.is_active = true) THEN
      RETURN jsonb_build_object('status','conflict');
    END IF;
    INSERT INTO public.customer_portal_access(customer_id, auth_user_id, is_active, last_login)
    VALUES (matched, uid, true, now())
    ON CONFLICT (customer_id) DO UPDATE
      SET auth_user_id = EXCLUDED.auth_user_id, is_active = true, last_login = now()
      WHERE public.customer_portal_access.is_active = false;
    RETURN jsonb_build_object('status','linked');
  END IF;

  INSERT INTO public.customers(name, email, phone)
  VALUES (
    COALESCE(NULLIF(trim(u_meta->>'full_name'),''), NULLIF(trim(u_meta->>'name'),''), split_part(u_email,'@',1)),
    lower(trim(u_email)),
    COALESCE(NULLIF(trim(u_meta->>'phone'),''), 'Not provided')
  )
  RETURNING id INTO new_customer;

  INSERT INTO public.customer_portal_access(customer_id, auth_user_id, is_active, last_login)
  VALUES (new_customer, uid, true, now());
  RETURN jsonb_build_object('status','created');
END;
$$;

REVOKE ALL ON FUNCTION public.claim_customer_portal_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_customer_portal_access() TO authenticated;
COMMENT ON FUNCTION public.claim_customer_portal_access() IS 'Self-service repair: binds the signed-in, email-verified user to their customer profile (unique email match) or creates one; never rebinds an actively linked customer.';
