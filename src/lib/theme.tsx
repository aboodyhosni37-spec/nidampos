import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { CUSTOMER_THEME_KEY, STAFF_THEME_KEY, isCustomerThemePath, readThemePreference, resolveTheme, type ThemeMode } from "./themePreference";
export type { ThemeMode } from "./themePreference";

const systemPrefersDark = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-color-scheme: dark)").matches;

export const readStoredTheme = (): ThemeMode => {
  return readThemePreference(STAFF_THEME_KEY, "light");
};

const applyClass = (dark: boolean) => {
  document.documentElement.classList.toggle("dark", dark);
};

type Ctx = {
  theme: ThemeMode;
  resolved: "light" | "dark";
  setTheme: (t: ThemeMode) => void;
};

const ThemeContext = createContext<Ctx>({
  theme: "light",
  resolved: "light",
  setTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  const customer = isCustomerThemePath(pathname);
  const key = customer ? CUSTOMER_THEME_KEY : STAFF_THEME_KEY;
  const [staffTheme, setStaffTheme] = useState<ThemeMode>(() => readStoredTheme());
  const [customerTheme, setCustomerTheme] = useState<ThemeMode>(() => readThemePreference(CUSTOMER_THEME_KEY, "system"));
  const theme = customer ? customerTheme : staffTheme;
  const [systemDark, setSystemDark] = useState<boolean>(() => systemPrefersDark());

  // Track OS preference changes (only matters for "system")
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolved = resolveTheme(theme, systemDark);

  useLayoutEffect(() => {
    applyClass(resolved === "dark");
  }, [resolved]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === STAFF_THEME_KEY || event.key === null) setStaffTheme(readStoredTheme());
      if (event.key === CUSTOMER_THEME_KEY || event.key === null) setCustomerTheme(readThemePreference(CUSTOMER_THEME_KEY, "system"));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const setTheme = useCallback((t: ThemeMode) => {
    try {
      localStorage.setItem(key, t);
    } catch {}
    if (customer) setCustomerTheme(t); else setStaffTheme(t);
  }, [customer, key]);

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);

/**
 * Kept for backwards compatibility: pages no longer force a palette, so the
 * user's Light/Dark selection applies across every page.
 */
export const useForcedDarkTheme = () => {};
export const useForcedLightTheme = () => {};

