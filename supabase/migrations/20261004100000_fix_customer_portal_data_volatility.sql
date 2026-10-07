-- get_customer_portal_data() records the customer's last login with an UPDATE but was declared
-- STABLE. PostgreSQL rejects writes inside a STABLE function at call time ("UPDATE is not allowed
-- in a non-volatile function"), so every call failed. Declare it VOLATILE, which is what it is.
-- Only privileges, body and search_path are otherwise unchanged.
ALTER FUNCTION public.get_customer_portal_data() VOLATILE;
