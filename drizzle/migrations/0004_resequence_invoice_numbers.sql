CREATE OR REPLACE FUNCTION public.resequence_invoice_numbers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_start bigint;
  v_changed integer := 0;
  v_max bigint;
BEGIN
  LOCK TABLE public.invoices IN SHARE ROW EXCLUSIVE MODE;
  SELECT min(number) INTO v_start FROM public.invoices;
  IF v_start IS NULL THEN
    RETURN 0;
  END IF;

  CREATE TEMP TABLE _renum ON COMMIT DROP AS
    SELECT id, number AS old_n, (v_start + row_number() OVER (ORDER BY number) - 1) AS new_n
    FROM public.invoices;
  DELETE FROM _renum WHERE old_n = new_n;
  SELECT count(*) INTO v_changed FROM _renum;

  IF v_changed > 0 THEN
    UPDATE public.invoices i SET number = -r.new_n FROM _renum r WHERE i.id = r.id;
    UPDATE public.invoices i SET number = r.new_n FROM _renum r WHERE i.id = r.id;
    UPDATE public.loyalty_transactions l SET invoice_number = r.new_n FROM _renum r WHERE l.invoice_id = r.id;
    UPDATE public.due_transactions d
      SET note = replace(d.note, '#' || r.old_n, '#' || r.new_n)
      FROM _renum r
      WHERE d.invoice_id = r.id AND d.note LIKE '%#' || r.old_n || '%';
  END IF;

  SELECT max(number) INTO v_max FROM public.invoices;
  PERFORM setval('public.invoices_number_seq', v_max, true);
  RETURN v_changed;
END;
$$;
GRANT EXECUTE ON FUNCTION public.resequence_invoice_numbers() TO anon, authenticated, service_role;