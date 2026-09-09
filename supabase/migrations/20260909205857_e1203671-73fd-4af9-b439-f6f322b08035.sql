ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS show_on_web boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_in_pos boolean NOT NULL DEFAULT true;