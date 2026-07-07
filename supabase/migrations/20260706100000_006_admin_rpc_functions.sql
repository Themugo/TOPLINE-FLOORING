/*
# Sixth Migration: Admin Auth RPC Functions

Creates the PostgreSQL functions used by the admin login flow.

Uses pgcrypto's `crypt()` / `gen_salt()` for bcrypt password hashing,
matching the seed data in migration 005.

## Functions
1. `verify_owner_login(p_username, p_password)` — authenticates admin
2. `change_owner_password(p_current_password, p_new_password)` — changes password
3. `update_owner_credentials(p_username, p_email)` — updates username/email
*/

-- ============================================================
-- verify_owner_login
-- ============================================================
CREATE OR REPLACE FUNCTION verify_owner_login(p_username text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stored_hash text;
  stored_username text;
  stored_email text;
  requires_change text;
BEGIN
  SELECT setting_value INTO stored_username FROM admin_settings WHERE setting_key = 'username';
  SELECT setting_value INTO stored_hash FROM admin_settings WHERE setting_key = 'password';
  SELECT setting_value INTO stored_email FROM admin_settings WHERE setting_key = 'email';
  SELECT COALESCE(setting_value, 'false') INTO requires_change FROM admin_settings WHERE setting_key = 'requires_password_change';

  IF stored_username = p_username AND stored_hash = crypt(p_password, stored_hash) THEN
    RETURN jsonb_build_object(
      'success', true,
      'username', stored_username,
      'email', COALESCE(stored_email, ''),
      'requires_password_change', (requires_change = 'true')
    );
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid username or password');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION verify_owner_login(text, text) TO anon, authenticated;

-- ============================================================
-- change_owner_password
-- ============================================================
CREATE OR REPLACE FUNCTION change_owner_password(p_current_password text, p_new_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stored_hash text;
BEGIN
  SELECT setting_value INTO stored_hash FROM admin_settings WHERE setting_key = 'password';

  IF stored_hash != crypt(p_current_password, stored_hash) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Current password is incorrect');
  END IF;

  UPDATE admin_settings
  SET setting_value = crypt(p_new_password, gen_salt('bf')), updated_at = now()
  WHERE setting_key = 'password';

  UPDATE admin_settings
  SET setting_value = 'false', updated_at = now()
  WHERE setting_key = 'requires_password_change';

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION change_owner_password(text, text) TO anon, authenticated;

-- ============================================================
-- update_owner_credentials
-- ============================================================
CREATE OR REPLACE FUNCTION update_owner_credentials(p_username text DEFAULT NULL, p_email text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_username IS NOT NULL THEN
    UPDATE admin_settings SET setting_value = p_username, updated_at = now() WHERE setting_key = 'username';
  END IF;

  IF p_email IS NOT NULL THEN
    UPDATE admin_settings SET setting_value = p_email, updated_at = now() WHERE setting_key = 'email';
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION update_owner_credentials(text, text) TO anon, authenticated;
