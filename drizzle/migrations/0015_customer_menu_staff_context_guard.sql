DROP POLICY customer_menu ON public.products;
CREATE POLICY customer_menu ON public.products FOR SELECT TO anon,authenticated USING(restaurant_id='7f85d056-9247-4ef2-bba0-70ee79addb7b'::uuid AND is_active AND show_on_web AND coalesce(auth.jwt()->'app_metadata'->>'pos','false')!='true');
DROP POLICY customer_menu ON public.categories;
CREATE POLICY customer_menu ON public.categories FOR SELECT TO anon,authenticated USING(restaurant_id='7f85d056-9247-4ef2-bba0-70ee79addb7b'::uuid AND coalesce(auth.jwt()->'app_metadata'->>'pos','false')!='true');
COMMENT ON POLICY customer_menu ON public.products IS 'Guests see only LamaHamar website products; signed-in POS staff use their validated restaurant policy instead.';