-- Legacy plaintext/custom-admin credential storage is explicitly cleared.
-- Set a more secure default password (change this immediately!)
-- Historical credential-repair migration retained for audit history.
UPDATE admin_settings 
SET setting_value = NULL
WHERE setting_key = 'password';

-- Set requires_password_change to true to force password change on first login
INSERT INTO admin_settings (setting_key, setting_value) 
VALUES ('requires_password_change', 'true')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = 'true';
