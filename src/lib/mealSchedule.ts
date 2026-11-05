export const MEAL_IDS = ["breakfast", "lunch", "dinner"] as const;
export type MealId = typeof MEAL_IDS[number];
export type MealPeriod = { id: MealId; enabled: boolean; start: string; end: string; category_ids: string[]; product_ids: string[] };
export type MealSettings = { periods: MealPeriod[] };
export const MEAL_LABELS: Record<MealId, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };
export const DEFAULT_MEALS: MealSettings = { periods: MEAL_IDS.map(id => ({ id, enabled: false, start: "", end: "", category_ids: [], product_ids: [] })) };
const validTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const minutes = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
export function normalizeMeals(value: unknown): MealSettings {
  const raw = value as Partial<MealSettings> | null;
  return { periods: MEAL_IDS.map(id => {
    const p = Array.isArray(raw?.periods) ? raw.periods.find(p => p?.id === id) : undefined;
    return { id, enabled: p?.enabled === true, start: typeof p?.start === "string" ? p.start : "", end: typeof p?.end === "string" ? p.end : "", category_ids: Array.isArray(p?.category_ids) ? p.category_ids.filter(x => typeof x === "string") : [], product_ids: Array.isArray(p?.product_ids) ? p.product_ids.filter(x => typeof x === "string") : [] };
  }) };
}
export function validateMeals(settings: MealSettings): string | null {
  for (const p of settings.periods) {
    if ((p.enabled || p.start || p.end) && (!validTime(p.start) || !validTime(p.end) || p.start === p.end)) return `${MEAL_LABELS[p.id]} needs different, valid opening and closing times.`;
  }
  return null;
}
export function mogadishuMinute(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Mogadishu", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  return Number(parts.find(p => p.type === "hour")?.value) * 60 + Number(parts.find(p => p.type === "minute")?.value);
}
export function mealOpen(p: MealPeriod, now: Date): boolean {
  if (!p.enabled || !validTime(p.start) || !validTime(p.end) || p.start === p.end) return false;
  const m = mogadishuMinute(now), start = minutes(p.start), end = minutes(p.end);
  return start < end ? m >= start && m < end : m >= start || m < end;
}
export type MealAvailability = { available: boolean; message: string; periods: MealPeriod[] };
export function productAvailability(product: { id: string; category_id: string | null }, settings: MealSettings, now = new Date()): MealAvailability {
  const periods = settings.periods.filter(p => p.product_ids.includes(product.id) || (!!product.category_id && p.category_ids.includes(product.category_id)));
  if (!periods.length) return { available: true, message: "", periods };
  const open = periods.filter(p => mealOpen(p, now));
  if (open.length) return { available: true, message: open.map(p => `${MEAL_LABELS[p.id]} · until ${p.end}`).join(" / "), periods };
  const upcoming = periods.filter(p => p.enabled && validTime(p.start) && validTime(p.end) && p.start !== p.end).sort((a, b) => ((minutes(a.start) - mogadishuMinute(now) + 1440) % 1440) - ((minutes(b.start) - mogadishuMinute(now) + 1440) % 1440));
  const next = upcoming[0];
  return { available: false, message: next ? `Unavailable · ${MEAL_LABELS[next.id]} opens ${minutes(next.start) <= mogadishuMinute(now) ? "tomorrow " : ""}at ${next.start} (Mogadishu)` : "Unavailable · meal ordering is disabled", periods };
}