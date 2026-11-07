import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

const PageLoadingContext = createContext<(loading: boolean) => void>(() => {});
let completed = false;
const dataPages = new Set(["/", "/menu", "/checkout", "/order"]);

/** Report existing page fetch state; never introduces a second data request. */
export function useCustomerPageLoading(loading: boolean) {
  const report = useContext(PageLoadingContext);
  useEffect(() => { report(loading); }, [loading, report]);
}

export function waitForImage(image: HTMLImageElement): Promise<void> {
  if (image.complete) return image.decode?.().catch(() => {}) ?? Promise.resolve();
  return new Promise(resolve => {
    const finish = () => {
      image.removeEventListener("load", finish);
      image.removeEventListener("error", finish);
      resolve();
    };
    image.addEventListener("load", finish, { once: true });
    image.addEventListener("error", finish, { once: true });
  });
}

/** Only first-viewport images are essential; never force the entire lazy menu to download. */
export function essentialImages(root: HTMLElement): HTMLImageElement[] {
  return Array.from(root.querySelectorAll<HTMLImageElement>("img")).filter(image => {
    const rect = image.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0;
  });
}

export function CustomerLoadingBoundary({ ready, children }: { ready: boolean; children: ReactNode }) {
  const { pathname } = useLocation();
  const [pageLoading, setPageLoading] = useState(() => dataPages.has(pathname));

  useEffect(() => {
    if (completed) return;
    const overlay = document.getElementById("customer-loading");
    const site = document.querySelector<HTMLElement>(".customer-site");
    if (!overlay || !site) return;
    site.inert = true;
    site.setAttribute("aria-busy", "true");
    const dismiss = () => {
      if (completed) return;
      completed = true;
      site.inert = false;
      site.removeAttribute("aria-busy");
      overlay.classList.add("is-leaving");
      const remove = () => {
        overlay.remove();
        document.documentElement.classList.remove("customer-boot");
      };
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) remove();
      else window.setTimeout(remove, 240);
    };
    // Failed networks must never trap customers behind a permanent screen.
    const deadline = window.setTimeout(dismiss, 12000);
    let alive = true;
    let frame = 0;
    if (ready && !pageLoading) {
      frame = requestAnimationFrame(() => {
        const logo = overlay.querySelector<HTMLImageElement>("img");
        const images = essentialImages(site);
        if (logo) images.push(logo);
        void Promise.all(images.map(waitForImage)).then(() => {
          if (alive) dismiss();
        });
      });
    }
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      window.clearTimeout(deadline);
      site.inert = false;
      site.removeAttribute("aria-busy");
    };
  }, [ready, pageLoading]);

  return <PageLoadingContext.Provider value={setPageLoading}>{children}</PageLoadingContext.Provider>;
}