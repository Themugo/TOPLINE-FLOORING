-- Remove residual non-data privileges from the customer communication ledger.
REVOKE REFERENCES, TRIGGER, TRUNCATE ON TABLE public.customer_communications FROM authenticated;
