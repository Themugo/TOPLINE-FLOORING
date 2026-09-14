-- Operation 18: Theme & Brand Governance 360
-- Versioned, auditable theme changes with controlled rollback.

CREATE TABLE IF NOT EXISTS public.theme_setting_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid NOT NULL REFERENCES public.theme_settings(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  theme_snapshot jsonb NOT NULL,
  change_type text NOT NULL CHECK (change_type IN ('save','rollback')),
  change_note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(theme_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_theme_setting_versions_theme_created
  ON public.theme_setting_versions(theme_id, created_at DESC);

ALTER TABLE public.theme_setting_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS theme_setting_versions_staff_select ON public.theme_setting_versions;
CREATE POLICY theme_setting_versions_staff_select
  ON public.theme_setting_versions FOR SELECT TO authenticated
  USING (private.current_user_has_permission('content','select'));

REVOKE ALL ON public.theme_setting_versions FROM PUBLIC, anon;
GRANT SELECT ON public.theme_setting_versions TO authenticated;

CREATE OR REPLACE FUNCTION public.get_theme_brand_governance_360()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_theme public.theme_settings%ROWTYPE;
BEGIN
  IF NOT private.current_user_has_permission('content','select') THEN
    RAISE EXCEPTION 'Insufficient permission to view theme governance';
  END IF;

  SELECT * INTO v_theme
  FROM public.theme_settings
  WHERE is_active = true
  ORDER BY updated_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'theme', CASE WHEN v_theme.id IS NULL THEN NULL ELSE to_jsonb(v_theme) END,
    'versions', COALESCE((
      SELECT jsonb_agg(to_jsonb(v) ORDER BY v.version_number DESC)
      FROM public.theme_setting_versions v
      WHERE v.theme_id = v_theme.id
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.save_theme_brand_version(
  p_theme jsonb,
  p_change_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_theme public.theme_settings%ROWTYPE;
  v_next integer;
  v_snapshot jsonb;
  v_theme_id uuid;
BEGIN
  IF NOT private.current_user_has_permission('content','update') THEN
    RAISE EXCEPTION 'Insufficient permission to update theme';
  END IF;

  v_theme_id := NULLIF(p_theme->>'id','')::uuid;
  IF v_theme_id IS NULL THEN
    SELECT id INTO v_theme_id FROM public.theme_settings WHERE is_active = true ORDER BY updated_at DESC LIMIT 1;
  END IF;
  IF v_theme_id IS NULL THEN
    RAISE EXCEPTION 'No active theme exists';
  END IF;

  UPDATE public.theme_settings
  SET theme_name = COALESCE(p_theme->>'theme_name', theme_name),
      preset = COALESCE(p_theme->>'preset', preset),
      primary_color = COALESCE(p_theme->>'primary_color', primary_color),
      secondary_color = COALESCE(p_theme->>'secondary_color', secondary_color),
      accent_color = COALESCE(p_theme->>'accent_color', accent_color),
      heading_font = COALESCE(p_theme->>'heading_font', heading_font),
      body_font = COALESCE(p_theme->>'body_font', body_font),
      button_style = COALESCE(p_theme->>'button_style', button_style),
      border_radius = COALESCE((p_theme->>'border_radius')::integer, border_radius),
      spacing_scale = COALESCE((p_theme->>'spacing_scale')::integer, spacing_scale),
      is_active = true,
      updated_at = now()
  WHERE id = v_theme_id
  RETURNING * INTO v_theme;

  v_snapshot := to_jsonb(v_theme);
  SELECT COALESCE(MAX(version_number),0) + 1 INTO v_next
  FROM public.theme_setting_versions WHERE theme_id = v_theme.id;

  INSERT INTO public.theme_setting_versions(theme_id, version_number, theme_snapshot, change_type, change_note, created_by)
  VALUES (v_theme.id, v_next, v_snapshot, 'save', NULLIF(trim(p_change_note),''), auth.uid());

  RETURN jsonb_build_object('theme', v_snapshot, 'version_number', v_next);
END;
$$;

CREATE OR REPLACE FUNCTION public.rollback_theme_brand_version(
  p_version_id uuid,
  p_change_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_version public.theme_setting_versions%ROWTYPE;
  v_theme public.theme_settings%ROWTYPE;
  v_next integer;
  v_snapshot jsonb;
BEGIN
  IF NOT private.current_user_has_permission('content','update') THEN
    RAISE EXCEPTION 'Insufficient permission to rollback theme';
  END IF;

  SELECT * INTO v_version FROM public.theme_setting_versions WHERE id = p_version_id;
  IF v_version.id IS NULL THEN RAISE EXCEPTION 'Theme version not found'; END IF;

  UPDATE public.theme_settings
  SET theme_name = COALESCE(v_version.theme_snapshot->>'theme_name', theme_name),
      preset = COALESCE(v_version.theme_snapshot->>'preset', preset),
      primary_color = COALESCE(v_version.theme_snapshot->>'primary_color', primary_color),
      secondary_color = COALESCE(v_version.theme_snapshot->>'secondary_color', secondary_color),
      accent_color = COALESCE(v_version.theme_snapshot->>'accent_color', accent_color),
      heading_font = COALESCE(v_version.theme_snapshot->>'heading_font', heading_font),
      body_font = COALESCE(v_version.theme_snapshot->>'body_font', body_font),
      button_style = COALESCE(v_version.theme_snapshot->>'button_style', button_style),
      border_radius = COALESCE((v_version.theme_snapshot->>'border_radius')::integer, border_radius),
      spacing_scale = COALESCE((v_version.theme_snapshot->>'spacing_scale')::integer, spacing_scale),
      is_active = true,
      updated_at = now()
  WHERE id = v_version.theme_id
  RETURNING * INTO v_theme;

  IF v_theme.id IS NULL THEN RAISE EXCEPTION 'Theme no longer exists'; END IF;

  v_snapshot := to_jsonb(v_theme);
  SELECT COALESCE(MAX(version_number),0) + 1 INTO v_next
  FROM public.theme_setting_versions WHERE theme_id = v_theme.id;

  INSERT INTO public.theme_setting_versions(theme_id, version_number, theme_snapshot, change_type, change_note, created_by)
  VALUES (v_theme.id, v_next, v_snapshot, 'rollback', COALESCE(NULLIF(trim(p_change_note),''), 'Rollback to version ' || v_version.version_number), auth.uid());

  RETURN jsonb_build_object('theme', v_snapshot, 'version_number', v_next, 'rolled_back_from', v_version.version_number);
END;
$$;

REVOKE ALL ON FUNCTION public.get_theme_brand_governance_360() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_theme_brand_version(jsonb,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rollback_theme_brand_version(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_theme_brand_governance_360() TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_theme_brand_version(jsonb,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_theme_brand_version(uuid,text) TO authenticated;

-- Seed a baseline version for the currently active theme, without changing it.
INSERT INTO public.theme_setting_versions(theme_id, version_number, theme_snapshot, change_type, change_note)
SELECT t.id, 1, to_jsonb(t), 'save', 'Initial governed theme baseline'
FROM public.theme_settings t
WHERE t.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.theme_setting_versions v WHERE v.theme_id = t.id);
