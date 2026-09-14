-- Brevo transactional email integration 360.
-- Provider metadata is non-secret; API keys and SMTP credentials remain in deployment/Supabase secret storage.

UPDATE public.site_integration_configs
SET provider='brevo',
    is_enabled=false,
    public_config=jsonb_build_object(
      'api_base','https://api.brevo.com/v3',
      'smtp_host','smtp-relay.brevo.com',
      'smtp_ports',jsonb_build_array(587,2525,465),
      'sender_email','no-reply@toplineflooringandwaterproofing.co.ke',
      'reply_to_email','support@toplineflooringandwaterproofing.co.ke',
      'sender_name','Topline Flooring & Waterproofing',
      'auth_mode','transactional_api',
      'webhook_function','communication-provider-webhook',
      'test_function','brevo-test-email'
    ),
    required_secret_env='BREVO_API_KEY',
    status='not_configured',
    last_tested_at=NULL,
    last_test_message=NULL,
    updated_at=now()
WHERE integration_key='communications.email';

INSERT INTO public.site_integration_configs(integration_key,channel,provider,is_enabled,public_config,required_secret_env,status)
VALUES (
  'communications.email.auth',
  'email',
  'brevo',
  false,
  jsonb_build_object(
    'smtp_host','smtp-relay.brevo.com',
    'smtp_ports',jsonb_build_array(587,2525,465),
    'recommended_port',587,
    'tls','STARTTLS',
    'sender_email','no-reply@toplineflooringandwaterproofing.co.ke',
    'reply_to_email','support@toplineflooringandwaterproofing.co.ke',
    'purpose','Supabase Auth transactional email transport'
  ),
  'SUPABASE_AUTH_SMTP_PASSWORD',
  'not_configured'
)
ON CONFLICT(integration_key) DO UPDATE SET
  provider=EXCLUDED.provider,
  public_config=EXCLUDED.public_config,
  required_secret_env=EXCLUDED.required_secret_env,
  updated_at=now();

UPDATE public.site_feature_flags
SET is_enabled=false,
    config=jsonb_build_object('provider','brevo','requires_secret','BREVO_API_KEY','activation_requires_provider_test',true),
    updated_at=now()
WHERE flag_key='communications.email';

COMMENT ON TABLE public.site_integration_configs IS 'Non-secret provider metadata. Secret values are deployment/Supabase secret-store concerns and must never be stored in this table.';
