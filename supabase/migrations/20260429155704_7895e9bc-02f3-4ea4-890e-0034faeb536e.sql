-- Categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "public write categories" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "public update categories" ON public.categories FOR UPDATE USING (true);
CREATE POLICY "public delete categories" ON public.categories FOR DELETE USING (true);

-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  category_name text NOT NULL,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  image_url text,
  stock integer NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 5,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "public write products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "public update products" ON public.products FOR UPDATE USING (true);
CREATE POLICY "public delete products" ON public.products FOR DELETE USING (true);
CREATE INDEX idx_products_category ON public.products(category_id);

-- Order status workflow on invoices
ALTER TABLE public.invoices
  ADD COLUMN order_status text NOT NULL DEFAULT 'Completed';
-- Backfill existing rows already defaults to 'Completed'
