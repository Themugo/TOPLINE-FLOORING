-- Admin-managed bank and manual-payment details (bank accounts, M-Pesa Paybill / Till / Send Money) that customers see in
-- their portal account and in bank-transfer payment instructions.
--
-- Until now bank details lived as hand-edited JSON in payment_gateways.public_config and were only shown right after a
-- customer started a bank-transfer payment. This gives staff a structured, validated place to maintain them, and gives signed-in
-- customers a permanent "How to pay" view. Staff-only table (RLS); customers read through a narrow SECURITY DEFINER function.

CREATE TABLE IF NOT EXISTS public.business_payment_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('bank','mpesa_paybill','mpesa_till','mpesa_send_money','other')),
  label text NOT NULL CHECK (char_length(btrim(label)) BETWEEN 1 AND 80),
  bank_name text CHECK (bank_name IS NULL OR char_length(bank_name) <= 120),
  account_name text CHECK (account_name IS NULL OR char_length(account_name) <= 120),
  account_number text CHECK (account_number IS NULL OR account_number ~ '^[0-9A-Za-z][0-9A-Za-z .\/-]{2,39}$'),
  branch text CHECK (branch IS NULL OR char_length(branch) <= 120),
  swift_code text CHECK (swift_code IS NULL OR swift_code ~ '^[A-Za-z0-9]{8}([A-Za-z0-9]{3})?$'),
  paybill_number text CHECK (paybill_number IS NULL OR paybill_number ~ '^[0-9]{5,7}$'),
  till_number text CHECK (till_number IS NULL OR till_number ~ '^[0-9]{5,7}$'),
  phone_number text CHECK (phone_number IS NULL OR phone_number ~ '^\+?[0-9][0-9 ]{7,14}$'),
  reference_hint text CHECK (reference_hint IS NULL OR char_length(reference_hint) <= 200),
  instructions text CHECK (instructions IS NULL OR char_length(instructions) <= 1000),
  display_order integer NOT NULL DEFAULT 100 CHECK (display_order BETWEEN 0 AND 10000),
  is_active boolean NOT NULL DEFAULT true,
  show_to_customers boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_payment_accounts_required_fields CHECK (
    (kind = 'bank' AND bank_name IS NOT NULL AND account_name IS NOT NULL AND account_number IS NOT NULL)
    OR (kind = 'mpesa_paybill' AND paybill_number IS NOT NULL)
    OR (kind = 'mpesa_till' AND till_number IS NOT NULL)
    OR (kind = 'mpesa_send_money' AND phone_number IS NOT NULL)
    OR kind = 'other'
  )
);

CREATE INDEX IF NOT EXISTS business_payment_accounts_visible_idx
  ON public.business_payment_accounts (display_order, created_at) WHERE is_active AND show_to_customers;

ALTER TABLE public.business_payment_accounts ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_business_payment_accounts_updated_at ON public.business_payment_accounts;
CREATE TRIGGER trg_business_payment_accounts_updated_at BEFORE UPDATE ON public.business_payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Every change to where customers are told to send money is audited.
DROP TRIGGER IF EXISTS trg_topline_audit_business_payment_accounts ON public.business_payment_accounts;
CREATE TRIGGER trg_topline_audit_business_payment_accounts AFTER INSERT OR UPDATE OR DELETE ON public.business_payment_accounts
  FOR EACH ROW EXECUTE FUNCTION private.audit_log_change();

DROP POLICY IF EXISTS rbac_business_payment_accounts_select ON public.business_payment_accounts;
DROP POLICY IF EXISTS rbac_business_payment_accounts_insert ON public.business_payment_accounts;
DROP POLICY IF EXISTS rbac_business_payment_accounts_update ON public.business_payment_accounts;
DROP POLICY IF EXISTS rbac_business_payment_accounts_delete ON public.business_payment_accounts;
CREATE POLICY rbac_business_payment_accounts_select ON public.business_payment_accounts
  FOR SELECT TO authenticated USING (private.current_user_has_permission('settings','select'));
CREATE POLICY rbac_business_payment_accounts_insert ON public.business_payment_accounts
  FOR INSERT TO authenticated WITH CHECK (private.current_user_has_permission('settings','insert'));
CREATE POLICY rbac_business_payment_accounts_update ON public.business_payment_accounts
  FOR UPDATE TO authenticated USING (private.current_user_has_permission('settings','update'))
  WITH CHECK (private.current_user_has_permission('settings','update'));
CREATE POLICY rbac_business_payment_accounts_delete ON public.business_payment_accounts
  FOR DELETE TO authenticated USING (private.current_user_has_permission('settings','delete'));

REVOKE ALL ON public.business_payment_accounts FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_payment_accounts TO authenticated;
GRANT ALL ON public.business_payment_accounts TO service_role;

-- Customers (signed in, with portal access) see only active accounts staff chose to share.
CREATE OR REPLACE FUNCTION public.get_customer_payment_accounts()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF public.get_current_customer_id() IS NULL THEN
    RAISE EXCEPTION 'Customer portal access is not available for this account';
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', a.id, 'kind', a.kind, 'label', a.label, 'bank_name', a.bank_name, 'account_name', a.account_name,
      'account_number', a.account_number, 'branch', a.branch, 'swift_code', a.swift_code,
      'paybill_number', a.paybill_number, 'till_number', a.till_number, 'phone_number', a.phone_number,
      'reference_hint', a.reference_hint, 'instructions', a.instructions
    ) ORDER BY a.display_order, a.created_at)
    FROM public.business_payment_accounts a
    WHERE a.is_active AND a.show_to_customers
  ), '[]'::jsonb);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_customer_payment_accounts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_customer_payment_accounts() TO authenticated;
