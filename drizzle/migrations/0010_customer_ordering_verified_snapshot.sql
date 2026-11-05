CREATE SCHEMA IF NOT EXISTS backup_customer_20261105;
REVOKE ALL ON SCHEMA backup_customer_20261105 FROM PUBLIC, anon, authenticated;
DO $snapshot$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['products','categories','invoices','invoice_items','customers','payments','due_transactions','customer_deposits','loyalty_transactions','expenses','expense_categories','staff','salary_payments','pos_sessions','admin_audit_log','app_users','role_permissions','system_settings','site_content','restaurants','restaurant_members'] LOOP
    EXECUTE format('CREATE TABLE backup_customer_20261105.%I AS TABLE public.%I', t, t);
    EXECUTE format('REVOKE ALL ON backup_customer_20261105.%I FROM PUBLIC, anon, authenticated', t);
  END LOOP;
END $snapshot$;
CREATE TABLE backup_customer_20261105.policies AS SELECT * FROM pg_policies WHERE schemaname = 'public';
CREATE TABLE backup_customer_20261105.grants AS SELECT * FROM information_schema.role_table_grants WHERE table_schema='public';
CREATE TABLE backup_customer_20261105.functions AS SELECT n.nspname, p.proname, pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f';
REVOKE ALL ON ALL TABLES IN SCHEMA backup_customer_20261105 FROM PUBLIC, anon, authenticated;