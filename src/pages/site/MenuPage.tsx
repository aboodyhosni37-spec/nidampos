import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { ProductCard } from "@/components/site/ProductCard";
import { useCustomerCart } from "@/lib/customerCart";
import { loadMenu, type DbCategory, type DbProduct } from "@/lib/storefront";
import { fetchSettings, formatMoney } from "@/lib/systemSettings";
import { cn } from "@/lib/utils";

const MenuPage = () => {
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<string>("all");
  const [query, setQuery] = useState("");
  const { add, count, subtotal } = useCustomerCart();

  useEffect(() => {
    fetchSettings().catch(() => {});
    loadMenu()
      .then(({ categories: c, products: p }) => {
        setCategories(c);
        setProducts(p);
      })
      .catch(() => toast.error("Could not load the menu. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const catOk = active === "all" || p.category_id === active;
      const qOk =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.category_name ?? "").toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [products, active, query]);

  const handleAdd = (p: DbProduct) => {
    add(p);
    toast.success(`${p.name} added to your order`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14 pb-28">
      <header className="space-y-3">
        <span className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
          Our menu
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
          Everything we serve
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Browse by category or search for what you are craving, then add it straight to
          your order.
        </p>
      </header>

      <div className="mt-8 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the menu…"
            aria-label="Search the menu"
            className="w-full h-12 pl-10 pr-4 rounded-xl border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            type="button"
            onClick={() => setActive("all")}
            className={cn(
              "h-10 px-4 rounded-xl text-sm font-semibold whitespace-nowrap border transition-colors",
              active === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            )}
          >
            All items
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActive(c.id)}
              className={cn(
                "h-10 px-4 rounded-xl text-sm font-semibold whitespace-nowrap border transition-colors",
                active === c.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {c.name}

          ))}
        </div>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="aspect-[4/3] bg-secondary animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-4 w-3/4 bg-secondary rounded animate-pulse" />
                  <div className="h-8 w-1/2 bg-secondary rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            Nothing matches your search.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {filtered.length} item{filtered.length === 1 ? "" : "s"}
            </p>
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} onAdd={handleAdd} />
              ))}
            </div>
          </>
        )}
      </div>

      {count > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(100%-2rem,32rem)]">
          <Link
            to="/order"
            className="flex items-center justify-between gap-4 h-14 px-5 rounded-2xl bg-primary text-primary-foreground shadow-elegant hover:bg-primary/90 transition-colors"
          >
            <span className="inline-flex items-center gap-2 font-semibold">
              <ShoppingBag className="h-4 w-4" />
              {count} item{count === 1 ? "" : "s"}
            </span>
            <span className="font-bold tabular-nums">
              {formatMoney(subtotal)} · Checkout
            </span>
          </Link>
        </div>
      )}
    </div>
  );
};

export default MenuPage;
