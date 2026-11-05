CREATE OR REPLACE FUNCTION public.validate_online_order_workflow() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.source='online' AND NEW.order_status IS DISTINCT FROM OLD.order_status THEN
  IF NEW.order_status NOT IN ('Pending','Accepted','Preparing','Ready','Out for delivery','Completed','Cancelled','Unpaid') THEN RAISE EXCEPTION 'Invalid online order stage'; END IF;
  IF NEW.order_status='Out for delivery' AND NEW.order_type!='DELIVERY' THEN RAISE EXCEPTION 'Only delivery orders can be out for delivery'; END IF;
  IF NEW.order_status='Cancelled' THEN
   IF OLD.paid_amount>0 THEN RAISE EXCEPTION 'Use the existing payment handling before cancelling a paid order'; END IF;
   NEW.status:='cancelled';
  ELSIF OLD.order_status='Cancelled' THEN RAISE EXCEPTION 'Cancelled orders cannot be reopened'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_online_order_workflow BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.validate_online_order_workflow();
COMMENT ON FUNCTION public.validate_online_order_workflow() IS 'Customer workflow stages are independent of payment; cancellation never refunds or edits money.';