-- Add email column to admin_sessions if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_sessions' AND column_name = 'email') THEN
    ALTER TABLE admin_sessions ADD COLUMN email TEXT;
  END IF;
END $$;