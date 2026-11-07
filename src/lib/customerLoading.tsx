import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

const PageLoadingContext = createContext<(loading: boolean) => void>(() => {});
let completed = false;
const dataPages = new Set(["/", "/menu", "/checkout", "/order"]);

/** Milestone progress, not invented elapsed-time or download-byte progress. */
export function loadingProgress(contentReady: boolean, pageReady: boolean, settledImages = 0, totalImages?: number): number {
  const data = (contentReady ? 25 : 0) + (pageReady ? 25 : 0);
  if (!contentReady || !pageReady || totalImages === undefined) return data;
  return data + (totalImages === 0 ? 50 : Math.floor(50 * Math.min(settledImages, totalImages) / totalImages));
}

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
  const displayedProgress = useRef(0);

  useEffect(() => {
    if (completed) return;
    const overlay = document.getElementById("customer-loading");
    const site = document.querySelector<HTMLElement>(".customer-site");
    if (!overlay || !site) return;
    site.inert = true;
    site.setAttribute("aria-busy", "true");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ring = overlay.querySelector<SVGCircleElement>(".customer-loading-ring");
    const percentage = overlay.querySelector<HTMLElement>(".customer-loading-percentage");
    const progressbar = overlay.querySelector<HTMLElement>("[role=progressbar]");
    let progressFrame = 0;
    let target = displayedProgress.current;
    const paint = (value: number) => {
      displayedProgress.current = value;
      if (ring) ring.style.strokeDashoffset = String(100 - value);
      if (percentage) percentage.textContent = `${Math.floor(value)}%`;
      progressbar?.setAttribute("aria-valuenow", String(Math.floor(value)));
    };
    const updateProgress = (value: number) => {
      target = Math.max(target, value);
      cancelAnimationFrame(progressFrame);
      if (reducedMotion || value === 100) { paint(target); return; }
      const from = displayedProgress.current;
      const started = performance.now();
      const animate = (now: number) => {
        const fraction = Math.min(1, (now - started) / 300);
        paint(from + (target - from) * (1 - Math.pow(1 - fraction, 3)));
        if (fraction < 1) progressFrame = requestAnimationFrame(animate);
      };
      progressFrame = requestAnimationFrame(animate);
    };
    updateProgress(loadingProgress(ready, !pageLoading));
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
      if (reducedMotion) remove();
      else window.setTimeout(remove, 240);
    };
    // Failed networks must never trap customers behind a permanent screen.
    const deadline = window.setTimeout(dismiss, 12000);
    let alive = true;
    let frame = 0;
    if (ready && !pageLoading) {
      frame = requestAnimationFrame(() => {
        const images = essentialImages(site);
        let settledImages = 0;
        updateProgress(loadingProgress(true, true, 0, images.length));
        void Promise.all(images.map(image => waitForImage(image).then(() => {
          settledImages += 1;
          if (alive) updateProgress(loadingProgress(true, true, settledImages, images.length));
        }))).then(() => {
          if (alive) { updateProgress(100); dismiss(); }
        });
      });
    }
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(progressFrame);
      window.clearTimeout(deadline);
      site.inert = false;
      site.removeAttribute("aria-busy");
    };
  }, [ready, pageLoading]);

  return <PageLoadingContext.Provider value={setPageLoading}>{children}</PageLoadingContext.Provider>;
}