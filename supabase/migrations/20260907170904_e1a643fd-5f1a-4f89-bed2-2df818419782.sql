CREATE TABLE public.site_content (
  id text NOT NULL DEFAULT 'default' PRIMARY KEY,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_content TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_content TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read site_content" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "public insert site_content" ON public.site_content FOR INSERT WITH CHECK (true);
CREATE POLICY "public update site_content" ON public.site_content FOR UPDATE USING (true);
CREATE POLICY "public delete site_content" ON public.site_content FOR DELETE USING (true);

CREATE TRIGGER trg_site_content_updated
BEFORE UPDATE ON public.site_content
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.site_content (id, content) VALUES ('default', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;