import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { loadMenu, type DbProduct, type DbCategory } from "@/lib/storefront";
import { MEAL_LABELS, type MealSettings } from "@/lib/mealSchedule";
import { MealHours } from "./MealHours";
export function MealTimeEditor({ value, onChange }: { value: MealSettings; onChange: (v: MealSettings) => void }) {
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => { loadMenu().then(m => { setProducts(m.products); setCategories(m.categories); }).catch(() => setError(true)); }, []);
  return <div className="space-y-6">
    <p className="text-sm text-muted-foreground">Times are local to Mogadishu. Unassigned products stay available; assigned products require an enabled, open meal period. Closing times earlier than opening times run overnight.</p>
    {error && <p role="alert" className="text-destructive">Could not load the menu. Refresh before assigning items.</p>}
    <Input aria-label="Find meal products" placeholder="Find products…" value={query} onChange={e => setQuery(e.target.value)} />
    <div className="grid gap-4 lg:grid-cols-3">{value.periods.map(p => {
      const update = (patch: Partial<typeof p>) => onChange({ periods: value.periods.map(x => x.id === p.id ? { ...x, ...patch } : x) });
      const toggle = (key: "product_ids" | "category_ids", id: string, checked: boolean) => update({ [key]: checked ? [...new Set([...p[key], id])] : p[key].filter(x => x !== id) });
      return <Card key={p.id} className="min-w-0 space-y-5 p-4">
        <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{MEAL_LABELS[p.id]}</h2><Switch checked={p.enabled} aria-label={`Enable ${MEAL_LABELS[p.id]}`} onCheckedChange={enabled => update({ enabled })} /></div>
        <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor={`${p.id}-start`}>Opening time</Label><Input id={`${p.id}-start`} type="time" value={p.start} onChange={e => update({ start: e.target.value })} /></div><div className="space-y-2"><Label htmlFor={`${p.id}-end`}>Closing time</Label><Input id={`${p.id}-end`} type="time" value={p.end} onChange={e => update({ end: e.target.value })} /></div></div>
        <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">Categories</legend><div className="max-h-44 space-y-2 overflow-y-auto">{categories.map(c => <label key={c.id} className="flex items-start gap-2 text-sm"><Checkbox checked={p.category_ids.includes(c.id)} onCheckedChange={checked => toggle("category_ids", c.id, checked === true)} /><span className="min-w-0 break-words">{c.name}</span></label>)}</div></fieldset>
        <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">Products · {p.product_ids.length} selected</legend><div className="max-h-64 space-y-2 overflow-y-auto">{products.filter(x => x.name.toLowerCase().includes(query.toLowerCase())).map(x => <label key={x.id} className="flex items-start gap-2 text-sm"><Checkbox checked={p.product_ids.includes(x.id)} onCheckedChange={checked => toggle("product_ids", x.id, checked === true)} /><span className="min-w-0 break-words">{x.name}<span className="block text-xs text-muted-foreground">{x.category_name}{p.category_ids.includes(x.category_id || "") ? " · included by category" : ""}</span></span></label>)}</div></fieldset>
      </Card>;
    })}</div>
    <h2 className="text-sm font-semibold">Customer availability preview</h2><MealHours settings={value} />
  </div>;
}