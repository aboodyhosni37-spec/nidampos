-- Customers
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  due_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_phone ON public.customers(phone);

-- Invoices
CREATE TYPE public.payment_method AS ENUM ('Cash','Card','EVC-Plus','Premier Wallet','E-Dahab','Due','Split');

CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  number BIGSERIAL NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  table_label TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method public.payment_method NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX idx_invoices_created ON public.invoices(created_at DESC);

-- Invoice items
CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id TEXT,
  name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  qty INTEGER NOT NULL
);
CREATE INDEX idx_invoice_items_invoice ON public.invoice_items(invoice_id);

-- Payments (one or more per invoice)
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  method public.payment_method NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_invoice ON public.payments(invoice_id);

-- Due transactions: positive amount = new debt, negative = repayment
CREATE TABLE public.due_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('charge','repayment')),
  amount NUMERIC(12,2) NOT NULL,
  method public.payment_method,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_due_tx_customer ON public.due_transactions(customer_id, created_at DESC);

-- Trigger to keep customer.due_balance in sync
CREATE OR REPLACE FUNCTION public.apply_due_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.customers
    SET due_balance = due_balance + (CASE WHEN NEW.type = 'charge' THEN NEW.amount ELSE -NEW.amount END),
        updated_at = now()
    WHERE id = NEW.customer_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.customers
    SET due_balance = due_balance - (CASE WHEN OLD.type = 'charge' THEN OLD.amount ELSE -OLD.amount END),
        updated_at = now()
    WHERE id = OLD.customer_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_apply_due_transaction
AFTER INSERT OR DELETE ON public.due_transactions
FOR EACH ROW EXECUTE FUNCTION public.apply_due_transaction();

-- RLS: enable + permissive policies (no auth in app yet)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.due_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "public write customers" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "public update customers" ON public.customers FOR UPDATE USING (true);
CREATE POLICY "public delete customers" ON public.customers FOR DELETE USING (true);

CREATE POLICY "public read invoices" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "public write invoices" ON public.invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "public update invoices" ON public.invoices FOR UPDATE USING (true);
CREATE POLICY "public delete invoices" ON public.invoices FOR DELETE USING (true);

CREATE POLICY "public read invoice_items" ON public.invoice_items FOR SELECT USING (true);
CREATE POLICY "public write invoice_items" ON public.invoice_items FOR INSERT WITH CHECK (true);
CREATE POLICY "public update invoice_items" ON public.invoice_items FOR UPDATE USING (true);
CREATE POLICY "public delete invoice_items" ON public.invoice_items FOR DELETE USING (true);

CREATE POLICY "public read payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "public write payments" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "public update payments" ON public.payments FOR UPDATE USING (true);
CREATE POLICY "public delete payments" ON public.payments FOR DELETE USING (true);

CREATE POLICY "public read due_transactions" ON public.due_transactions FOR SELECT USING (true);
CREATE POLICY "public write due_transactions" ON public.due_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "public update due_transactions" ON public.due_transactions FOR UPDATE USING (true);
CREATE POLICY "public delete due_transactions" ON public.due_transactions FOR DELETE USING (true);