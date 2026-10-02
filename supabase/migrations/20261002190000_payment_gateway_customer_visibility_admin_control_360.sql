-- Payment Gateway Customer Visibility + Admin Control 360
-- Customer-facing payment methods are DB-driven; secrets and gateway configuration remain admin/server-side.

CREATE TABLE IF NOT EXISTS public.payment_gateway_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_key text NOT NULL UNIQUE,
  provider text NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('mpesa','card','bank_transfer')),
  display_name text NOT NULL,
  customer_description text,
  icon_key text,
  is_enabled boolean NOT NULL DEFAULT false,
  customer_visible boolean NOT NULL DEFAULT true,
  supports_checkout boolean NOT NULL DEFAULT true,
  supports_orders boolean NOT NULL DEFAULT true,
  supports_invoices boolean NOT NULL DEFAULT true,
  requires_customer_phone boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 100,
  public_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  admin_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  secret_env_keys text[] NOT NULL DEFAULT '{}'::text[],
  health_status text NOT NULL DEFAULT 'not_configured' CHECK (health_status IN ('not_configured','testing','healthy','degraded','disabled')),
  last_tested_at timestamptz,
  last_test_message text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_gateway_methods_customer_idx
  ON public.payment_gateway_methods (is_enabled, customer_visible, sort_order);

ALTER TABLE public.payment_gateway_methods ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_gateway_methods FROM anon, authenticated;

DROP POLICY IF EXISTS payment_gateway_methods_staff_select ON public.payment_gateway_methods;
CREATE POLICY payment_gateway_methods_staff_select ON public.payment_gateway_methods
  FOR SELECT TO authenticated USING (private.current_user_has_permission('settings','select'));
DROP POLICY IF EXISTS payment_gateway_methods_staff_insert ON public.payment_gateway_methods;
CREATE POLICY payment_gateway_methods_staff_insert ON public.payment_gateway_methods
  FOR INSERT TO authenticated WITH CHECK (private.current_user_has_permission('settings','insert'));
DROP POLICY IF EXISTS payment_gateway_methods_staff_update ON public.payment_gateway_methods;
CREATE POLICY payment_gateway_methods_staff_update ON public.payment_gateway_methods
  FOR UPDATE TO authenticated USING (private.current_user_has_permission('settings','update'))
  WITH CHECK (private.current_user_has_permission('settings','update'));
DROP POLICY IF EXISTS payment_gateway_methods_staff_delete ON public.payment_gateway_methods;
CREATE POLICY payment_gateway_methods_staff_delete ON public.payment_gateway_methods
  FOR DELETE TO authenticated USING (private.current_user_has_permission('settings','delete'));

CREATE OR REPLACE FUNCTION public.get_customer_payment_methods(p_context text DEFAULT 'checkout')
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'gateway_key', gateway_key,
      'provider', provider,
      'payment_method', payment_method,
      'display_name', display_name,
      'customer_description', customer_description,
      'icon_key', icon_key,
      'requires_customer_phone', requires_customer_phone,
      'public_config', COALESCE((SELECT jsonb_object_agg(k,v) FROM jsonb_each(public_config) AS e(k,v) WHERE k !~* '(secret|token|password|private|api[_-]?key|credential|passkey|signature)'), '{}'::jsonb)
    ) ORDER BY sort_order, display_name
  ), '[]'::jsonb)
  FROM public.payment_gateway_methods
  WHERE is_enabled = true
    AND customer_visible = true
    AND CASE p_context
      WHEN 'checkout' THEN supports_checkout
      WHEN 'order' THEN supports_orders
      WHEN 'invoice' THEN supports_invoices
      ELSE false
    END;
$$;

REVOKE ALL ON FUNCTION public.get_customer_payment_methods(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_customer_payment_methods(text) TO anon, authenticated;

INSERT INTO public.payment_gateway_methods (
  gateway_key, provider, payment_method, display_name, customer_description, icon_key,
  is_enabled, customer_visible, supports_checkout, supports_orders, supports_invoices,
  requires_customer_phone, sort_order, public_config, admin_config, secret_env_keys
) VALUES
('mpesa', 'mpesa', 'mpesa', 'M-Pesa', 'Pay securely using M-Pesa.', 'mobile-money', false, true, true, true, true, true, 10, '{}'::jsonb, '{}'::jsonb, ARRAY['MPESA_CONSUMER_KEY','MPESA_CONSUMER_SECRET','MPESA_SHORTCODE','MPESA_PASSKEY','MPESA_CALLBACK_URL']::text[]),
('card', 'card_gateway', 'card', 'Card', 'Pay securely with Visa, Mastercard or other supported cards.', 'card', false, true, true, true, true, false, 20, '{}'::jsonb, '{}'::jsonb, ARRAY['CARD_GATEWAY_SECRET','CARD_GATEWAY_PUBLIC_KEY','CARD_GATEWAY_WEBHOOK_SECRET']::text[]),
('bank_transfer', 'bank_transfer', 'bank_transfer', 'Bank Transfer', 'Use Topline bank transfer instructions and your payment reference.', 'bank', false, true, true, true, true, false, 30, '{}'::jsonb, '{}'::jsonb, ARRAY['BANK_ACCOUNT_CONFIGURATION']::text[])
ON CONFLICT (gateway_key) DO NOTHING;

-- Keep the legacy integration registry aligned with the canonical payment gateway catalogue.
INSERT INTO public.site_integration_configs (integration_key, channel, provider, is_enabled, public_config, required_secret_env, secret_configured, status)
VALUES
('payments.mpesa','payment','mpesa',false,'{}'::jsonb,'MPESA_CONSUMER_KEY',false,'not_configured'),
('payments.card','payment','card_gateway',false,'{}'::jsonb,'CARD_GATEWAY_SECRET',false,'not_configured'),
('payments.bank_transfer','payment','bank_transfer',false,'{}'::jsonb,'BANK_ACCOUNT_CONFIGURATION',false,'not_configured')
ON CONFLICT (integration_key) DO NOTHING;

COMMENT ON TABLE public.payment_gateway_methods IS 'Canonical customer-visible payment gateway catalogue. Secrets and private gateway configuration never leave the server/admin boundary.';
COMMENT ON FUNCTION public.get_customer_payment_methods(text) IS 'Public, fail-safe payment method discovery. Returns only enabled customer-visible methods and explicitly safe public_config fields.';
