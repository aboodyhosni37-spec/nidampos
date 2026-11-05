import { describe, expect, it } from "vitest";
import { DEFAULT_MEALS, mealOpen, normalizeMeals, productAvailability, validateMeals, type MealPeriod } from "@/lib/mealSchedule";
const breakfast: MealPeriod = { id: "breakfast", enabled: true, start: "06:00", end: "10:00", category_ids: ["breakfast-category"], product_ids: ["meal"] };
const schedule = { periods: [breakfast] };
const product = { id: "meal", category_id: null };
describe("Mogadishu customer meal rules", () => {
  it("has no invented default meal hours or restrictions", () => {
    expect(DEFAULT_MEALS.periods.map(p => [p.enabled, p.start, p.end])).toEqual([[false, "", ""], [false, "", ""], [false, "", ""]]);
    expect(productAvailability(product, DEFAULT_MEALS).available).toBe(true);
  });
  it("opens at configured breakfast start using Africa/Mogadishu", () => {
    expect(mealOpen(breakfast, new Date("2026-11-05T02:59:59Z"))).toBe(false);
    expect(mealOpen(breakfast, new Date("2026-11-05T03:00:00Z"))).toBe(true);
  });
  it("closes exactly at closing time", () => {
    expect(productAvailability(product, schedule, new Date("2026-11-05T06:59:59Z")).available).toBe(true);
    expect(productAvailability(product, schedule, new Date("2026-11-05T07:00:00Z")).available).toBe(false);
  });
  it("disabled meals remain unavailable even during their hours", () => {
    expect(productAvailability(product, { periods: [{ ...breakfast, enabled: false }] }, new Date("2026-11-05T04:00:00Z")).available).toBe(false);
  });
  it("applies category assignments without changing unassigned products", () => {
    const now = new Date("2026-11-05T12:00:00Z");
    expect(productAvailability({ id: "other", category_id: "breakfast-category" }, schedule, now).available).toBe(false);
    expect(productAvailability({ id: "other", category_id: "drinks" }, schedule, now).available).toBe(true);
  });
  it("supports overnight dinner and closes the next morning", () => {
    const dinner = { ...breakfast, id: "dinner" as const, start: "22:00", end: "02:00" };
    expect(mealOpen(dinner, new Date("2026-11-05T20:00:00Z"))).toBe(true);
    expect(mealOpen(dinner, new Date("2026-11-05T22:59:00Z"))).toBe(true);
    expect(mealOpen(dinner, new Date("2026-11-05T23:00:00Z"))).toBe(false);
  });
  it("allows a shared product if any assigned period is open", () => {
    const lunch = { ...breakfast, id: "lunch" as const, start: "12:00", end: "15:00" };
    expect(productAvailability(product, { periods: [breakfast, lunch] }, new Date("2026-11-05T10:00:00Z")).available).toBe(true);
  });
  it("returns next opening and rejects invalid windows", () => {
    expect(productAvailability(product, schedule, new Date("2026-11-05T07:00:00Z")).message).toContain("tomorrow at 06:00");
    expect(validateMeals({ periods: [{ ...breakfast, start: "25:00" }] })).not.toBeNull();
    expect(validateMeals({ periods: [{ ...breakfast, end: "06:00" }] })).not.toBeNull();
    expect(normalizeMeals(null).periods).toHaveLength(3);
  });
});