import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { readStoredTheme } from "./lib/theme.tsx";

// Apply the saved theme before the first paint so refresh/navigation keeps it.
(() => {
  try {
    const t = readStoredTheme();
    const dark =
      t === "dark" ||
      (t === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", !!dark);
  } catch {}
})();

createRoot(document.getElementById("root")!).render(<App />);
