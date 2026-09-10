ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS loyalty_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS loyalty_threshold numeric NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS loyalty_reward text NOT NULL DEFAULT 'half_off';

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS rewards_claimed integer NOT NULL DEFAULT 0;