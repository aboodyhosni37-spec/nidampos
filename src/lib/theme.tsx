import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

const KEY = "nidam_theme";

const systemPrefersDark = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-color-scheme: dark)").matches;

export const readStoredTheme = (): ThemeMode => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {}
  return "light";
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
  const [theme, setThemeState] = useState<ThemeMode>(() => readStoredTheme());
  const [systemDark, setSystemDark] = useState<boolean>(() => systemPrefersDark());

  // Track OS preference changes (only matters for "system")
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolved: "light" | "dark" =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    if (document.documentElement.dataset.forcedTheme) return;
    applyClass(resolved === "dark");
  }, [resolved]);

  const setTheme = useCallback((t: ThemeMode) => {
    try {
      localStorage.setItem(KEY, t);
    } catch {}
    setThemeState(t);
  }, []);

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);

/**
 * Pages that are designed dark-only (landing / login) force the dark palette
 * while mounted, then restore the user's chosen theme on unmount.
 */
export const useForcedDarkTheme = () => {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.forcedTheme = "dark";
    const had = root.classList.contains("dark");
    root.classList.add("dark");
    return () => {
      delete root.dataset.forcedTheme;
      root.classList.toggle("dark", had ? true : readStoredTheme() === "dark" || (readStoredTheme() === "system" && systemPrefersDark()));
      const t = readStoredTheme();
      const dark = t === "dark" || (t === "system" && systemPrefersDark());
      root.classList.toggle("dark", dark);
    };
  }, []);
};
