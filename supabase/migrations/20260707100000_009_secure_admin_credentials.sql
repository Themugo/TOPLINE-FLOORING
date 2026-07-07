-- IMPORTANT: This migration sets a secure default password
-- CHANGE THIS IMMEDIATELY AFTER DEPLOYMENT
-- Run: UPDATE admin_settings SET setting_value = crypt('YOUR_NEW_PASSWORD', gen_salt('bf')) WHERE setting_key = 'password';

-- Set a more secure default password (change this immediately!)
-- Default: ToplineSecure2024!
UPDATE admin_settings 
SET setting_value = crypt('ToplineSecure2024!', gen_salt('bf'))
WHERE setting_key = 'password';

-- Set requires_password_change to true to force password change on first login
INSERT INTO admin_settings (setting_key, setting_value) 
VALUES ('requires_password_change', 'true')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = 'true';
