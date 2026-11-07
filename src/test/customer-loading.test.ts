import { afterEach, describe, expect, it, vi } from "vitest";
import { essentialImages, waitForImage } from "@/lib/customerLoading";

afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ""; });

describe("customer startup image readiness", () => {
  it("waits for a pending image to load", async () => {
    const image = document.createElement("img");
    Object.defineProperty(image, "complete", { value: false });
    let settled = false;
    const pending = waitForImage(image).then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);
    image.dispatchEvent(new Event("load"));
    await pending;
    expect(settled).toBe(true);
  });

  it("does not trap visitors when an image fails", async () => {
    const image = document.createElement("img");
    Object.defineProperty(image, "complete", { value: false });
    const pending = waitForImage(image);
    image.dispatchEvent(new Event("error"));
    await expect(pending).resolves.toBeUndefined();
  });

  it("does not wait again for an already complete image", async () => {
    const image = document.createElement("img");
    Object.defineProperty(image, "complete", { value: true });
    await expect(waitForImage(image)).resolves.toBeUndefined();
  });

  it("waits only for visible first-viewport images, not the whole lazy menu", () => {
    const root = document.createElement("div");
    const visible = document.createElement("img");
    const belowFold = document.createElement("img");
    const hidden = document.createElement("img");
    root.append(visible, belowFold, hidden);
    vi.spyOn(visible, "getBoundingClientRect").mockReturnValue({ top: 30, bottom: 130, width: 100, height: 100 } as DOMRect);
    vi.spyOn(belowFold, "getBoundingClientRect").mockReturnValue({ top: window.innerHeight + 20, bottom: window.innerHeight + 120, width: 100, height: 100 } as DOMRect);
    vi.spyOn(hidden, "getBoundingClientRect").mockReturnValue({ top: 0, bottom: 0, width: 0, height: 0 } as DOMRect);
    expect(essentialImages(root)).toEqual([visible]);
  });
});