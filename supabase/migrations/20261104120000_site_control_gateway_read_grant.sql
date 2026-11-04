-- Site Control could not load ("Unable to load site control plane"): payment_gateway_methods had its RLS policies
-- for staff but the table-level SELECT was revoked from authenticated, so every staff read failed with
-- "permission denied". Restore read access; the staff_select policy still limits rows to staff with settings:select.
-- Writes stay revoked (they go through save_payment_gateway_control_360).
GRANT SELECT ON TABLE public.payment_gateway_methods TO authenticated;
