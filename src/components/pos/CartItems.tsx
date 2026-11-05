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

  return <div className="cart-items">
    <div className="cart-table-head sticky top-0 z-10 border-b border-border bg-secondary text-xs font-medium text-muted-foreground">
      <span>Item</span>
      <span className="text-right">Price</span>
      <span className="text-center">Qty</span>
      <span className="text-right">Total</span>
      <span className="text-center"><Trash2 className="mx-auto h-3.5 w-3.5" aria-label="Remove" /></span>
    </div>
    <ul className="divide-y divide-border">
      {items.map(item => <li key={item.id} className="cart-row">
        <div className="cart-name min-w-0 text-sm font-medium leading-5 [overflow-wrap:anywhere]">
          {item.name}
          <div className="cart-each mt-1 text-xs font-normal tabular-nums text-muted-foreground">{money(item.price)} each</div>
        </div>
        <span className="cart-unit text-sm tabular-nums text-muted-foreground [overflow-wrap:anywhere]">{money(item.price)}</span>
        <div className="cart-qty">
          <div className="inline-flex items-center overflow-hidden rounded-md border border-border bg-card">
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-none" aria-label={`Decrease ${item.name}`} onClick={() => onQuantity(item.id, -1)}><Minus className="h-4 w-4" /></Button>
            <span className="min-w-8 px-1 text-center text-sm font-semibold tabular-nums">{item.qty}</span>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-none" aria-label={`Increase ${item.name}`} onClick={() => onQuantity(item.id, 1)}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
        <span className="cart-total text-sm font-semibold tabular-nums [overflow-wrap:anywhere]">{money(item.price * item.qty)}</span>
        <Button variant="ghost" size="icon" className="cart-remove h-8 w-8 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Remove ${item.name}`} onClick={() => onRemove(item.id)}><Trash2 className="h-4 w-4" /></Button>
      </li>)}
    </ul>
  </div>;
}
