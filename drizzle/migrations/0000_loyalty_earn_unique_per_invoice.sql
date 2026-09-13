-- One loyalty "earn" credit per invoice (milestone note rows carry a reward and are excluded).
DELETE FROM public.loyalty_transactions lt
USING public.loyalty_transactions keep
WHERE lt.type = 'earn'
  AND lt.reward IS NULL
  AND lt.invoice_id IS NOT NULL
  AND keep.type = 'earn'
  AND keep.reward IS NULL
  AND keep.invoice_id = lt.invoice_id
  AND keep.created_at <= lt.created_at
  AND keep.id <> lt.id;

CREATE UNIQUE INDEX IF NOT EXISTS loyalty_earn_once_per_invoice
  ON public.loyalty_transactions (invoice_id)
  WHERE type = 'earn' AND reward IS NULL AND invoice_id IS NOT NULL;