CREATE OR REPLACE FUNCTION public.pos_restaurant_access(rid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS (SELECT 1 FROM public.restaurant_members m JOIN public.app_users u ON u.id=m.app_user_id JOIN public.restaurants r ON r.id=m.restaurant_id
 WHERE m.restaurant_id=rid AND u.is_active AND r.status='active' AND r.subscription_status NOT IN ('cancelled','expired','suspended') AND (r.subscription_ends_at IS NULL OR r.subscription_ends_at>=CURRENT_DATE)
 AND (auth.jwt()->'app_metadata'->>'pos')='true' AND (auth.jwt()->'app_metadata'->>'app_user_id')=u.id::text AND (auth.jwt()->'app_metadata'->>'restaurant_id')=rid::text);
$$;
REVOKE ALL ON FUNCTION public.pos_restaurant_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pos_restaurant_access(uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.pos_has_permission(rid uuid, perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.pos_restaurant_access(rid) AND EXISTS(SELECT 1 FROM public.app_users u LEFT JOIN public.role_permissions p ON p.role=u.role
 WHERE u.id::text=(auth.jwt()->'app_metadata'->>'app_user_id') AND (u.role IN ('admin','owner') OR (p.permissions->>perm)='true'));
$$;
REVOKE ALL ON FUNCTION public.pos_has_permission(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pos_has_permission(uuid,text) TO authenticated,service_role;
CREATE TABLE public.customer_order_tracking (
 invoice_id uuid PRIMARY KEY REFERENCES public.invoices(id) ON DELETE CASCADE,
 restaurant_id uuid NOT NULL REFERENCES public.restaurants(id),
 token_hash text NOT NULL UNIQUE,
 request_hash text NOT NULL,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days',
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.customer_order_tracking TO service_role;
ALTER TABLE public.customer_order_tracking ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.customer_order_tracking IS 'Private order credentials; accessible only by restricted customer RPCs via service role. Never expose token hashes.';
CREATE OR REPLACE FUNCTION public.customer_delivery_fee(order_type text,district text)
RETURNS numeric LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
BEGIN
 IF order_type IN ('PICKUP','DINE-IN') THEN RETURN 0; END IF;
 IF order_type!='DELIVERY' OR district IS NULL OR district NOT IN ('Xamar Weyne','Shangani','Xamar Jajab','Waberi','Abdulaziz','Bondhere','Daynile','Dharkenley','Hawl Wadag','Hodan','Karan','Shibis','Wadajir','Wardhigley','Yaqshid','Gubadley','Darusalam','Kaxda') THEN RAISE EXCEPTION 'Select a valid Banadir district'; END IF;
 RETURN CASE WHEN district IN ('Xamar Weyne','Shangani','Xamar Jajab','Waberi') THEN 1.00 ELSE 1.50 END;
END $$;
CREATE OR REPLACE FUNCTION public.submit_customer_order(payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE
 rid uuid; cref text; tracking text; otype text; cname text; phone text; district text; address text; note text; table_name text;
 line jsonb; pid uuid; qty integer; p public.products%ROWTYPE; s public.system_settings%ROWTYPE; inv public.invoices%ROWTYPE;
 sub numeric:=0; tax numeric:=0; final_total numeric; fee numeric; saved_lines jsonb:='[]'::jsonb; fingerprint text;
BEGIN
 IF auth.role()!='service_role' THEN RAISE EXCEPTION 'Access denied'; END IF;
 cref:=payload->>'client_ref'; tracking:=payload->>'tracking_token'; otype:=payload->>'order_type';
 cname:=btrim(payload->>'customer_name'); phone:=btrim(payload->>'phone'); district:=payload->>'district'; address:=btrim(payload->>'address'); note:=payload->>'notes'; table_name:=payload->>'table_label';
 IF cref IS NULL OR length(cref)<20 OR length(cref)>80 OR tracking IS NULL OR length(tracking)<40 OR length(tracking)>128 THEN RAISE EXCEPTION 'Invalid checkout reference'; END IF;
 IF cname IS NULL OR length(cname)<1 OR length(cname)>120 OR phone IS NULL OR phone !~ '^\+?[0-9 ()-]{7,25}$' THEN RAISE EXCEPTION 'Enter a valid name and phone number'; END IF;
 IF otype NOT IN ('DELIVERY','PICKUP','DINE-IN') OR otype IS NULL THEN RAISE EXCEPTION 'Invalid order type'; END IF;
 IF otype='DELIVERY' AND (address IS NULL OR length(address)<3 OR length(address)>500) THEN RAISE EXCEPTION 'Enter your delivery address'; END IF;
 IF length(coalesce(note,''))>1000 THEN RAISE EXCEPTION 'Order notes are too long'; END IF;
 IF otype='DINE-IN' AND (table_name IS NULL OR table_name NOT IN ('Table 1','Table 2','Table 3','Table 4','Table 5','Table 6','Table 7','Table 8','Table 9','Table 10','Table 11','Table 12')) THEN RAISE EXCEPTION 'Select a valid table'; END IF;
 SELECT id INTO rid FROM public.restaurants WHERE restaurant_code='lamahamar-cafe' AND status='active' AND subscription_status NOT IN ('cancelled','expired','suspended') AND (subscription_ends_at IS NULL OR subscription_ends_at>=CURRENT_DATE);
 IF rid IS NULL THEN RAISE EXCEPTION 'Online ordering is currently unavailable'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('guest:'||rid::text||':'||cref,0));
 fingerprint:=encode(digest((payload-'tracking_token')::text,'sha256'),'hex');
 SELECT * INTO inv FROM public.invoices WHERE client_ref=cref AND restaurant_id=rid;
 IF FOUND THEN
  IF NOT EXISTS(SELECT 1 FROM public.customer_order_tracking WHERE invoice_id=inv.id AND token_hash=encode(digest(tracking,'sha256'),'hex') AND request_hash=fingerprint) THEN RAISE EXCEPTION 'Checkout reference cannot be reused'; END IF;
  RETURN jsonb_build_object('id',inv.id,'number',inv.number,'total',inv.total,'duplicate',true);
 END IF;
 IF jsonb_typeof(payload->'items') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Choose cart items'; END IF;
 IF jsonb_array_length(payload->'items') NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Choose between 1 and 100 items'; END IF;
 IF (SELECT count(*) FROM jsonb_array_elements(payload->'items'))!=(SELECT count(DISTINCT x->>'product_id') FROM jsonb_array_elements(payload->'items') x) THEN RAISE EXCEPTION 'Duplicate cart items'; END IF;
 SELECT * INTO s FROM public.system_settings WHERE id='default';
 IF NOT FOUND THEN RAISE EXCEPTION 'Restaurant settings are unavailable'; END IF;
 IF otype='DELIVERY' AND NOT s.delivery_enabled THEN RAISE EXCEPTION 'Delivery is currently unavailable'; END IF;
 fee:=public.customer_delivery_fee(otype,district);
 FOR line IN SELECT * FROM jsonb_array_elements(payload->'items') LOOP
  pid:=(line->>'product_id')::uuid;
  IF pid IS NULL OR (line->>'qty') IS NULL OR (line->>'qty') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'Invalid item or quantity'; END IF;
  qty:=(line->>'qty')::integer;
  IF qty NOT BETWEEN 1 AND 99 THEN RAISE EXCEPTION 'Quantity must be between 1 and 99'; END IF;
  SELECT * INTO p FROM public.products WHERE id=pid AND restaurant_id=rid AND is_active AND show_on_web FOR SHARE;
  IF NOT FOUND OR p.price<0 THEN RAISE EXCEPTION 'An item is no longer available'; END IF;
  sub:=sub+p.price*qty;
  saved_lines:=saved_lines||jsonb_build_array(jsonb_build_object('product_id',pid,'name',p.name,'price',p.price,'qty',qty));
 END LOOP;
 sub:=round(sub,2); final_total:=sub;
 IF s.tax_enabled AND s.tax_rate>0 THEN
  IF s.tax_inclusive THEN tax:=round(sub-sub/(1+s.tax_rate/100),2); ELSE tax:=round(sub*s.tax_rate/100,2); final_total:=sub+tax; END IF;
 END IF;
 final_total:=round(final_total+fee,2);
 INSERT INTO public.invoices(restaurant_id,client_ref,customer_name,customer_phone,customer_address,notes,order_type,table_label,delivery_fee,subtotal,total,paid_amount,due_amount,payment_method,status,order_status,source)
 VALUES(rid,cref,cname,phone,CASE WHEN otype='DELIVERY' THEN district||' — '||address ELSE NULL END,note,otype,CASE WHEN otype='DELIVERY' THEN 'Delivery' WHEN otype='PICKUP' THEN 'Pickup' ELSE table_name END,fee,sub,final_total,0,final_total,'Due','completed','Pending','online') RETURNING * INTO inv;
 INSERT INTO public.invoice_items(restaurant_id,invoice_id,product_id,name,price,qty) SELECT rid,inv.id,x->>'product_id',x->>'name',(x->>'price')::numeric,(x->>'qty')::integer FROM jsonb_array_elements(saved_lines) x;
 INSERT INTO public.payments(restaurant_id,invoice_id,method,amount,reference) VALUES(rid,inv.id,'Due',final_total,'Online order '||cref);
 INSERT INTO public.customer_order_tracking(invoice_id,restaurant_id,token_hash,request_hash) VALUES(inv.id,rid,encode(digest(tracking,'sha256'),'hex'),fingerprint);
 RETURN jsonb_build_object('id',inv.id,'number',inv.number,'total',inv.total,'duplicate',false);
END $$;
REVOKE ALL ON FUNCTION public.submit_customer_order(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_customer_order(jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.get_customer_order(tracking_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE result jsonb;
BEGIN
 IF auth.role()!='service_role' OR length(tracking_token)<40 OR length(tracking_token)>128 THEN RAISE EXCEPTION 'Order not found'; END IF;
 SELECT jsonb_build_object('number',i.number,'total',i.total,'subtotal',i.subtotal,'delivery_fee',i.delivery_fee,'paid_amount',i.paid_amount,'due_amount',i.due_amount,'order_type',i.order_type,'order_status',i.order_status,'created_at',i.created_at,'items',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',x.name,'price',x.price,'qty',x.qty)),'[]'::jsonb) FROM public.invoice_items x WHERE x.invoice_id=i.id AND x.restaurant_id=i.restaurant_id)) INTO result
 FROM public.customer_order_tracking t JOIN public.invoices i ON i.id=t.invoice_id AND i.restaurant_id=t.restaurant_id WHERE t.token_hash=encode(digest(tracking_token,'sha256'),'hex') AND t.expires_at>now();
 IF result IS NULL THEN RAISE EXCEPTION 'Order not found or tracking link expired'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_customer_order(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_order(text) TO service_role;