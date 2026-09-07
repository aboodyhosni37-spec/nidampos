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
  const [categories, products] = await Promise.all([listCategories(), listProducts()]);
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

export type OrderType = "DELIVERY" | "DINE-IN";

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
  address?: string;
  notes?: string;
  table_label?: string;
  items: CustomerCartLine[];
  delivery_fee: number;
  /** Stable per-checkout id — guarantees one checkout = one order. */
  client_ref: string;
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

const findOrCreateCustomer = async (name: string, phone: string, address?: string) => {
  const cleanPhone = phone.trim();
  if (cleanPhone) {
    const { data } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", cleanPhone)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }
  const { data, error } = await supabase
    .from("customers")
    .insert({
      name: name.trim() || "Online customer",
      phone: cleanPhone || null,
      address: address?.trim() || null,
    })
    .select("id")
    .single();
  if (error) return null;
  return data.id as string;
};

/**
 * Creates a customer order in the existing Staff POS order structure.
 *
 * Payment safety: the order is created as NOT PAID (payment method "Due",
 * paid 0). Nothing is ever marked paid from the customer website — staff
 * settle it in the POS once payment is actually confirmed.
 *
 * Duplicate safety: client_ref is unique in the database, so refreshes,
 * double-clicks and network retries can never create a second order.
 */
export const placeCustomerOrder = async (
  input: PlaceOrderInput
): Promise<PlacedOrder> => {
  if (input.items.length === 0) throw new Error("Your cart is empty.");
  await fetchSettings().catch(() => getCachedSettings());

  const deliveryFee = input.order_type === "DELIVERY" ? input.delivery_fee : 0;
  const totals = computeOrderTotals(input.items, deliveryFee);

  const existing = await supabase
    .from("invoices")
    .select("id, number, total")
    .eq("client_ref", input.client_ref)
    .maybeSingle();
  if (existing.data?.id) {
    return {
      id: existing.data.id as string,
      number: Number(existing.data.number),
      total: Number(existing.data.total),
      duplicate: true,
    };
  }

  const customerId = await findOrCreateCustomer(
    input.customer_name,
    input.phone,
    input.address
  );

  const payload: Record<string, unknown> = {
    customer_id: customerId,
    customer_name: input.customer_name.trim(),
    customer_phone: input.phone.trim() || null,
    customer_address: input.order_type === "DELIVERY" ? input.address?.trim() || null : null,
    notes: input.notes?.trim() || null,
    order_type: input.order_type,
    table_label:
      input.order_type === "DINE-IN" ? input.table_label ?? "Dine-in" : "Delivery",
    delivery_fee: totals.deliveryFee,
    subtotal: totals.subtotal,
    total: totals.total,
    paid_amount: 0,
    due_amount: totals.total,
    payment_method: "Due",
    status: "completed",
    order_status: "Pending",
    source: "online",
    client_ref: input.client_ref,
  };

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert(payload as never)
    .select("id, number, total")
    .single();

  if (error) {
    // Unique violation on client_ref => the order already exists.
    if ((error as { code?: string }).code === "23505") {
      const retry = await supabase
        .from("invoices")
        .select("id, number, total")
        .eq("client_ref", input.client_ref)
        .maybeSingle();
      if (retry.data?.id) {
        return {
          id: retry.data.id as string,
          number: Number(retry.data.number),
          total: Number(retry.data.total),
          duplicate: true,
        };
      }
    }
    throw error;
  }

  const items = input.items.map((it) => ({
    invoice_id: invoice.id,
    product_id: it.product_id,
    name: it.name,
    price: it.price,
    qty: it.qty,
  }));
  const { error: itemsErr } = await supabase.from("invoice_items").insert(items);
  if (itemsErr) throw itemsErr;

  // A single "Due" payment record: the amount owed, nothing marked as paid.
  const { error: payErr } = await supabase.from("payments").insert({
    invoice_id: invoice.id,
    method: "Due",
    amount: totals.total,
    reference: `Online order ${input.client_ref}`,
  });
  if (payErr) throw payErr;

  if (customerId) {
    await supabase.from("due_transactions").insert({
      customer_id: customerId,
      invoice_id: invoice.id,
      type: "charge",
      amount: totals.total,
      method: "Due",
      note: `Online order #${invoice.number}`,
    });
  }

  return {
    id: invoice.id as string,
    number: Number(invoice.number),
    total: totals.total,
    duplicate: false,
  };
};
