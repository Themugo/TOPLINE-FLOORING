-- Admin notification read/dismiss state is server-side, per authenticated staff user.
-- The alert itself is derived from authoritative operational data; this table stores only UI state.
CREATE TABLE IF NOT EXISTS public.admin_notification_states (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_key text NOT NULL CHECK (char_length(trim(notification_key)) BETWEEN 1 AND 180),
  is_read boolean NOT NULL DEFAULT false,
  is_dismissed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, notification_key)
);

ALTER TABLE public.admin_notification_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_notification_states FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_notification_states TO authenticated;

DROP POLICY IF EXISTS admin_notification_states_staff ON public.admin_notification_states;
CREATE POLICY admin_notification_states_staff ON public.admin_notification_states
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND private.current_user_has_permission('projects','select'))
  WITH CHECK (user_id = auth.uid() AND private.current_user_has_permission('projects','select'));

DROP TRIGGER IF EXISTS admin_notification_states_updated_at ON public.admin_notification_states;
CREATE TRIGGER admin_notification_states_updated_at
BEFORE UPDATE ON public.admin_notification_states
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();
