CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  restaurant text NOT NULL DEFAULT 'LamaHamar Cafe',
  invoice_id uuid,
  old_number bigint,
  new_number bigint,
  reason text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  performed_by_id uuid,
  performed_by_name text,
  performed_by_role text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_audit_log TO anon, authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read audit" ON public.admin_audit_log FOR SELECT USING (true);
CREATE POLICY "public insert audit" ON public.admin_audit_log FOR INSERT WITH CHECK (true);