-- Buyers can pay manually (M-Pesa Till / Paybill / bank) from day one. The staff-managed accounts in
-- Admin > Settings > Bank & payment details are shown on the checkout receipt, the order tracker and the order email.
-- M-Pesa STK push stays off until the Daraja credentials are configured, then it is switched on in Site Control.
UPDATE public.payment_gateway_methods
   SET is_enabled = true,
       display_name = 'Pay manually (M-Pesa Till, Paybill or bank)',
       customer_description = 'Place your order now and pay with M-Pesa or a bank transfer using the details we show you. We confirm payment manually and email you a receipt.'
 WHERE gateway_key = 'bank_transfer';

-- Public read of the accounts staff marked "show to customers", so guests can pay manually without signing in.
-- Only payment destinations (till, paybill, bank account) are returned; nothing about customers or balances.
CREATE OR REPLACE FUNCTION public.get_public_payment_accounts()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', a.id, 'kind', a.kind, 'label', a.label, 'bank_name', a.bank_name, 'account_name', a.account_name,
      'account_number', a.account_number, 'branch', a.branch, 'swift_code', a.swift_code,
      'paybill_number', a.paybill_number, 'till_number', a.till_number, 'phone_number', a.phone_number,
      'reference_hint', a.reference_hint, 'instructions', a.instructions
    ) ORDER BY a.display_order, a.created_at), '[]'::jsonb)
  FROM public.business_payment_accounts a
  WHERE a.is_active AND a.show_to_customers;
$$;
REVOKE ALL ON FUNCTION public.get_public_payment_accounts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_payment_accounts() TO anon, authenticated;
