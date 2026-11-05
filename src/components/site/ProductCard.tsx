import { useState } from "react";
import { ImageIcon, Minus, Plus } from "lucide-react";
import type { DbProduct } from "@/lib/storefront";
import { formatMoney } from "@/lib/systemSettings";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useMealAvailability } from "@/lib/useMealAvailability";

export const ProductCard = ({ product, onAdd, showImage = true }: {
  product: DbProduct; onAdd: (p: DbProduct, qty?: number) => void; showImage?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [imageFailed, setImageFailed] = useState(false);
  const { availability } = useMealAvailability();
  const status = availability(product);
  const image = showImage && product.image_url && !imageFailed;
  return <>
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-elegant">
      <Button variant="ghost" className="relative h-auto w-full rounded-none p-0 hover:bg-secondary" onClick={() => { setQty(1); setOpen(true); }} aria-label={`View ${product.name}`}>
        <span className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-secondary">
          {image ? <img src={product.image_url || undefined} alt={product.name} loading="lazy" onError={() => setImageFailed(true)} className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105" /> : <ImageIcon className="h-8 w-8 text-muted-foreground" />}
        </span>
      </Button>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="text-xs text-muted-foreground">{product.category_name}</p>
        {status.message && <p className="text-xs text-muted-foreground" role="status">{status.message}</p>}
        <Button variant="link" className="h-auto justify-start whitespace-normal p-0 text-left font-semibold leading-relaxed" onClick={() => { setQty(1); setOpen(true); }}>{product.name}</Button>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="font-semibold tabular-nums">{formatMoney(product.price)}</span>
          <Button size="icon" disabled={!status.available} className="h-11 w-11 rounded-full" aria-label={`Add ${product.name}`} onClick={() => { if (status.available) onAdd(product); }}><Plus /></Button>
        </div>
      </div>
    </article>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="customer-site max-h-[90dvh] max-w-md overflow-y-auto p-0">
        {image && <img src={product.image_url || undefined} alt={product.name} className="aspect-[4/3] w-full object-cover" />}
        <div className="space-y-5 p-6">
          <DialogDescription>{product.category_name}</DialogDescription>
          <DialogTitle className="font-serif text-3xl leading-tight">{product.name}</DialogTitle>
          <p className="text-lg font-semibold tabular-nums">{formatMoney(product.price)}</p>
          {status.message && <p role="status" className="text-sm text-muted-foreground">{status.message}</p>}
          <div className="flex items-center justify-between gap-4">
            <div className="flex shrink-0 items-center gap-3 rounded-lg border border-border p-1">
              <Button size="icon" variant="ghost" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty(qty - 1)}><Minus /></Button>
              <span className="w-6 text-center font-semibold tabular-nums">{qty}</span>
              <Button size="icon" variant="ghost" aria-label="Increase quantity" disabled={qty >= 99} onClick={() => setQty(qty + 1)}><Plus /></Button>
            </div>
            <Button disabled={!status.available} className="h-12 flex-1 whitespace-normal" onClick={() => { if (status.available) { onAdd(product, qty); setOpen(false); } }}>Add · {formatMoney(product.price * qty)}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </>;
};
