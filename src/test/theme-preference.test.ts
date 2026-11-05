import { beforeEach, describe, expect, it } from "vitest";
import { CUSTOMER_THEME_KEY, STAFF_THEME_KEY, isCustomerThemePath, readThemePreference, resolveTheme } from "@/lib/themePreference";
describe("separate customer appearance", () => {
  beforeEach(() => localStorage.clear());
  it("defaults customers to device appearance", () => {
    expect(readThemePreference(CUSTOMER_THEME_KEY, "system")).toBe("system");
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
  it("persists customer manual choices separately from staff", () => {
    localStorage.setItem(CUSTOMER_THEME_KEY, "dark");
    localStorage.setItem(STAFF_THEME_KEY, "light");
    expect(readThemePreference(CUSTOMER_THEME_KEY, "system")).toBe("dark");
    expect(readThemePreference(STAFF_THEME_KEY, "light")).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
  });
  it("applies the customer preference to every customer page only", () => {
    for (const path of ["/", "/about", "/menu", "/contact", "/order", "/checkout", "/order-status", "/menu/"]) expect(isCustomerThemePath(path)).toBe(true);
    for (const path of ["/login", "/staff/login", "/dashboard/pos", "/super-admin"]) expect(isCustomerThemePath(path)).toBe(false);
  });
});