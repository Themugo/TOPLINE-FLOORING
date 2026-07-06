/*
# Order number generator function

Adds a `next_order_number()` SQL function used by the storefront checkout to
generate human-readable, sequential order numbers in the format
`TOPLINE-YYYY-NNNN` (e.g. TOPLINE-2026-0001).

## How it works
- Looks at the highest numeric suffix used in the current year.
- Increments by 1 and zero-pads to 4 digits.
- Uses the current year from `now()`.
- Safe to call concurrently: the uniqueness constraint on `orders.order_number`
  protects against rare collisions; the caller retries if needed.

## Notes
- SECURITY DEFINER so the anon role can call it via the Supabase RPC endpoint.
- Granted to `anon` and `authenticated`.
- Read-only with respect to existing rows (uses MAX aggregation, no writes).
*/

CREATE OR REPLACE FUNCTION next_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_year int;
  max_seq int;
  next_seq int;
  result text;
BEGIN
  current_year := extract(year from now())::int;

  SELECT COALESCE(MAX(seq), 0) INTO max_seq
  FROM (
    SELECT substring(order_number from 'TOPLINE-[0-9]{4}-([0-9]{4})')::int AS seq
    FROM orders
    WHERE order_number LIKE 'TOPLINE-' || current_year || '-%'
      AND order_number ~ 'TOPLINE-[0-9]{4}-[0-9]{4}'
  ) s;

  next_seq := max_seq + 1;
  result := 'TOPLINE-' || current_year || '-' || lpad(next_seq::text, 4, '0');

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION next_order_number() TO anon, authenticated;
