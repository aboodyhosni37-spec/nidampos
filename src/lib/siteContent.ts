// Customer website content, editable from the staff area (Website Editor).
// Stored as one structured record in the existing database (site_content row "default").
// Product / menu data is NOT duplicated here — it keeps using the existing product system.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/cafe-hero.jpg";
import aboutImg from "@/assets/cafe-about.jpg";

export type Highlight = { title: string; text: string };

export type SiteContent = {
  brand: {
    name: string;
    tagline: string;
    logo_url: string;
    favicon_url: string;
  };
  contact: {
    phone: string;
    email: string;
    address: string;
    hours_label: string;
    hours_value: string;
    facebook: string;
    instagram: string;
    whatsapp: string;
  };
  home: {
    hero_badge: string;
    hero_title: string;
    hero_subtitle: string;
    hero_description: string;
    hero_image: string;
    primary_cta_label: string;
    primary_cta_href: string;
    secondary_cta_label: string;
    secondary_cta_href: string;
    highlights: Highlight[];
    featured_eyebrow: string;
    featured_title: string;
    about_eyebrow: string;
    about_title: string;
    about_text: string;
    about_image: string;
    cta_title: string;
    cta_text: string;
    cta_button_label: string;
    footer_text: string;
  };
  about: {
    hero_image: string;
    title: string;
    intro: string;
    story_title: string;
    story_text: string;
    story_text_2: string;
    image: string;
    values_title: string;
    values: Highlight[];
  };
  menu: {
    eyebrow: string;
    title: string;
    description: string;
    show_images: boolean;
    show_categories: boolean;
  };
  contact_page: {
    title: string;
    description: string;
    cta_title: string;
    cta_text: string;
    image: string;
  };
};

export const DEFAULT_SITE_CONTENT: SiteContent = {
  brand: {
    name: "LamaHamar Cafe",
    tagline: "Cafe",
    logo_url: "",
    favicon_url: "",
  },
  contact: {
    phone: "+252 619105454",
    email: "lamahamar@gmail.com",
    address: "Mogadishu, Somalia",
    hours_label: "Every day",
    hours_value: "6:00 AM – 10:00 PM",
    facebook: "",
    instagram: "",
    whatsapp: "",
  },
  home: {
    hero_badge: "Fresh · Local · Roasted daily",
    hero_title: "LamaHamar Cafe",
    hero_subtitle:
      "A warm corner of Mogadishu for great coffee, fresh food and unhurried conversation.",
    hero_description:
      "Browse the full menu, build your order in seconds, and choose delivery to your door or dine-in at your table.",
    hero_image: heroImg,
    primary_cta_label: "Order Now",
    primary_cta_href: "/menu",
    secondary_cta_label: "Our story",
    secondary_cta_href: "/about",
    highlights: [
      { title: "Freshly brewed", text: "Beans roasted and ground daily." },
      { title: "Fast delivery", text: "Hot orders across the city." },
      { title: "Open every day", text: "6:00 AM – 10:00 PM." },
    ],
    featured_eyebrow: "Popular right now",
    featured_title: "Featured favourites",
    about_eyebrow: "About us",
    about_title: "Made by hand, served with care",
    about_text:
      "LamaHamar Cafe started with one espresso machine and a simple idea: good coffee should feel like a small daily luxury. Today our kitchen serves breakfast, light lunches, pastries and cold drinks — all prepared fresh to order.",
    about_image: aboutImg,
    cta_title: "Hungry? Order in a few taps.",
    cta_text:
      "Delivery across the city or dine-in at your table — pay when your order arrives.",
    cta_button_label: "Start your order",
    footer_text: "Freshly brewed coffee, honest food and a warm welcome — every single day.",
  },
  about: {
    hero_image: heroImg,
    title: "Our story",
    intro:
      "LamaHamar Cafe is a neighbourhood cafe in Mogadishu built around great coffee, honest food and generous hospitality.",
    story_title: "From one machine to a full kitchen",
    story_text:
      "We opened with a single espresso machine, a short menu and a lot of patience. Guests kept coming back and asking for more, so the kitchen grew: breakfasts, sandwiches, salads, fresh juices, pastries and desserts made in-house.",
    story_text_2:
      "Today the cafe serves hundreds of guests every week, both at our tables and through delivery across the city. What has not changed is how we work — small batches, fresh ingredients and a proper welcome.",
    image: aboutImg,
    values_title: "What we care about",
    values: [
      { title: "Quality first", text: "Beans and produce chosen carefully, prepared fresh to order." },
      { title: "Local & fresh", text: "We buy locally whenever we can and waste as little as possible." },
      { title: "Warm service", text: "Every guest is greeted like a regular, because most become one." },
      { title: "A place to gather", text: "Room to work, meet friends or simply sit with a good cup." },
    ],
  },
  menu: {
    eyebrow: "Our menu",
    title: "Everything we serve",
    description:
      "Browse by category or search for what you are craving, then add it straight to your order.",
    show_images: true,
    show_categories: true,
  },
  contact_page: {
    title: "Come say hello",
    description:
      "Questions about an order, a booking or a large group? Call us or drop by the cafe — we are happy to help.",
    cta_title: "Ready to order?",
    cta_text:
      "Delivery to your door or dine-in at your table — build your order online and pay on arrival.",
    image: "",
  },
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

/** Merge stored content over the defaults so new fields never break the site. */
export const mergeContent = (stored: unknown): SiteContent => {
  const out: any = structuredClone(DEFAULT_SITE_CONTENT);
  if (!isPlainObject(stored)) return out;
  for (const [section, value] of Object.entries(stored)) {
    if (!(section in out)) continue;
    if (isPlainObject(value) && isPlainObject(out[section])) {
      for (const [k, v] of Object.entries(value)) {
        if (!(k in out[section])) continue;
        if (v === null || v === undefined) continue;
        out[section][k] = v;
      }
    }
  }
  return out as SiteContent;
};

let cache: SiteContent | null = null;
export const getCachedContent = (): SiteContent => cache ?? DEFAULT_SITE_CONTENT;

export const fetchSiteContent = async (): Promise<SiteContent> => {
  const { data, error } = await supabase
    .from("site_content")
    .select("content")
    .eq("id", "default")
    .maybeSingle();
  if (error) throw error;
  const merged = mergeContent((data as any)?.content);
  cache = merged;
  return merged;
};

export const saveSiteContent = async (content: SiteContent): Promise<void> => {
  const { error } = await supabase
    .from("site_content")
    .upsert({ id: "default", content: content as any });
  if (error) throw error;
  cache = content;
  window.dispatchEvent(new CustomEvent("site-content-updated"));
};

/** Images live in the existing public storage bucket, under a website/ folder. */
export const uploadSiteImage = async (file: File): Promise<string> => {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `website/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("staff-photos")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("staff-photos").getPublicUrl(path);
  return data.publicUrl;
};

/** Live website content for customer-facing pages. */
export const useSiteContent = (): SiteContent => {
  const [content, setContent] = useState<SiteContent>(() => getCachedContent());

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetchSiteContent()
        .then((c) => alive && setContent(c))
        .catch(() => {});
    };
    load();
    window.addEventListener("site-content-updated", load);
    return () => {
      alive = false;
      window.removeEventListener("site-content-updated", load);
    };
  }, []);

  return content;
};
