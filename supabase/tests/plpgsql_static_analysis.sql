-- Static analysis of every PL/pgSQL function in public/private using plpgsql_check.
-- It finds errors that only surface when a function is called: unknown columns or functions,
-- bad record fields, wrong argument types. A plain `CREATE FUNCTION` does not catch them.
-- Run by `supabase test db --local` or: psql -v ON_ERROR_STOP=1 -f supabase/tests/plpgsql_static_analysis.sql
-- Emits TAP lines directly instead of calling pgTAP helpers: once plpgsql_check has analysed a
-- function, later PL/pgSQL calls in the same session fail with "pldbgapi2 statement call stack is broken".
BEGIN;

SELECT '1..1';

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'plpgsql_check') THEN
    CREATE EXTENSION IF NOT EXISTS plpgsql_check;
  END IF;
END $do$;

-- Analysis runs in its own statement (plpgsql_check and pgTAP's PL/pgSQL helpers cannot share one).
CREATE TEMP TABLE plpgsql_findings ON COMMIT DROP AS
SELECT fn, message FROM (
  SELECT NULL::text AS fn, NULL::text AS message WHERE false
) empty;

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'plpgsql_check') THEN
    INSERT INTO plpgsql_findings
    SELECT p.oid::regprocedure::text, c.message
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname IN ('public', 'private')
    JOIN pg_language l ON l.oid = p.prolang AND l.lanname = 'plpgsql'
    CROSS JOIN LATERAL plpgsql_check_function_tb(p.oid, fatal_errors => false, other_warnings => false,
                                                  performance_warnings => false, extra_warnings => false) c
    WHERE p.prokind = 'f' AND p.prorettype <> 'trigger'::regtype AND c.level = 'error';

    -- trigger functions, checked against every table they are attached to
    INSERT INTO plpgsql_findings
    SELECT p.oid::regprocedure::text || ' on ' || t.tgrelid::regclass::text, c.message
    FROM pg_trigger t
    JOIN pg_proc p ON p.oid = t.tgfoid
    JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname IN ('public', 'private')
    CROSS JOIN LATERAL plpgsql_check_function_tb(p.oid, t.tgrelid, fatal_errors => false, other_warnings => false,
                                                  performance_warnings => false, extra_warnings => false) c
    WHERE NOT t.tgisinternal AND c.level = 'error';
  END IF;
END $do$;

-- emit_customer_journey_event() reads NEW.email only in its `quotations` branch; the analyzer cannot
-- know the branch is unreachable for orders, projects and invoices.
DELETE FROM plpgsql_findings
WHERE fn LIKE 'emit_customer_journey_event() on %' AND fn NOT LIKE '% on quotations'
  AND message = 'record "new" has no field "email"';

SELECT CASE
  WHEN NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'plpgsql_check')
    THEN 'ok 1 - # SKIP plpgsql_check extension is not available in this database'
  WHEN (SELECT count(*) FROM plpgsql_findings) = 0
    THEN 'ok 1 - PL/pgSQL functions have no call-time errors (unknown columns, functions or record fields)'
  ELSE 'not ok 1 - PL/pgSQL functions have call-time errors'
END;

-- Diagnostics for any failure, as TAP comments.
SELECT '# ' || fn || ': ' || message FROM plpgsql_findings ORDER BY fn, message;

ROLLBACK;
