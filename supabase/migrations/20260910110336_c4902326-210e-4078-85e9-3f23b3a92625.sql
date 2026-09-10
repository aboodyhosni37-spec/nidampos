CREATE TABLE public.loyalty_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  invoice_number bigint,
  type text NOT NULL DEFAULT 'earn',
  points integer NOT NULL DEFAULT 0,
  reward text,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_transactions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_transactions TO authenticated;
GRANT ALL ON public.loyalty_transactions TO service_role;

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read loyalty_transactions" ON public.loyalty_transactions FOR SELECT USING (true);
CREATE POLICY "public insert loyalty_transactions" ON public.loyalty_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "public update loyalty_transactions" ON public.loyalty_transactions FOR UPDATE USING (true);
CREATE POLICY "public delete loyalty_transactions" ON public.loyalty_transactions FOR DELETE USING (true);

CREATE INDEX idx_loyalty_transactions_customer ON public.loyalty_transactions(customer_id, created_at DESC);