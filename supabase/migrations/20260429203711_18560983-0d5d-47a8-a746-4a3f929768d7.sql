
-- App users (cashier/admin/custom). Note: this app uses public RLS without Supabase auth (demo POS).
CREATE TABLE public.app_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE,
  phone TEXT UNIQUE,
  pin TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'cashier',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read app_users" ON public.app_users FOR SELECT USING (true);
CREATE POLICY "public insert app_users" ON public.app_users FOR INSERT WITH CHECK (true);
CREATE POLICY "public update app_users" ON public.app_users FOR UPDATE USING (true);
CREATE POLICY "public delete app_users" ON public.app_users FOR DELETE USING (true);

-- Role permission map. Each row: a role with a JSON of permission flags.
CREATE TABLE public.role_permissions (
  role TEXT PRIMARY KEY,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read role_permissions" ON public.role_permissions FOR SELECT USING (true);
CREATE POLICY "public insert role_permissions" ON public.role_permissions FOR INSERT WITH CHECK (true);
CREATE POLICY "public update role_permissions" ON public.role_permissions FOR UPDATE USING (true);
CREATE POLICY "public delete role_permissions" ON public.role_permissions FOR DELETE USING (true);

-- Seed default roles
INSERT INTO public.role_permissions (role, permissions, is_system) VALUES
('admin', '{
  "access_pos": true, "place_order": true, "access_due": true,
  "access_expenses": true, "manage_expenses": true, "view_reports": true,
  "manage_products": true, "manage_categories": true, "manage_users": true,
  "access_settings": true, "access_orders": true, "access_customers": true,
  "access_inventory": true
}'::jsonb, true),
('cashier', '{
  "access_pos": true, "place_order": true, "access_due": true,
  "access_expenses": false, "manage_expenses": false, "view_reports": false,
  "manage_products": false, "manage_categories": false, "manage_users": false,
  "access_settings": false, "access_orders": true, "access_customers": true,
  "access_inventory": false
}'::jsonb, true);

-- Seed a default admin user so the app remains usable
INSERT INTO public.app_users (name, username, phone, pin, role)
VALUES ('Admin', 'admin', '0000000000', '1234', 'admin');

-- Expense categories
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read expense_categories" ON public.expense_categories FOR SELECT USING (true);
CREATE POLICY "public insert expense_categories" ON public.expense_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "public update expense_categories" ON public.expense_categories FOR UPDATE USING (true);
CREATE POLICY "public delete expense_categories" ON public.expense_categories FOR DELETE USING (true);

INSERT INTO public.expense_categories (name) VALUES
('Supplies'), ('Utilities'), ('Salaries'), ('Maintenance'), ('Marketing'), ('Other');

-- Expenses
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  category_name TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read expenses" ON public.expenses FOR SELECT USING (true);
CREATE POLICY "public insert expenses" ON public.expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "public update expenses" ON public.expenses FOR UPDATE USING (true);
CREATE POLICY "public delete expenses" ON public.expenses FOR DELETE USING (true);

CREATE INDEX idx_expenses_date ON public.expenses(expense_date DESC);

-- Reusable updated_at function (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_app_users_updated BEFORE UPDATE ON public.app_users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_role_perms_updated BEFORE UPDATE ON public.role_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
