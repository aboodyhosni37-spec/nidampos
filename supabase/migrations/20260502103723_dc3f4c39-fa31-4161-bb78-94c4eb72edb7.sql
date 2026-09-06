-- 1) System settings (single-row keyed table)
CREATE TABLE IF NOT EXISTS public.system_settings (
  id text PRIMARY KEY DEFAULT 'default',
  currency_code text NOT NULL DEFAULT 'USD',
  currency_symbol text NOT NULL DEFAULT '$',
  tax_enabled boolean NOT NULL DEFAULT false,
  tax_rate numeric NOT NULL DEFAULT 0,
  tax_inclusive boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read system_settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "public insert system_settings" ON public.system_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "public update system_settings" ON public.system_settings FOR UPDATE USING (true);
CREATE POLICY "public delete system_settings" ON public.system_settings FOR DELETE USING (true);

INSERT INTO public.system_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- 2) Loyalty fields on customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS total_spent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reward_status text NOT NULL DEFAULT 'none';
-- reward_status values used by the app: 'none' | 'half_off' | 'free_lunch'
