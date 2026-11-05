export type ThemeMode = "light" | "dark" | "system";
export const STAFF_THEME_KEY = "nidam_theme";
export const CUSTOMER_THEME_KEY = "lamahamar_customer_theme";
export const isCustomerThemePath = (path: string) => ["/", "/about", "/menu", "/contact", "/order", "/checkout", "/order-status"].includes(path.replace(/\/$/, "") || "/");
export function readThemePreference(key: string, fallback: ThemeMode): ThemeMode {
  try {
    const raw = localStorage.getItem(key);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {}
  return fallback;
}
export const resolveTheme = (mode: ThemeMode, systemDark: boolean): "light" | "dark" => mode === "system" ? (systemDark ? "dark" : "light") : mode;