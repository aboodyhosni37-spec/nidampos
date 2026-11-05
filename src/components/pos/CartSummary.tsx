interface CartSummaryProps {
  subtotal: string;
  discount: string;
  tax: string;
  taxLabel: string;
  total: string;
  paid: string;
  due: string;
  /** Show Amount Paid / Balance Due only when part of the order is on credit. */
  showBalance?: boolean;
}

export function CartSummary({ subtotal, discount, tax, taxLabel, total, paid, due, showBalance }: CartSummaryProps) {
  const rows = [["Subtotal", subtotal], ["Discount", discount], [taxLabel, tax]];
  return <div className="space-y-1.5" aria-label="Cart summary">
    <dl className="space-y-1 text-xs">
      {rows.map(([label, value]) => <div key={label} className="flex items-baseline justify-between gap-2">
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="font-medium tabular-nums">{value}</dd>
      </div>)}
    </dl>
    <div className="flex items-baseline justify-between gap-3 border-t border-border pt-1.5 text-xl font-bold">
      <span>Grand Total</span><span className="tabular-nums">{total}</span>
    </div>
    {showBalance && <dl className="grid grid-cols-2 gap-2 text-xs">
      <div className="flex justify-between rounded-md bg-secondary px-2 py-1"><dt className="text-muted-foreground">Amount Paid</dt><dd className="font-semibold tabular-nums">{paid}</dd></div>
      <div className="flex justify-between rounded-md bg-secondary px-2 py-1"><dt className="text-muted-foreground">Balance Due</dt><dd className="font-semibold tabular-nums">{due}</dd></div>
    </dl>}
  </div>;
}
