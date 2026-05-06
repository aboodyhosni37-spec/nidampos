
-- Staff register
CREATE TABLE IF NOT EXISTS public.staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default 'Staff',
  photo_url text,
  salary_amount numeric not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read staff" ON public.staff FOR SELECT USING (true);
CREATE POLICY "public insert staff" ON public.staff FOR INSERT WITH CHECK (true);
CREATE POLICY "public update staff" ON public.staff FOR UPDATE USING (true);
CREATE POLICY "public delete staff" ON public.staff FOR DELETE USING (true);
CREATE TRIGGER trg_staff_updated BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Salary payments
CREATE TABLE IF NOT EXISTS public.salary_payments (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff(id) on delete cascade,
  amount numeric not null default 0,
  method text not null default 'Cash',
  note text,
  paid_on date not null default current_date,
  created_at timestamptz not null default now()
);
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read salary_payments" ON public.salary_payments FOR SELECT USING (true);
CREATE POLICY "public insert salary_payments" ON public.salary_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "public update salary_payments" ON public.salary_payments FOR UPDATE USING (true);
CREATE POLICY "public delete salary_payments" ON public.salary_payments FOR DELETE USING (true);
CREATE INDEX IF NOT EXISTS idx_salary_payments_staff ON public.salary_payments(staff_id);

-- Storage bucket for staff photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('staff-photos', 'staff-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read staff photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'staff-photos');
CREATE POLICY "Public upload staff photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'staff-photos');
CREATE POLICY "Public update staff photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'staff-photos');
CREATE POLICY "Public delete staff photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'staff-photos');

-- Seed default expense categories
INSERT INTO public.expense_categories (name)
SELECT n FROM (VALUES ('Salary'),('Rent'),('Utilities'),('Other')) AS v(n)
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE lower(name) = lower(v.n));
