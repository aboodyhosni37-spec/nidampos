CREATE SCHEMA IF NOT EXISTS backup_20261007;
REVOKE ALL ON SCHEMA backup_20261007 FROM anon, authenticated;
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('CREATE TABLE IF NOT EXISTS backup_20261007.%I AS TABLE public.%I', t, t);
  END LOOP;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['products','categories','invoices','invoice_items','payments','customers','due_transactions','customer_deposits','loyalty_transactions','expenses','expense_categories','staff','salary_payments','pos_sessions','admin_audit_log'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS restaurant_id uuid DEFAULT ''7f85d056-9247-4ef2-bba0-70ee79addb7b''::uuid REFERENCES public.restaurants(id)', t);
    EXECUTE format('UPDATE public.%I SET restaurant_id = ''7f85d056-9247-4ef2-bba0-70ee79addb7b''::uuid WHERE restaurant_id IS NULL', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(restaurant_id)', t || '_restaurant_idx', t);
  END LOOP;
END $$;