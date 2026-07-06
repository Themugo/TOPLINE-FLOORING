-- Fix admin credentials keys to match RPC function expectations
-- The verify_owner_login function expects 'username' and 'password' keys
-- but the initial migration inserted 'admin_username' and 'admin_password'

-- Update the keys to match what the RPC function expects
UPDATE admin_settings SET setting_key = 'username' WHERE setting_key = 'admin_username';
UPDATE admin_settings SET setting_key = 'password' WHERE setting_key = 'admin_password';

-- Ensure the password is properly hashed with bcrypt
UPDATE admin_settings 
SET setting_value = crypt('admin123', gen_salt('bf'))
WHERE setting_key = 'password' 
AND setting_value = 'admin123';

-- Set email if not exists
INSERT INTO admin_settings (setting_key, setting_value) 
VALUES ('email', 'admin@toplineflooring.co.ke')
ON CONFLICT (setting_key) DO NOTHING;

-- Set requires_password_change to false
INSERT INTO admin_settings (setting_key, setting_value) 
VALUES ('requires_password_change', 'false')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = 'false';
