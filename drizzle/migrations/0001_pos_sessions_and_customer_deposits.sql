-- 1) Cashier sessions
CREATE TABLE public.pos_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_name text NOT NULL,
  user_role text NOT NULL DEFAULT 'cashier',
  login_method text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  end_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_sessions TO anon;
GRANT ALL ON public.pos_sessions TO service_role;

ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read pos_sessions" ON public.pos_sessions FOR SELECT USING (true);
CREATE POLICY "public insert pos_sessions" ON public.pos_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "public update pos_sessions" ON public.pos_sessions FOR UPDATE USING (true);
CREATE POLICY "public delete pos_sessions" ON public.pos_sessions FOR DELETE USING (true);

CREATE INDEX idx_pos_sessions_started ON public.pos_sessions (started_at DESC);

-- 2) Link orders to the session/staff that created them (additive, nullable)
ALTER TABLE public.invoices ADD COLUMN session_id uuid REFERENCES public.pos_sessions(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD COLUMN created_by_user_id uuid;
ALTER TABLE public.invoices ADD COLUMN created_by_name text;

CREATE INDEX idx_invoices_session ON public.invoices (session_id);

-- 3) Customer deposits (separate from due, loyalty and order payments)
CREATE TABLE public.customer_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'deposit',
  amount numeric NOT NULL DEFAULT 0,
  method text,
  note text,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  staff_id uuid,
  staff_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_deposits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_deposits TO anon;
GRANT ALL ON public.customer_deposits TO service_role;

ALTER TABLE public.customer_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read customer_deposits" ON public.customer_deposits FOR SELECT USING (true);
CREATE POLICY "public insert customer_deposits" ON public.customer_deposits FOR INSERT WITH CHECK (true);
CREATE POLICY "public update customer_deposits" ON public.customer_deposits FOR UPDATE USING (true);
CREATE POLICY "public delete customer_deposits" ON public.customer_deposits FOR DELETE USING (true);

CREATE INDEX idx_customer_deposits_customer ON public.customer_deposits (customer_id, created_at DESC);
-- One deposit usage per order: prevents duplicated deductions
CREATE UNIQUE INDEX uq_customer_deposits_usage_invoice
  ON public.customer_deposits (invoice_id)
  WHERE type = 'usage' AND invoice_id IS NOT NULL;

-- 4) Deposit balance columns on customers (kept separate from due_balance / total_spent)
ALTER TABLE public.customers ADD COLUMN deposit_total numeric NOT NULL DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN deposit_used numeric NOT NULL DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN deposit_balance numeric NOT NULL DEFAULT 0;

-- 5) Deposit payment method (additive enum value)
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'Deposit';