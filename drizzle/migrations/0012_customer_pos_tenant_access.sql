CREATE OR REPLACE FUNCTION public.current_pos_restaurant() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT r.id FROM public.restaurants r WHERE r.id::text=(auth.jwt()->'app_metadata'->>'restaurant_id') AND public.pos_restaurant_access(r.id) LIMIT 1 $$;
REVOKE ALL ON FUNCTION public.current_pos_restaurant() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_pos_restaurant() TO authenticated,service_role;
DO $secure$
DECLARE t text; p record;
BEGIN
 FOREACH t IN ARRAY ARRAY['invoices','invoice_items','payments','customers','due_transactions','customer_deposits','loyalty_transactions','expenses','expense_categories','staff','salary_payments','pos_sessions','admin_audit_log'] LOOP
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t); END LOOP;
  EXECUTE format('REVOKE ALL ON public.%I FROM anon',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated',t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY tenant_read ON public.%I FOR SELECT TO authenticated USING(public.pos_restaurant_access(restaurant_id))',t);
  EXECUTE format('CREATE POLICY tenant_insert ON public.%I FOR INSERT TO authenticated WITH CHECK(public.pos_restaurant_access(restaurant_id))',t);
  IF t!='admin_audit_log' THEN
   EXECUTE format('CREATE POLICY tenant_update ON public.%I FOR UPDATE TO authenticated USING(public.pos_restaurant_access(restaurant_id)) WITH CHECK(public.pos_restaurant_access(restaurant_id))',t);
   EXECUTE format('CREATE POLICY tenant_delete ON public.%I FOR DELETE TO authenticated USING(public.pos_has_permission(restaurant_id,''manage_orders''))',t);
  END IF;
  EXECUTE format('ALTER TABLE public.%I ALTER COLUMN restaurant_id SET DEFAULT public.current_pos_restaurant()',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['products','categories'] LOOP
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t); END LOOP;
  EXECUTE format('REVOKE ALL ON public.%I FROM anon',t);
  EXECUTE format('GRANT SELECT ON public.%I TO anon',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated',t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
  EXECUTE format('CREATE POLICY customer_menu ON public.%I FOR SELECT TO anon,authenticated USING(restaurant_id=''7f85d056-9247-4ef2-bba0-70ee79addb7b''::uuid%s)',t,CASE WHEN t='products' THEN ' AND is_active AND show_on_web' ELSE '' END);
  EXECUTE format('CREATE POLICY staff_menu ON public.%I FOR ALL TO authenticated USING(public.pos_restaurant_access(restaurant_id)) WITH CHECK(public.pos_has_permission(restaurant_id,''access_inventory''))',t);
  EXECUTE format('ALTER TABLE public.%I ALTER COLUMN restaurant_id SET DEFAULT public.current_pos_restaurant()',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['app_users','role_permissions','site_content','system_settings'] LOOP
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t); END LOOP;
  EXECUTE format('REVOKE ALL ON public.%I FROM anon',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated',t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
  IF t IN ('site_content','system_settings') THEN
   EXECUTE format('GRANT SELECT ON public.%I TO anon',t);
   EXECUTE format('CREATE POLICY customer_content ON public.%I FOR SELECT TO anon,authenticated USING(id=''default'')',t);
  END IF;
  IF t='app_users' THEN
   EXECUTE 'CREATE POLICY staff_directory ON public.app_users FOR SELECT TO authenticated USING(public.has_role(auth.uid(),''super_admin'') OR EXISTS(SELECT 1 FROM public.restaurant_members m WHERE m.app_user_id=app_users.id AND public.pos_restaurant_access(m.restaurant_id)))';
   EXECUTE 'CREATE POLICY staff_admin ON public.app_users FOR ALL TO authenticated USING(public.has_role(auth.uid(),''super_admin'') OR EXISTS(SELECT 1 FROM public.restaurant_members m WHERE m.app_user_id=app_users.id AND public.pos_has_permission(m.restaurant_id,''manage_users''))) WITH CHECK(public.has_role(auth.uid(),''super_admin'') OR public.pos_has_permission(public.current_pos_restaurant(),''manage_users''))';
  ELSIF t='role_permissions' THEN
   EXECUTE 'CREATE POLICY staff_roles ON public.role_permissions FOR SELECT TO authenticated USING(public.current_pos_restaurant() IS NOT NULL OR public.has_role(auth.uid(),''super_admin''))';
   EXECUTE 'CREATE POLICY platform_role_management ON public.role_permissions FOR ALL TO authenticated USING(public.has_role(auth.uid(),''super_admin'')) WITH CHECK(public.has_role(auth.uid(),''super_admin''))';
  ELSE
   EXECUTE format('CREATE POLICY staff_content_management ON public.%I FOR ALL TO authenticated USING(public.pos_has_permission(''7f85d056-9247-4ef2-bba0-70ee79addb7b''::uuid,%L)) WITH CHECK(public.pos_has_permission(''7f85d056-9247-4ef2-bba0-70ee79addb7b''::uuid,%L))',t,CASE WHEN t='site_content' THEN 'manage_website' ELSE 'access_settings' END,CASE WHEN t='site_content' THEN 'manage_website' ELSE 'access_settings' END);
  END IF;
 END LOOP;
END $secure$;
CREATE POLICY member_self_read ON public.restaurant_members FOR SELECT TO authenticated USING(app_user_id::text=(auth.jwt()->'app_metadata'->>'app_user_id'));
CREATE POLICY pos_restaurant_read ON public.restaurants FOR SELECT TO authenticated USING(public.pos_restaurant_access(id));
REVOKE SELECT ON public.app_users FROM authenticated;
GRANT SELECT(id,name,username,phone,role,is_active,created_at,updated_at) ON public.app_users TO authenticated;
REVOKE EXECUTE ON FUNCTION public.resequence_invoice_numbers() FROM PUBLIC,anon,authenticated;
COMMENT ON FUNCTION public.resequence_invoice_numbers() IS 'Legacy global resequencing is service-only; never expose across tenant boundaries.';