import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OrderItem } from "@/lib/orders";

interface CartItemsProps {
  items: OrderItem[];
  money: (value: number) => string;
  onQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
}

export function CartItems({ items, money, onQuantity, onRemove }: CartItemsProps) {
  if (items.length === 0) {
    return <div className="flex h-full min-h-24 items-center justify-center gap-3 px-4 text-muted-foreground">
      <ShoppingCart className="h-6 w-6" />
      <span className="text-sm">Cart is empty</span>
    </div>;
  }

  return <div>
    <div className="sticky top-0 z-10 hidden grid-cols-[minmax(0,1fr)_72px_116px_80px_40px] items-center gap-2 border-b border-border bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground sm:grid">
      <span>Product</span><span className="text-right">Unit Price</span>
      <span className="text-center">Quantity</span><span className="text-right">Total</span>
      <span className="text-center"><Trash2 className="mx-auto h-3.5 w-3.5" aria-label="Remove" /></span>
    </div>
    <ul className="divide-y divide-border">
      {items.map(item => <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_72px_116px_80px_40px] sm:py-2.5">
        <div className="min-w-0 text-sm font-medium leading-5 [overflow-wrap:anywhere]">
          {item.name}
          <div className="mt-1 text-xs font-normal tabular-nums text-muted-foreground sm:hidden">{money(item.price)} each</div>
        </div>
        <span className="hidden break-words text-right text-sm tabular-nums text-muted-foreground sm:block">{money(item.price)}</span>
        <div className="col-start-1 row-start-2 flex items-center sm:col-start-3 sm:row-start-1 sm:justify-center">
          <div className="inline-flex items-center overflow-hidden rounded-md border border-border bg-card">
            <Button variant="ghost" size="icon" className="h-10 w-9 shrink-0 rounded-none" aria-label={`Decrease ${item.name}`} onClick={() => onQuantity(item.id, -1)}><Minus className="h-4 w-4" /></Button>
            <span className="min-w-9 px-1 text-center text-sm font-semibold tabular-nums">{item.qty}</span>
            <Button variant="ghost" size="icon" className="h-10 w-9 shrink-0 rounded-none" aria-label={`Increase ${item.name}`} onClick={() => onQuantity(item.id, 1)}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
        <span className="col-start-2 row-start-2 justify-self-end text-right text-sm font-semibold tabular-nums sm:col-start-4 sm:row-start-1 [overflow-wrap:anywhere]">{money(item.price * item.qty)}</span>
        <Button variant="ghost" size="icon" className="col-start-2 row-start-1 h-10 w-10 justify-self-end rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:col-start-5" aria-label={`Remove ${item.name}`} onClick={() => onRemove(item.id)}><Trash2 className="h-4 w-4" /></Button>
      </li>)}
    </ul>
  </div>;
}