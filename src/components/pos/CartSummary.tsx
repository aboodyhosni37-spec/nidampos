interface CartSummaryProps {
  subtotal: string;
  discount: string;
  tax: string;
  taxLabel: string;
  total: string;
  paid: string;
  due: string;
}

export function CartSummary({ subtotal, discount, tax, taxLabel, total, paid, due }: CartSummaryProps) {
  const rows = [
    ["Subtotal", subtotal], ["Discount", discount], [taxLabel, tax],
    ["Amount Paid", paid], ["Balance Due", due],
  ];
  return <div className="space-y-2" aria-label="Cart summary">
    <dl className="grid grid-cols-2 gap-x-5 gap-y-1.5 text-xs">
      {rows.map(([label, value]) => <div key={label} className="flex min-w-0 items-baseline justify-between gap-2">
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="shrink-0 font-medium tabular-nums">{value}</dd>
      </div>)}
    </dl>
    <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2 text-lg font-bold">
      <span>Grand Total</span><span className="tabular-nums">{total}</span>
    </div>
  </div>;
}