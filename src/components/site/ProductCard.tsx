import { Plus } from "lucide-react";
import foodFallback from "@/assets/cafe-food.jpg";
import type { DbProduct } from "@/lib/storefront";
import { formatMoney } from "@/lib/systemSettings";

export const ProductCard = ({
  product,
  onAdd,
  showImage = true,
}: {
  product: DbProduct;
  onAdd: (p: DbProduct) => void;
  showImage?: boolean;
}) => (
  <article className="group rounded-2xl border border-border bg-card overflow-hidden shadow-soft hover:shadow-elegant transition-all duration-300 flex flex-col">
    {showImage ? (
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <img
          src={product.image_url || foodFallback}
          alt={product.name}
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = foodFallback;
          }}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute top-2.5 left-2.5 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold text-primary">
          {product.category_name}
        </span>
      </div>
    ) : (
      <div className="px-4 pt-4">
        <span className="inline-flex rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-primary">
          {product.category_name}
        </span>
      </div>
    )}
    <div className="p-4 flex flex-col gap-3 flex-1">
      <h3 className="font-semibold leading-snug break-words">{product.name}</h3>
      <div className="mt-auto flex items-center justify-between gap-3">
        <span className="text-lg font-bold tabular-nums">{formatMoney(product.price)}</span>
        <button
          type="button"
          onClick={() => onAdd(product)}
          className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
    </div>
  </article>
);
