-- Admin No-Code Site Control Plane 360
-- Structured page blocks, design tokens, integration configuration metadata and feature flags.

CREATE TABLE IF NOT EXISTS public.site_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  seo_title text,
  seo_description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  template text NOT NULL DEFAULT 'standard' CHECK (template IN ('standard','landing','full_width')),
  display_order integer NOT NULL DEFAULT 0,
  is_indexable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_page_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.site_pages(id) ON DELETE CASCADE,
  block_type text NOT NULL CHECK (block_type IN ('hero','rich_text','image','two_column','cards','cta','spacer','divider','quote','feature_grid')),
  block_key text NOT NULL,
  title text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  style jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(page_id, block_key)
);

CREATE INDEX IF NOT EXISTS idx_site_page_blocks_page_order ON public.site_page_blocks(page_id, display_order);
CREATE INDEX IF NOT EXISTS idx_site_pages_status_slug ON public.site_pages(status, slug);

CREATE TABLE IF NOT EXISTS public.site_design_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_key text NOT NULL UNIQUE,
  token_value text NOT NULL,
  token_type text NOT NULL DEFAULT 'css' CHECK (token_type IN ('css','number','text')),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_integration_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_key text NOT NULL UNIQUE,
  channel text NOT NULL CHECK (channel IN ('payment','email','sms','whatsapp')),
  provider text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  public_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  required_secret_env text,
  secret_configured boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'not_configured' CHECK (status IN ('not_configured','configured','testing','healthy','degraded','disabled')),
  last_tested_at timestamptz,
  last_test_message text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  is_enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_page_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_design_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS site_pages_public_read ON public.site_pages;
CREATE POLICY site_pages_public_read ON public.site_pages FOR SELECT TO anon, authenticated USING (status='published');
DROP POLICY IF EXISTS site_pages_staff_select ON public.site_pages;
CREATE POLICY site_pages_staff_select ON public.site_pages FOR SELECT TO authenticated USING (private.current_user_has_permission('content','select'));
DROP POLICY IF EXISTS site_pages_staff_insert ON public.site_pages;
CREATE POLICY site_pages_staff_insert ON public.site_pages FOR INSERT TO authenticated WITH CHECK (private.current_user_has_permission('content','insert'));
DROP POLICY IF EXISTS site_pages_staff_update ON public.site_pages;
CREATE POLICY site_pages_staff_update ON public.site_pages FOR UPDATE TO authenticated USING (private.current_user_has_permission('content','update')) WITH CHECK (private.current_user_has_permission('content','update'));
DROP POLICY IF EXISTS site_pages_staff_delete ON public.site_pages;
CREATE POLICY site_pages_staff_delete ON public.site_pages FOR DELETE TO authenticated USING (private.current_user_has_permission('content','delete'));

DROP POLICY IF EXISTS site_page_blocks_public_read ON public.site_page_blocks;
CREATE POLICY site_page_blocks_public_read ON public.site_page_blocks FOR SELECT TO anon, authenticated USING (is_active=true AND EXISTS (SELECT 1 FROM public.site_pages p WHERE p.id=page_id AND p.status='published'));
DROP POLICY IF EXISTS site_page_blocks_staff_select ON public.site_page_blocks;
CREATE POLICY site_page_blocks_staff_select ON public.site_page_blocks FOR SELECT TO authenticated USING (private.current_user_has_permission('content','select'));
DROP POLICY IF EXISTS site_page_blocks_staff_insert ON public.site_page_blocks;
CREATE POLICY site_page_blocks_staff_insert ON public.site_page_blocks FOR INSERT TO authenticated WITH CHECK (private.current_user_has_permission('content','insert'));
DROP POLICY IF EXISTS site_page_blocks_staff_update ON public.site_page_blocks;
CREATE POLICY site_page_blocks_staff_update ON public.site_page_blocks FOR UPDATE TO authenticated USING (private.current_user_has_permission('content','update')) WITH CHECK (private.current_user_has_permission('content','update'));
DROP POLICY IF EXISTS site_page_blocks_staff_delete ON public.site_page_blocks;
CREATE POLICY site_page_blocks_staff_delete ON public.site_page_blocks FOR DELETE TO authenticated USING (private.current_user_has_permission('content','delete'));

DROP POLICY IF EXISTS site_design_tokens_public_read ON public.site_design_tokens;
CREATE POLICY site_design_tokens_public_read ON public.site_design_tokens FOR SELECT TO anon, authenticated USING (is_active=true);
DROP POLICY IF EXISTS site_design_tokens_staff_select ON public.site_design_tokens;
CREATE POLICY site_design_tokens_staff_select ON public.site_design_tokens FOR SELECT TO authenticated USING (private.current_user_has_permission('content','select'));
DROP POLICY IF EXISTS site_design_tokens_staff_insert ON public.site_design_tokens;
CREATE POLICY site_design_tokens_staff_insert ON public.site_design_tokens FOR INSERT TO authenticated WITH CHECK (private.current_user_has_permission('content','insert'));
DROP POLICY IF EXISTS site_design_tokens_staff_update ON public.site_design_tokens;
CREATE POLICY site_design_tokens_staff_update ON public.site_design_tokens FOR UPDATE TO authenticated USING (private.current_user_has_permission('content','update')) WITH CHECK (private.current_user_has_permission('content','update'));
DROP POLICY IF EXISTS site_design_tokens_staff_delete ON public.site_design_tokens;
CREATE POLICY site_design_tokens_staff_delete ON public.site_design_tokens FOR DELETE TO authenticated USING (private.current_user_has_permission('content','delete'));

DROP POLICY IF EXISTS site_integration_configs_staff_select ON public.site_integration_configs;
CREATE POLICY site_integration_configs_staff_select ON public.site_integration_configs FOR SELECT TO authenticated USING (private.current_user_has_permission('settings','select'));
DROP POLICY IF EXISTS site_integration_configs_staff_insert ON public.site_integration_configs;
CREATE POLICY site_integration_configs_staff_insert ON public.site_integration_configs FOR INSERT TO authenticated WITH CHECK (private.current_user_has_permission('settings','insert'));
DROP POLICY IF EXISTS site_integration_configs_staff_update ON public.site_integration_configs;
CREATE POLICY site_integration_configs_staff_update ON public.site_integration_configs FOR UPDATE TO authenticated USING (private.current_user_has_permission('settings','update')) WITH CHECK (private.current_user_has_permission('settings','update'));
DROP POLICY IF EXISTS site_integration_configs_staff_delete ON public.site_integration_configs;
CREATE POLICY site_integration_configs_staff_delete ON public.site_integration_configs FOR DELETE TO authenticated USING (private.current_user_has_permission('settings','delete'));

DROP POLICY IF EXISTS site_feature_flags_staff_select ON public.site_feature_flags;
CREATE POLICY site_feature_flags_staff_select ON public.site_feature_flags FOR SELECT TO authenticated USING (private.current_user_has_permission('settings','select'));
DROP POLICY IF EXISTS site_feature_flags_staff_insert ON public.site_feature_flags;
CREATE POLICY site_feature_flags_staff_insert ON public.site_feature_flags FOR INSERT TO authenticated WITH CHECK (private.current_user_has_permission('settings','insert'));
DROP POLICY IF EXISTS site_feature_flags_staff_update ON public.site_feature_flags;
CREATE POLICY site_feature_flags_staff_update ON public.site_feature_flags FOR UPDATE TO authenticated USING (private.current_user_has_permission('settings','update')) WITH CHECK (private.current_user_has_permission('settings','update'));
DROP POLICY IF EXISTS site_feature_flags_staff_delete ON public.site_feature_flags;
CREATE POLICY site_feature_flags_staff_delete ON public.site_feature_flags FOR DELETE TO authenticated USING (private.current_user_has_permission('settings','delete'));

GRANT SELECT ON public.site_pages, public.site_page_blocks, public.site_design_tokens TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_pages, public.site_page_blocks, public.site_design_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_integration_configs, public.site_feature_flags TO authenticated;

CREATE OR REPLACE FUNCTION public.get_published_site_page(p_slug text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT jsonb_build_object(
    'page', to_jsonb(p),
    'blocks', COALESCE((SELECT jsonb_agg(to_jsonb(b) ORDER BY b.display_order, b.created_at) FROM public.site_page_blocks b WHERE b.page_id=p.id AND b.is_active=true), '[]'::jsonb)
  )
  FROM public.site_pages p
  WHERE p.slug=lower(trim(p_slug)) AND p.status='published'
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_published_site_page(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_published_site_page(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.save_site_page_block(p_block_id uuid, p_page_id uuid, p_block_type text, p_block_key text, p_title text, p_content jsonb, p_display_order integer, p_is_active boolean, p_style jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT private.current_user_has_permission('content','update') THEN RAISE EXCEPTION 'Content update permission required'; END IF;
  IF p_block_type NOT IN ('hero','rich_text','image','two_column','cards','cta','spacer','divider','quote','feature_grid') THEN RAISE EXCEPTION 'Unsupported block type'; END IF;
  IF p_block_id IS NULL THEN
    IF NOT private.current_user_has_permission('content','insert') THEN RAISE EXCEPTION 'Content insert permission required'; END IF;
    INSERT INTO public.site_page_blocks(page_id,block_type,block_key,title,content,display_order,is_active,style)
    VALUES(p_page_id,p_block_type,p_block_key,p_title,coalesce(p_content,'{}'::jsonb),p_display_order,coalesce(p_is_active,true),coalesce(p_style,'{}'::jsonb)) RETURNING id INTO v_id;
  ELSE
    UPDATE public.site_page_blocks SET page_id=p_page_id,block_type=p_block_type,block_key=p_block_key,title=p_title,content=coalesce(p_content,'{}'::jsonb),display_order=p_display_order,is_active=coalesce(p_is_active,true),style=coalesce(p_style,'{}'::jsonb),updated_at=now() WHERE id=p_block_id RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'Block not found'; END IF;
  END IF;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.save_site_page_block(uuid,uuid,text,text,text,jsonb,integer,boolean,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_site_page_block(uuid,uuid,text,text,text,jsonb,integer,boolean,jsonb) TO authenticated;

INSERT INTO public.site_design_tokens(token_key,token_value,token_type,description)
VALUES
('container.max_width','1280px','css','Maximum content width'),
('layout.section_gap','64px','css','Default section vertical spacing'),
('layout.content_gap','24px','css','Default content gap'),
('surface.radius','12px','css','Default surface radius'),
('surface.shadow','0 10px 30px rgba(15,23,42,.08)','css','Default surface shadow')
ON CONFLICT(token_key) DO NOTHING;

INSERT INTO public.site_integration_configs(integration_key,channel,provider,is_enabled,required_secret_env,status)
VALUES
('payments.primary','payment','mpesa',false,'PAYMENT_WEBHOOK_SECRET','not_configured'),
('communications.email','email','resend',false,'RESEND_API_KEY','not_configured'),
('communications.sms','sms','africas_talking',false,'AFRICASTALKING_API_KEY','not_configured'),
('communications.whatsapp','whatsapp','twilio',false,'TWILIO_AUTH_TOKEN','disabled')
ON CONFLICT(integration_key) DO NOTHING;

INSERT INTO public.site_feature_flags(flag_key,label,description,is_enabled)
VALUES
('commerce.checkout','Customer checkout','Enable customer checkout surface',true),
('commerce.quotations','Quotations','Enable quotation workflow',true),
('commerce.payments','Payments','Enable payment workflow',false),
('communications.email','Email','Enable email communications',false),
('communications.sms','SMS','Enable SMS communications',false),
('communications.whatsapp','WhatsApp','Enable WhatsApp communications',false)
ON CONFLICT(flag_key) DO NOTHING;

