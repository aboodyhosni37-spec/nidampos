// Customer-facing storefront layer.
// READ-ONLY on the existing menu; orders are written into the SAME invoices /
// invoice_items / payments tables the Staff POS already uses.
import { supabase } from "@/integrations/supabase/client";
import { listCategories, listProducts, type DbCategory, type DbProduct } from "./menu";
import { computeTotals, fetchSettings, getCachedSettings } from "./systemSettings";

export type { DbCategory, DbProduct };

export const loadMenu = async (): Promise<{
  categories: DbCategory[];
  products: DbProduct[];
}> => {
  const [categories, products] = await Promise.all([
    listCategories(),
    listProducts({ visibleOn: "web" }),
  ]);
  return { categories, products };
};

export type StoreSettings = {
  delivery_fee: number;
  delivery_enabled: boolean;
};

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  delivery_fee: 0,
  delivery_enabled: true,
};

/** Delivery configuration lives on the existing system_settings row. */
export const fetchStoreSettings = async (): Promise<StoreSettings> => {
  const { data, error } = await supabase
    .from("system_settings")
    .select("*")
    .eq("id", "default")
    .maybeSingle();
  if (error) throw error;
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    delivery_fee: Number(row.delivery_fee ?? 0) || 0,
    delivery_enabled: row.delivery_enabled == null ? true : !!row.delivery_enabled,
  };
};

export type OrderType = "DELIVERY" | "DINE-IN" | "PICKUP";

// Banadir (Mogadishu) delivery districts. $1.00 in the four oldest core
// districts, $1.50 everywhere else in Banadir. The fee is derived from the
// selected district — customers can never edit it.
export const BANADIR_DISTRICTS = [
  "Xamar Weyne",
  "Shangani",
  "Xamar Jajab",
  "Waberi",
  "Abdulaziz",
  "Bondhere",
  "Daynile",
  "Dharkenley",
  "Hawl Wadag",
  "Hodan",
  "Karan",
  "Shibis",
  "Wadajir",
  "Wardhigley",
  "Yaqshid",
  "Gubadley",
  "Darusalam",
  "Kaxda",
] as const;

export const CORE_FEE_DISTRICTS = ["Xamar Weyne", "Shangani", "Xamar Jajab", "Waberi"];

export const deliveryFeeForDistrict = (district: string | undefined): number => {
  if (!district) return 0;
  return CORE_FEE_DISTRICTS.includes(district) ? 1.0 : 1.5;
};

export type CustomerCartLine = {
  product_id: string;
  name: string;
  price: number;
  qty: number;
};

export type PlaceOrderInput = {
  order_type: OrderType;
  customer_name: string;
  phone: string;
  district?: string;
  address?: string;
  notes?: string;
  table_label?: string;
  items: CustomerCartLine[];
  delivery_fee: number;
  /** Stable per-checkout id — guarantees one checkout = one order. */
  client_ref: string;
  tracking_token: string;
};

export type PlacedOrder = {
  id: string;
  number: number;
  total: number;
  duplicate: boolean;
};

export type OrderTotals = {
  subtotal: number;
  discount: number;
  tax: number;
  deliveryFee: number;
  total: number;
};

export const computeOrderTotals = (
  items: CustomerCartLine[],
  deliveryFee: number
): OrderTotals => {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const t = computeTotals(subtotal, { type: "none", value: 0 }, getCachedSettings());
  return {
    subtotal: t.subtotal,
    discount: t.discount,
    tax: t.tax,
    deliveryFee: +(deliveryFee || 0).toFixed(2),
    total: +(t.total + (deliveryFee || 0)).toFixed(2),
  };
};

/** Guest orders are priced and saved atomically by the server. */
export const placeCustomerOrder = async (input: PlaceOrderInput): Promise<PlacedOrder> => {
  const { data, error } = await supabase.functions.invoke("customer-orders", {
    body: {
      action: "checkout", client_ref: input.client_ref, tracking_token: input.tracking_token,
      order_type: input.order_type, customer_name: input.customer_name, phone: input.phone,
      district: input.district, address: input.address, notes: input.notes,
      table_label: input.table_label,
      items: input.items.map(item => ({ product_id: item.product_id, qty: item.qty })),
    },
  });
  if (error) {
    let message = "Could not send your order. Please try again.";
    try { const detail = await error.context?.json(); if (detail?.error) message = detail.error; } catch {}
    throw new Error(message);
  }
  return data as PlacedOrder;
};
