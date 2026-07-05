-- Owner credentials table (single row for the owner)
CREATE TABLE IF NOT EXISTS owner_credentials (
  id INTEGER PRIMARY KEY DEFAULT 1,
  username TEXT NOT NULL DEFAULT 'owner',
  password_hash TEXT NOT NULL,
  email TEXT,
  temporary_password BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_owner CHECK (id = 1)
);

-- Extend site_settings with more comprehensive fields
-- First check if site_settings exists, if not create it
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'site_settings') THEN
    CREATE TABLE site_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Insert default settings if they don't exist
INSERT INTO site_settings (key, value) VALUES
  ('company_name', 'Topline Flooring and Waterproofing'),
  ('company_tagline', 'Professional Flooring & Waterproofing Solutions'),
  ('company_description', 'Topline Flooring and Waterproofing is Kenya''s premier provider of professional flooring and waterproofing solutions. We deliver quality craftsmanship for residential, commercial, and industrial projects across East Africa.'),
  ('company_address', 'Nairobi, Kenya'),
  ('company_phone1', '0720 859 737'),
  ('company_phone2', '0755 293 372'),
  ('company_email', 'toplineflooringandwaterproofin@gmail.com'),
  ('company_hours', 'Mon-Sat: 8:00 AM - 6:00 PM'),
  ('company_whatsapp', '254720859737'),
  ('logo_url', ''),
  ('favicon_url', ''),
  ('footer_text', 'Delivering excellence in flooring and waterproofing across Kenya.'),
  ('copyright_text', '© 2024 Topline Flooring and Waterproofing. All rights reserved.'),
  ('google_maps_embed', ''),
  ('social_facebook', ''),
  ('social_instagram', ''),
  ('social_twitter', ''),
  ('social_linkedin', ''),
  ('social_youtube', ''),
  ('seo_title', 'Topline Flooring and Waterproofing | Professional Solutions in Kenya'),
  ('seo_description', 'Topline Flooring and Waterproofing offers premium flooring and waterproofing services in Kenya.'),
  ('seo_keywords', 'flooring, waterproofing, Kenya, Nairobi, epoxy, tiles, concrete, sealing'),
  ('google_analytics_id', ''),
  ('google_tag_manager_id', ''),
  ('theme_primary', '#C7A368'),
  ('theme_secondary', '#1E3A5F'),
  ('theme_accent', '#0EA5E9'),
  ('theme_mode', 'light'),
  ('theme_radius', '0.25rem'),
  ('theme_button_style', 'rounded'),
  ('theme_header_style', 'default'),
  ('theme_footer_style', 'default'),
  ('layout_preset', 'modern'),
  ('hero_height_desktop', '60'),
  ('hero_height_mobile', '45'),
  ('hero_transition_speed', '4000'),
  ('hero_pause_on_hover', 'true'),
  ('hero_show_indicators', 'true'),
  ('hero_show_arrows', 'true')
ON CONFLICT (key) DO NOTHING;

-- Create a stored procedure for owner password verification
CREATE OR REPLACE FUNCTION verify_owner_login(p_username TEXT, p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner RECORD;
  v_result JSON;
BEGIN
  SELECT * INTO v_owner FROM owner_credentials WHERE id = 1;
  
  IF NOT FOUND THEN
    -- Initialize with default credentials if no owner exists
    INSERT INTO owner_credentials (id, username, password_hash, email, temporary_password)
    VALUES (1, 'owner', crypt('Topline@2024!', gen_salt('bf')), 'admin@toplineflooring.co.ke', true)
    ON CONFLICT (id) DO NOTHING;
    
    SELECT * INTO v_owner FROM owner_credentials WHERE id = 1;
  END IF;
  
  IF v_owner.username = p_username AND v_owner.password_hash = crypt(p_password, v_owner.password_hash) THEN
    v_result := json_build_object(
      'success', true,
      'username', v_owner.username,
      'email', v_owner.email,
      'requires_password_change', v_owner.temporary_password
    );
  ELSE
    v_result := json_build_object('success', false, 'error', 'Invalid credentials');
  END IF;
  
  RETURN v_result;
END;
$$;

-- Function to change owner password
CREATE OR REPLACE FUNCTION change_owner_password(
  p_current_password TEXT,
  p_new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner RECORD;
BEGIN
  SELECT * INTO v_owner FROM owner_credentials WHERE id = 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Owner not found');
  END IF;
  
  IF v_owner.password_hash != crypt(p_current_password, v_owner.password_hash) THEN
    RETURN json_build_object('success', false, 'error', 'Current password is incorrect');
  END IF;
  
  UPDATE owner_credentials 
  SET 
    password_hash = crypt(p_new_password, gen_salt('bf')),
    temporary_password = false,
    updated_at = NOW()
  WHERE id = 1;
  
  RETURN json_build_object('success', true);
END;
$$;

-- Function to update owner username/email
CREATE OR REPLACE FUNCTION update_owner_credentials(
  p_username TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE owner_credentials 
  SET 
    username = COALESCE(p_username, username),
    email = COALESCE(p_email, email),
    updated_at = NOW()
  WHERE id = 1;
  
  RETURN json_build_object('success', true);
END;
$$;

-- Enable RLS
ALTER TABLE owner_credentials ENABLE ROW LEVEL SECURITY;

-- Only allow anon/authenticated to use the functions (not direct table access)
CREATE POLICY "no_direct_access_owner_credentials" ON owner_credentials
  FOR ALL USING (false);

-- Create admin_sessions table if not exists
CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  username TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  user_agent TEXT,
  ip_address TEXT
);

-- RLS for admin_sessions
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_sessions_select" ON admin_sessions
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "admin_sessions_insert" ON admin_sessions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "admin_sessions_delete" ON admin_sessions
  FOR DELETE TO anon, authenticated USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_id ON admin_sessions(id);

-- Clean up expired sessions periodically (using a function that can be called)
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM admin_sessions WHERE expires_at < NOW();
$$;
