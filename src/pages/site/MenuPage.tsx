import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, ShoppingBag, Minus, Plus, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/site/ProductCard";
import { useCustomerCart } from "@/lib/customerCart";
import { loadMenu, type DbCategory, type DbProduct } from "@/lib/storefront";
import { useSiteContent } from "@/lib/siteContent";
import { fetchSettings, formatMoney } from "@/lib/systemSettings";

const MenuPage = () => {
  const content = useSiteContent();
  const [params] = useSearchParams();
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(params.get("category") || "all");
  const [query, setQuery] = useState("");
  const { add, lines, count, subtotal, increment, decrement, remove } = useCustomerCart();
  useEffect(() => {
    fetchSettings().catch(() => {});
    loadMenu().then(data => { setCategories(data.categories); setProducts(data.products); }).catch(() => setFailed(true)).finally(() => setLoading(false));
  }, []);
  const filtered = useMemo(() => products.filter(p => (active === "all" || p.category_id === active) && `${p.name} ${p.category_name}`.toLowerCase().includes(query.trim().toLowerCase())), [products, active, query]);
  const groups = categories.map(c => ({ ...c, products: filtered.filter(p => p.category_id === c.id) })).filter(c => c.products.length);
  const uncategorized = filtered.filter(p => !categories.some(c => c.id === p.category_id));
  const handleAdd = (p: DbProduct, qty = 1) => { add(p, qty); toast.success(`${p.name} added to your order`); };
  return <div className="mx-auto max-w-7xl px-5 py-10 pb-28 sm:px-8 lg:px-12">
    <header className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div className="space-y-3"><p className="text-sm text-muted-foreground">{content.menu.eyebrow}</p><h1 className="font-serif text-4xl sm:text-5xl">{content.menu.title}</h1><p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{content.menu.description}</p></div><div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={e => setQuery(e.target.value)} placeholder={content.menu.search_placeholder} aria-label="Search the menu" className="h-12 pl-10" /></div></header>
    <div className="grid min-w-0 items-start gap-8 lg:grid-cols-[160px_minmax(0,1fr)] xl:grid-cols-[160px_minmax(0,1fr)_280px]">
      {content.menu.show_categories && <nav aria-label="Menu categories" className="flex gap-2 overflow-x-auto pb-2 lg:sticky lg:top-28 lg:flex-col lg:overflow-visible"><Button variant={active === "all" ? "default" : "ghost"} className="h-auto min-h-11 shrink-0 justify-start whitespace-normal text-left" onClick={() => setActive("all")}>All items <span className="ml-auto text-xs">{products.length}</span></Button>{categories.map(c => <Button key={c.id} variant={active === c.id ? "default" : "ghost"} className="h-auto min-h-11 shrink-0 justify-start whitespace-normal text-left" onClick={() => setActive(c.id)}>{c.name}<span className="ml-auto text-xs">{products.filter(p => p.category_id === c.id).length}</span></Button>)}</nav>}
      <div className="min-w-0 space-y-10">
        {loading && <div className="grid grid-cols-2 gap-4">{Array.from({ length: 6 }, (_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-secondary" />)}</div>}
        {failed && <p role="alert" className="py-12 text-muted-foreground">The menu is temporarily unavailable. Please try again shortly.</p>}
        {!loading && !failed && !filtered.length && <p className="py-12 text-muted-foreground">Nothing matches your search.</p>}
        {[...groups, ...(uncategorized.length ? [{ id: "other", name: "Menu", products: uncategorized }] : [])].map(c => <section key={c.id}><div className="mb-5 flex items-baseline justify-between border-b border-border pb-4"><h2 className="font-serif text-2xl">{c.name}</h2><span className="text-xs text-muted-foreground">{c.products.length} items</span></div><div className="grid grid-cols-2 gap-3 sm:gap-5">{c.products.map(p => <ProductCard key={p.id} product={p} onAdd={handleAdd} showImage={content.menu.show_images} />)}</div></section>)}
      </div>
      <aside className="sticky top-28 hidden border-l border-border pl-6 xl:block"><div className="mb-6 flex items-center justify-between"><h2 className="font-serif text-2xl">Your order</h2><ShoppingBag className="h-5 w-5" /></div>{!count && <p className="py-8 text-sm text-muted-foreground">Your order is empty.</p>}<ul className="max-h-[48dvh] space-y-5 overflow-y-auto">{lines.map(l => <li key={l.product_id} className="space-y-3 border-b border-border pb-4"><div className="flex justify-between gap-3"><span className="min-w-0 break-words text-sm font-medium">{l.name}</span><span className="shrink-0 text-sm tabular-nums">{formatMoney(l.price * l.qty)}</span></div><div className="flex items-center gap-2"><Button variant="outline" size="icon" className="h-9 w-9" aria-label={`Decrease ${l.name}`} onClick={() => decrement(l.product_id)}><Minus /></Button><span className="w-6 text-center text-sm">{l.qty}</span><Button variant="outline" size="icon" className="h-9 w-9" aria-label={`Increase ${l.name}`} onClick={() => increment(l.product_id)}><Plus /></Button><Button variant="ghost" size="icon" className="ml-auto h-9 w-9" aria-label={`Remove ${l.name}`} onClick={() => remove(l.product_id)}><Trash2 /></Button></div></li>)}</ul>{count > 0 && <div className="space-y-4 pt-6"><div className="flex justify-between text-sm font-semibold"><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div><Button asChild className="h-12 w-full"><Link to="/checkout">Checkout <ArrowRight /></Link></Button></div>}</aside>
    </div>
    {count > 0 && <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background p-4 xl:hidden"><Button asChild className="mx-auto flex h-12 w-full max-w-xl justify-between"><Link to="/checkout"><span className="flex items-center gap-2"><ShoppingBag />{count} items</span><span>{formatMoney(subtotal)} · Checkout</span></Link></Button></div>}
  </div>;
};
export default MenuPage;
