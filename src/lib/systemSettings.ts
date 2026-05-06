import { supabase } from "@/integrations/supabase/client";

export type Currency = "USD" | "SOS";

export type SystemSettings = {
  currency_code: Currency;
  currency_symbol: string;
  tax_enabled: boolean;
  tax_rate: number; // percentage e.g. 5 means 5%
  tax_inclusive: boolean;
};

export const DEFAULT_SETTINGS: SystemSettings = {
  currency_code: "USD",
  currency_symbol: "$",
  tax_enabled: false,
  tax_rate: 0,
  tax_inclusive: false,
};

const CACHE_KEY = "nidam_system_settings";

let cache: SystemSettings | null = null;
const listeners = new Set<(s: SystemSettings) => void>();

export const getCachedSettings = (): SystemSettings => {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      cache = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      return cache!;
    }
  } catch {}
  return DEFAULT_SETTINGS;
};

export const subscribeSettings = (cb: (s: SystemSettings) => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

const broadcast = (s: SystemSettings) => {
  cache = s;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(s));
  } catch {}
  listeners.forEach((l) => l(s));
};

export const fetchSettings = async (): Promise<SystemSettings> => {
  const { data, error } = await supabase
    .from("system_settings")
    .select("currency_code, currency_symbol, tax_enabled, tax_rate, tax_inclusive")
    .eq("id", "default")
    .maybeSingle();
  if (error) throw error;
  const merged: SystemSettings = data
    ? {
        currency_code: (data.currency_code as Currency) ?? "USD",
        currency_symbol: data.currency_symbol ?? "$",
        tax_enabled: !!data.tax_enabled,
        tax_rate: Number(data.tax_rate) || 0,
        tax_inclusive: !!data.tax_inclusive,
      }
    : { ...DEFAULT_SETTINGS };
  broadcast(merged);
  return merged;
};

export const saveSettings = async (s: SystemSettings) => {
  const { error } = await supabase
    .from("system_settings")
    .upsert({ id: "default", ...s, updated_at: new Date().toISOString() });
  if (error) throw error;
  broadcast(s);
};

// ----- money helpers -----
export const formatMoney = (amount: number, s: SystemSettings = getCachedSettings()) => {
  const n = Number(amount || 0);
  if (s.currency_code === "SOS") {
    return `${s.currency_symbol}${Math.round(n).toLocaleString()}`;
  }
  return `${s.currency_symbol}${n.toFixed(2)}`;
};

export type DiscountInput = {
  type: "none" | "percent" | "fixed";
  value: number;
};

export type Totals = {
  subtotal: number;
  discount: number;
  taxable: number;
  tax: number;
  total: number;
};

// Calculation order: Subtotal → Discount → Tax → Final Total
export const computeTotals = (
  subtotal: number,
  discount: DiscountInput,
  s: SystemSettings = getCachedSettings()
): Totals => {
  const sub = Math.max(0, Number(subtotal) || 0);
  let disc = 0;
  if (discount.type === "percent") {
    disc = (sub * Math.max(0, Math.min(100, discount.value))) / 100;
  } else if (discount.type === "fixed") {
    disc = Math.max(0, discount.value);
  }
  disc = Math.min(disc, sub); // cannot exceed subtotal
  const taxable = sub - disc;
  let tax = 0;
  let total = taxable;
  if (s.tax_enabled && s.tax_rate > 0) {
    if (s.tax_inclusive) {
      // Tax already inside the price
      tax = +(taxable - taxable / (1 + s.tax_rate / 100)).toFixed(2);
      total = taxable;
    } else {
      tax = +((taxable * s.tax_rate) / 100).toFixed(2);
      total = taxable + tax;
    }
  }
  return {
    subtotal: +sub.toFixed(2),
    discount: +disc.toFixed(2),
    taxable: +taxable.toFixed(2),
    tax: +tax.toFixed(2),
    total: +total.toFixed(2),
  };
};
