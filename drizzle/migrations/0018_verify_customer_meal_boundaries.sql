DO $$
DECLARE c jsonb := '{"periods":[{"id":"breakfast","enabled":true,"start":"06:00","end":"10:00","product_ids":["00000000-0000-0000-0000-000000000001"],"category_ids":[]}]}'; pid uuid:='00000000-0000-0000-0000-000000000001';
BEGIN
 IF public.customer_meal_available(c,pid,null,'2026-11-05T02:59:59Z') THEN RAISE EXCEPTION 'Breakfast opened early'; END IF;
 IF NOT public.customer_meal_available(c,pid,null,'2026-11-05T03:00:00Z') THEN RAISE EXCEPTION 'Breakfast did not open at Mogadishu 06:00'; END IF;
 IF public.customer_meal_available(c,pid,null,'2026-11-05T07:00:00Z') THEN RAISE EXCEPTION 'Breakfast did not close at Mogadishu 10:00'; END IF;
 IF public.customer_meal_available(jsonb_set(c,'{periods,0,enabled}','false'),pid,null,'2026-11-05T04:00:00Z') THEN RAISE EXCEPTION 'Disabled meal was available'; END IF;
 IF NOT public.customer_meal_available(c,'00000000-0000-0000-0000-000000000002',null,'2026-11-05T07:00:00Z') THEN RAISE EXCEPTION 'Unassigned product was blocked'; END IF;
 c:=jsonb_set(jsonb_set(c,'{periods,0,start}','"22:00"'),'{periods,0,end}','"02:00"');
 IF NOT public.customer_meal_available(c,pid,null,'2026-11-05T22:00:00Z') THEN RAISE EXCEPTION 'Overnight dinner unavailable'; END IF;
 IF public.customer_meal_available(c,pid,null,'2026-11-05T23:00:00Z') THEN RAISE EXCEPTION 'Overnight dinner failed to close'; END IF;
 IF position('public.customer_meal_available(meal_config,p.id,p.category_id,clock_timestamp())' IN pg_get_functiondef('public.submit_customer_order(jsonb)'::regprocedure))=0 THEN RAISE EXCEPTION 'Guest checkout guard is missing'; END IF;
 IF has_function_privilege('anon','public.submit_customer_order(jsonb)','execute') OR has_function_privilege('authenticated','public.submit_customer_order(jsonb)','execute') THEN RAISE EXCEPTION 'Guest checkout bypass privilege found'; END IF;
END $$;