-- Operation 18 — Theme & Brand Governance 360
-- Versioned, permission-gated theme publishing with rollback and live design-token application.

ALTER TABLE public.theme_settings ADD COLUMN IF NOT EXISTS layout_style text NOT NULL DEFAULT 'classic' CHECK (layout_style IN ('classic','showcase'));

CREATE TABLE IF NOT EXISTS public.theme_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid NOT NULL REFERENCES public.theme_settings(id) ON DELETE CASCADE,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  change_reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(theme_id, version)
);

CREATE INDEX IF NOT EXISTS theme_revisions_theme_time_idx
  ON public.theme_revisions(theme_id, created_at DESC);

ALTER TABLE public.theme_revisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_direct_client_access ON public.theme_revisions;
CREATE POLICY deny_direct_client_access ON public.theme_revisions
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
REVOKE ALL ON public.theme_revisions FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.validate_theme_snapshot(p_theme jsonb)
RETURNS void
LANGUAGE plpgsql IMMUTABLE
SET search_path = public, private
AS $function$
DECLARE
  v_color text;
  v_radius integer;
  v_spacing integer;
BEGIN
  IF jsonb_typeof(coalesce(p_theme,'{}'::jsonb)) <> 'object' THEN RAISE EXCEPTION 'Theme payload must be an object'; END IF;
  FOREACH v_color IN ARRAY ARRAY[
    p_theme->>'primary_color', p_theme->>'secondary_color', p_theme->>'accent_color'
  ] LOOP
    IF v_color IS NOT NULL AND v_color !~ '^#[0-9A-Fa-f]{6}$' THEN RAISE EXCEPTION 'Theme colors must be six-digit hex values'; END IF;
  END LOOP;
  v_radius := COALESCE((p_theme->>'border_radius')::integer,8);
  v_spacing := COALESCE((p_theme->>'spacing_scale')::integer,8);
  IF v_radius < 0 OR v_radius > 24 THEN RAISE EXCEPTION 'Border radius must be between 0 and 24'; END IF;
  IF v_spacing < 4 OR v_spacing > 16 THEN RAISE EXCEPTION 'Spacing scale must be between 4 and 16'; END IF;
  IF COALESCE(p_theme->>'button_style','rounded') NOT IN ('rounded','pill','square') THEN RAISE EXCEPTION 'Invalid button style'; END IF;
  IF COALESCE(p_theme->>'layout_style','classic') NOT IN ('classic','showcase') THEN RAISE EXCEPTION 'Invalid layout style'; END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.publish_theme_settings(
  p_theme jsonb,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_theme public.theme_settings%ROWTYPE;
  v_snapshot jsonb;
  v_version integer;
BEGIN
  PERFORM private.require_staff_permission('content','update');
  PERFORM private.validate_theme_snapshot(p_theme);

  SELECT * INTO v_theme FROM public.theme_settings WHERE is_active=true ORDER BY updated_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.theme_settings(theme_name,is_active) VALUES ('Topline Default',true) RETURNING * INTO v_theme;
  END IF;

  v_snapshot := jsonb_build_object(
    'theme_name', COALESCE(NULLIF(trim(p_theme->>'theme_name'),''),v_theme.theme_name),
    'preset', COALESCE(NULLIF(trim(p_theme->>'preset'),''),v_theme.preset),
    'primary_color', COALESCE(p_theme->>'primary_color',v_theme.primary_color),
    'secondary_color', COALESCE(p_theme->>'secondary_color',v_theme.secondary_color),
    'accent_color', COALESCE(p_theme->>'accent_color',v_theme.accent_color),
    'heading_font', COALESCE(NULLIF(trim(p_theme->>'heading_font'),''),v_theme.heading_font),
    'body_font', COALESCE(NULLIF(trim(p_theme->>'body_font'),''),v_theme.body_font),
    'button_style', COALESCE(p_theme->>'button_style',v_theme.button_style),
    'border_radius', COALESCE((p_theme->>'border_radius')::integer,v_theme.border_radius),
    'spacing_scale', COALESCE((p_theme->>'spacing_scale')::integer,v_theme.spacing_scale),
    'layout_style', COALESCE(p_theme->>'layout_style',v_theme.layout_style)
  );
  v_version := COALESCE((SELECT max(version) FROM public.theme_revisions WHERE theme_id=v_theme.id),0)+1;
  INSERT INTO public.theme_revisions(theme_id,version,snapshot,change_reason,created_by)
  VALUES(v_theme.id,v_version,v_snapshot,left(nullif(trim(p_reason),''),500),v_user);

  UPDATE public.theme_settings SET
    theme_name=v_snapshot->>'theme_name', preset=v_snapshot->>'preset',
    primary_color=v_snapshot->>'primary_color', secondary_color=v_snapshot->>'secondary_color',
    accent_color=v_snapshot->>'accent_color', heading_font=v_snapshot->>'heading_font',
    body_font=v_snapshot->>'body_font', button_style=v_snapshot->>'button_style',
    border_radius=(v_snapshot->>'border_radius')::integer, spacing_scale=(v_snapshot->>'spacing_scale')::integer,
    layout_style=v_snapshot->>'layout_style', is_active=true, updated_at=now()
  WHERE id=v_theme.id;
  UPDATE public.theme_settings SET is_active=false, updated_at=now() WHERE id<>v_theme.id AND is_active=true;
  RETURN jsonb_build_object('theme_id',v_theme.id,'version',v_version,'snapshot',v_snapshot);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_theme_governance_360()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE
  v_theme public.theme_settings%ROWTYPE;
BEGIN
  PERFORM private.require_staff_permission('content','select');
  SELECT * INTO v_theme FROM public.theme_settings WHERE is_active=true ORDER BY updated_at DESC LIMIT 1;
  RETURN jsonb_build_object(
    'theme', CASE WHEN v_theme.id IS NULL THEN NULL ELSE to_jsonb(v_theme) END,
    'revisions', COALESCE((SELECT jsonb_agg(x ORDER BY x.version DESC) FROM (
      SELECT id,version,snapshot,change_reason,created_at,created_by
      FROM public.theme_revisions WHERE theme_id=v_theme.id ORDER BY version DESC LIMIT 20
    ) x),'[]'::jsonb)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.rollback_theme_settings(p_revision_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE
  v_user uuid := auth.uid(); v_rev public.theme_revisions%ROWTYPE; v_theme public.theme_settings%ROWTYPE; v_result jsonb;
BEGIN
  PERFORM private.require_staff_permission('content','update');
  SELECT * INTO v_rev FROM public.theme_revisions WHERE id=p_revision_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Theme revision not found'; END IF;
  SELECT * INTO v_theme FROM public.theme_settings WHERE id=v_rev.theme_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Theme no longer exists'; END IF;
  PERFORM private.validate_theme_snapshot(v_rev.snapshot);
  v_result := public.publish_theme_settings(v_rev.snapshot, COALESCE(p_reason,'Rollback to version '||v_rev.version));
  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.publish_theme_settings(jsonb,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_theme_governance_360() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rollback_theme_settings(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_theme_settings(jsonb,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_theme_governance_360() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_theme_settings(uuid,text) TO authenticated;

COMMENT ON TABLE public.theme_revisions IS 'Versioned snapshots for governed Topline theme publishing and rollback.';
