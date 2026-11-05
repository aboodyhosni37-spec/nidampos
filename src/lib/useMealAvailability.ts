import { useEffect, useState } from "react";
import { useSiteContent } from "./siteContent";
import { productAvailability } from "./mealSchedule";
export function useMealAvailability() {
  const content = useSiteContent();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const interval = window.setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", tick); };
  }, []);
  return { settings: content.meals, now, availability: (p: { id: string; category_id: string | null }) => productAvailability(p, content.meals, now) };
}