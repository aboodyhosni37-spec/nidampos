CREATE OR REPLACE FUNCTION public.customer_meal_available(config jsonb, pid uuid, cid uuid, at_time timestamptz DEFAULT now()) RETURNS boolean LANGUAGE plpgsql STABLE SET search_path=public AS $$
DECLARE period jsonb; assigned boolean:=false; start_min integer; end_min integer; local_min integer;
BEGIN
 local_min:=extract(hour FROM at_time AT TIME ZONE 'Africa/Mogadishu')::integer*60+extract(minute FROM at_time AT TIME ZONE 'Africa/Mogadishu')::integer;
 FOR period IN SELECT value FROM jsonb_array_elements(coalesce(config->'periods','[]'::jsonb)) LOOP
  IF coalesce(period->'product_ids','[]'::jsonb) ? pid::text OR (cid IS NOT NULL AND coalesce(period->'category_ids','[]'::jsonb) ? cid::text) THEN
   assigned:=true;
   IF period->>'enabled'='true' AND period->>'start' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND period->>'end' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN
    start_min:=substring(period->>'start',1,2)::integer*60+substring(period->>'start',4,2)::integer;
    end_min:=substring(period->>'end',1,2)::integer*60+substring(period->>'end',4,2)::integer;
    IF (start_min<end_min AND local_min>=start_min AND local_min<end_min) OR (start_min>end_min AND (local_min>=start_min OR local_min<end_min)) THEN RETURN true; END IF;
   END IF;
  END IF;
 END LOOP;
 RETURN NOT assigned;
END $$;
REVOKE ALL ON FUNCTION public.customer_meal_available(jsonb,uuid,uuid,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.customer_meal_available(jsonb,uuid,uuid,timestamptz) TO service_role;
CREATE OR REPLACE FUNCTION public.validate_website_meal_schedule() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE config jsonb; period jsonb; seen text[]:='{}'; field text;
BEGIN
 config:=NEW.content->'meals';
 IF config IS NULL THEN RETURN NEW; END IF;
 IF jsonb_typeof(config)!='object' OR jsonb_typeof(config->'periods') IS DISTINCT FROM 'array' OR jsonb_array_length(config->'periods')!=3 THEN RAISE EXCEPTION 'Provide breakfast, lunch and dinner schedules'; END IF;
 FOR period IN SELECT value FROM jsonb_array_elements(config->'periods') LOOP
  IF period->>'id' IS NULL OR period->>'id' NOT IN ('breakfast','lunch','dinner') OR period->>'id'=ANY(seen) THEN RAISE EXCEPTION 'Invalid or duplicate meal period'; END IF;
  seen:=array_append(seen,period->>'id');
  IF jsonb_typeof(period->'enabled') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Meal enabled must be on or off'; END IF;
  IF period->>'enabled'='true' OR coalesce(period->>'start','')!='' OR coalesce(period->>'end','')!='' THEN
   IF coalesce(period->>'start','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR coalesce(period->>'end','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR period->>'start'=period->>'end' THEN RAISE EXCEPTION 'Provide valid, different opening and closing times'; END IF;
  END IF;
  FOREACH field IN ARRAY ARRAY['product_ids','category_ids'] LOOP
   IF jsonb_typeof(period->field) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Meal assignments must be lists'; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(period->field) x WHERE jsonb_typeof(x)!='string' OR (x#>>'{}') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') THEN RAISE EXCEPTION 'Invalid meal assignment'; END IF;
   IF field='product_ids' AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(period->field) x WHERE NOT EXISTS(SELECT 1 FROM public.products p WHERE p.id::text=x AND p.restaurant_id='7f85d056-9247-4ef2-bba0-70ee79addb7b')) THEN RAISE EXCEPTION 'Meal products must belong to this restaurant'; END IF;
   IF field='category_ids' AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(period->field) x WHERE NOT EXISTS(SELECT 1 FROM public.categories c WHERE c.id::text=x AND c.restaurant_id='7f85d056-9247-4ef2-bba0-70ee79addb7b')) THEN RAISE EXCEPTION 'Meal categories must belong to this restaurant'; END IF;
  END LOOP;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_website_meals BEFORE INSERT OR UPDATE OF content ON public.site_content FOR EACH ROW EXECUTE FUNCTION public.validate_website_meal_schedule();
DO $patch$
DECLARE definition text; modified text;
BEGIN
 SELECT pg_get_functiondef('public.submit_customer_order(jsonb)'::regprocedure) INTO definition;
 modified:=replace(definition,'saved_lines jsonb:', 'meal_config jsonb; saved_lines jsonb:');
 modified:=replace(modified,'fee:=public.customer_delivery_fee(otype,district);', 'SELECT content->''meals'' INTO meal_config FROM public.site_content WHERE id=''default'' FOR SHARE; IF NOT FOUND THEN RAISE EXCEPTION ''Online ordering settings are unavailable''; END IF; fee:=public.customer_delivery_fee(otype,district);');
 modified:=replace(modified,'sub:=sub+p.price*qty;', 'IF NOT public.customer_meal_available(meal_config,p.id,p.category_id,clock_timestamp()) THEN RAISE EXCEPTION ''% is unavailable at this meal time. Check the menu for the next opening.'',p.name; END IF; sub:=sub+p.price*qty;');
 IF modified=definition OR position('meal_config jsonb' IN modified)=0 OR position('FOR SHARE; IF NOT FOUND THEN RAISE EXCEPTION' IN modified)=0 OR position('public.customer_meal_available(meal_config' IN modified)=0 THEN RAISE EXCEPTION 'Checkout definition did not match expected validation points'; END IF;
 EXECUTE modified;
END $patch$;
COMMENT ON FUNCTION public.customer_meal_available(jsonb,uuid,uuid,timestamptz) IS 'Customer-only configurable meal windows in Africa/Mogadishu; unassigned products unrestricted; opening inclusive, closing exclusive; overnight supported.';