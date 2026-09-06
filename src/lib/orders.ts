// Single source of truth for orders is Supabase `invoices` (+ `invoice_items`).
// This module exposes a thin async API used by Orders.tsx and a small in-memory
// helper for the POS receipt preview after placement.
import { supabase } from "@/integrations/supabase/client";

export type OrderItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

export type OrderPaymentMethod =
  | "Cash"
  | "Card"
  | "Mobile"
  | "EVC-Plus"
  | "Premier Wallet"
  | "E-Dahab"
  | "Due"
  | "Split";

export type OrderWorkflowStatus = "Pending" | "Preparing" | "Completed" | "Unpaid";

export type Order = {
  id: string;
  number: number;
  items: OrderItem[];
  subtotal?: number;
  discount?: number;
  tax?: number;
  taxRate?: number;
  taxInclusive?: boolean;
  currencySymbol?: string;
  total: number;
  table: string;
  customer?: string;
  paymentMethod: OrderPaymentMethod;
  paidAmount?: number;
  dueAmount?: number;
  createdAt: string;
  status: "completed" | "pending";
  orderStatus?: OrderWorkflowStatus;
  notes?: string;
  rewardApplied?: "none" | "half_off" | "free_lunch";
};

// Fetch all orders from the database (joined with items). Used by Orders page.
export const fetchOrders = async (): Promise<Order[]> => {
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select(
      "id, number, total, paid_amount, due_amount, table_label, customer_name, payment_method, status, order_status, created_at, invoice_items(id, name, price, qty, product_id)"
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (invoices ?? []).map((inv: any) => ({
    id: inv.id,
    number: inv.number,
    items: (inv.invoice_items ?? []).map((it: any) => ({
      id: it.product_id || it.id,
      name: it.name,
      price: Number(it.price),
      qty: Number(it.qty),
    })),
    total: Number(inv.total),
    table: inv.table_label || "—",
    customer: inv.customer_name || undefined,
    paymentMethod: inv.payment_method,
    paidAmount: Number(inv.paid_amount || 0),
    dueAmount: Number(inv.due_amount || 0),
    createdAt: inv.created_at,
    status: inv.status === "completed" ? "completed" : "pending",
    orderStatus: (inv.order_status as OrderWorkflowStatus) || "Completed",
  }));
};

// Update server-side workflow status. Realtime listeners refresh UIs.
export const updateOrderStatus = async (id: string, orderStatus: OrderWorkflowStatus) => {
  const { error } = await supabase
    .from("invoices")
    .update({ order_status: orderStatus })
    .eq("id", id);
  if (error) throw error;
};

// ----- legacy local helpers (kept for backward-compat with POS receipt flow) -----
const KEY = "nidam_pos_orders";
export const loadOrders = (): Order[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};
export const saveOrders = (orders: Order[]) => {
  localStorage.setItem(KEY, JSON.stringify(orders));
};
export const addOrder = (order: Order) => {
  const all = loadOrders();
  all.unshift(order);
  saveOrders(all.slice(0, 50));
};
