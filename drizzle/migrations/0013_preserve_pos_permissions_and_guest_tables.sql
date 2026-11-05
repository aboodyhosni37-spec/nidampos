DO $repair$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['invoices','invoice_items','payments','customers','due_transactions','customer_deposits','loyalty_transactions','expenses','expense_categories','staff','salary_payments','pos_sessions'] LOOP
  EXECUTE format('DROP POLICY tenant_delete ON public.%I',t);
  EXECUTE format('CREATE POLICY tenant_delete ON public.%I FOR DELETE TO authenticated USING(public.pos_has_permission(restaurant_id,%L))',t,CASE WHEN t IN ('invoices','customers') THEN 'manage_users' WHEN t IN ('expenses','expense_categories') THEN 'manage_expenses' WHEN t IN ('staff','salary_payments') THEN 'manage_staff' WHEN t='customer_deposits' THEN 'manage_deposits' ELSE 'place_order' END);
 END LOOP;
END $repair$;
CREATE POLICY restaurant_admin_roles ON public.role_permissions FOR ALL TO authenticated USING(public.pos_has_permission('7f85d056-9247-4ef2-bba0-70ee79addb7b'::uuid,'manage_users')) WITH CHECK(public.pos_has_permission('7f85d056-9247-4ef2-bba0-70ee79addb7b'::uuid,'manage_users'));
CREATE OR REPLACE FUNCTION public.assign_created_staff_member() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE rid uuid;
BEGIN
 rid:=public.current_pos_restaurant();
 IF rid IS NOT NULL AND public.pos_has_permission(rid,'manage_users') THEN INSERT INTO public.restaurant_members(restaurant_id,app_user_id) VALUES(rid,NEW.id); END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER assign_created_staff_member AFTER INSERT ON public.app_users FOR EACH ROW EXECUTE FUNCTION public.assign_created_staff_member();
CREATE OR REPLACE FUNCTION public.customer_delivery_fee(order_type text,district text) RETURNS numeric LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
BEGIN
 IF order_type IN ('PICKUP','DINE-IN') THEN RETURN 0; END IF;
 IF order_type IS DISTINCT FROM 'DELIVERY' OR district IS NULL OR district NOT IN ('Xamar Weyne','Shangani','Xamar Jajab','Waberi','Abdulaziz','Bondhere','Daynile','Dharkenley','Hawl Wadag','Hodan','Karan','Shibis','Wadajir','Wardhigley','Yaqshid','Gubadley','Darusalam','Kaxda') THEN RAISE EXCEPTION 'Select a valid Banadir district'; END IF;
 RETURN CASE WHEN district IN ('Xamar Weyne','Shangani','Xamar Jajab','Waberi') THEN 1.00 ELSE 1.50 END;
END $$;
CREATE OR REPLACE FUNCTION public.validate_customer_table(payload jsonb) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE normalized jsonb:=payload;
BEGIN
 IF payload->>'order_type'='DINE-IN' THEN
  IF payload->>'table_label' !~ '^T([1-9]|1[0-2])$' OR payload->>'table_label' IS NULL THEN RAISE EXCEPTION 'Select a valid table'; END IF;
  normalized:=jsonb_set(payload,'{table_label}',to_jsonb('Table '||substring(payload->>'table_label' from 2)));
 END IF;
 RETURN normalized;
END $$;
REVOKE ALL ON FUNCTION public.validate_customer_table(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_customer_table(jsonb) TO service_role;