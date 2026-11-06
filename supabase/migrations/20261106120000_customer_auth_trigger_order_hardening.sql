-- Ensure customer profile creation runs before portal identity binding when Auth
-- confirms an email during INSERT (for example, projects with email confirmation disabled).
-- PostgreSQL fires same-event triggers alphabetically by trigger name. The previous
-- `on_auth_user_customer_portal` sorted before `on_auth_user_customer_registration`,
-- so an auto-confirmed signup could be checked for a customer link before its customer
-- row had been created. Rename the portal trigger so registration always runs first.
DROP TRIGGER IF EXISTS on_auth_user_customer_portal ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_z_customer_portal ON auth.users;

CREATE TRIGGER on_auth_user_z_customer_portal
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.link_customer_portal_user();

COMMENT ON TRIGGER on_auth_user_z_customer_portal ON auth.users IS
  'Runs after on_auth_user_customer_registration on INSERT so auto-confirmed customer registrations can be linked immediately; also links verified identities when email_confirmed_at changes.';
