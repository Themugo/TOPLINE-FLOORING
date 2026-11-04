-- Idempotent safety net: the manual (M-Pesa Till / Paybill / bank) method must be offered at checkout
-- whenever staff have published payment accounts. Re-asserts the row state set in 20261104110000 in case
-- it was switched off or partly configured before that migration ran. Staff can still switch it off in Site Control afterwards.
UPDATE public.payment_gateway_methods
   SET is_enabled = true, customer_visible = true,
       supports_checkout = true, supports_orders = true, supports_invoices = true,
       updated_at = now()
 WHERE gateway_key = 'bank_transfer'
   AND (is_enabled IS DISTINCT FROM true OR customer_visible IS DISTINCT FROM true
        OR supports_checkout IS DISTINCT FROM true OR supports_orders IS DISTINCT FROM true OR supports_invoices IS DISTINCT FROM true);
