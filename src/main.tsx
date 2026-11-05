import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { readStoredTheme } from "./lib/theme.tsx";
import { CUSTOMER_THEME_KEY, isCustomerThemePath, readThemePreference } from "./lib/themePreference";
import { installSessionLifecycle } from "./lib/posSessions.ts";

// Apply the saved theme before the first paint so refresh/navigation keeps it.
(() => {
  try {
    const t = isCustomerThemePath(window.location.pathname) ? readThemePreference(CUSTOMER_THEME_KEY, "system") : readStoredTheme();
    const dark =
      t === "dark" ||
      (t === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", !!dark);
  } catch {}
})();

// Staff work-session lifecycle: heartbeat while open, end on window close,
// close abandoned sessions when the app is next reachable.
installSessionLifecycle();

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);

