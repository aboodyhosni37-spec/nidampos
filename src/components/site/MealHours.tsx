import { Clock } from "lucide-react";
import { MEAL_LABELS, mealOpen, type MealSettings } from "@/lib/mealSchedule";
export function MealHours({ settings, now = new Date() }: { settings: MealSettings; now?: Date }) {
  const periods = settings.periods.filter(p => p.enabled || p.product_ids.length || p.category_ids.length);
  if (!periods.length) return null;
  return <section aria-label="Meal availability" className="mb-6 border-y border-border py-4">
    <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-4 w-4" />Meal times · Mogadishu</div>
    <div className="grid gap-3 sm:grid-cols-3">{periods.map(p => <div key={p.id} className="min-w-0 text-sm"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{MEAL_LABELS[p.id]}</span><span className={mealOpen(p, now) ? "text-foreground" : "text-muted-foreground"}>{mealOpen(p, now) ? "Available now" : "Unavailable"}</span></div><p className="text-xs text-muted-foreground">{p.enabled ? `${p.start} – ${p.end}${p.start > p.end ? " (next day)" : ""}` : "Ordering disabled"}</p></div>)}</div>
  </section>;
}