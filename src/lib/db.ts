import { supabase } from "@/integrations/supabase/client";

export type PaymentMethod =
  | "Cash"
  | "Card"
  | "EVC-Plus"
  | "Premier Wallet"
  | "E-Dahab"
  | "Due"
  | "Split";

export const MOBILE_METHODS: PaymentMethod[] = ["EVC-Plus", "Premier Wallet", "E-Dahab"];
export const ALL_PAYMENT_METHODS: PaymentMethod[] = [
  "Cash",
  "EVC-Plus",
  "Premier Wallet",
  "E-Dahab",
  "Card",
  "Due",
];

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  due_balance: number;
  total_spent: number;
  loyalty_points: number;
  rewards_claimed?: number;
  reward_status: "none" | "half_off" | "free_lunch" | string;
  created_at: string;
};

export type DbInvoiceItem = {
  product_id?: string | null;
  name: string;
  price: number;
  qty: number;
};

export type CreateInvoiceInput = {
  table_label: string;
  customer_id?: string | null;
  customer_name?: string | null;
  items: DbInvoiceItem[];
  subtotal?: number;
  discount?: number;
  tax?: number;
  total: number;
  payment_method: PaymentMethod; // top-level summary
  payments: { method: PaymentMethod; amount: number; reference?: string }[];
};

export type CreatedInvoice = {
  id: string;
  number: number;
  paid_amount: number;
  due_amount: number;
};

export const listCustomers = async (): Promise<Customer[]> => {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Customer[];
};

export const createCustomer = async (input: {
  name: string;
  phone?: string;
  address?: string;
}): Promise<Customer> => {
  const { data, error } = await supabase
    .from("customers")
    .insert({
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      address: input.address?.trim() || null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Customer;
};

export const createInvoice = async (
  input: CreateInvoiceInput
): Promise<CreatedInvoice & { order_status: string }> => {
  const paidAmount = input.payments
    .filter((p) => p.method !== "Due")
    .reduce((s, p) => s + p.amount, 0);
  const dueAmount = input.payments
    .filter((p) => p.method === "Due")
    .reduce((s, p) => s + p.amount, 0);

  // Walk-in due is allowed (no customer required). Customer is optional for tracking.

  const orderStatus = dueAmount > 0 ? "Unpaid" : "Pending";

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      customer_id: input.customer_id ?? null,
      customer_name: input.customer_name ?? null,
      table_label: input.table_label,
      subtotal: input.subtotal ?? input.total,
      total: input.total,
      paid_amount: paidAmount,
      due_amount: dueAmount,
      payment_method: input.payment_method,
      status: "completed",
      order_status: orderStatus,
    })
    .select("id, number, order_status")
    .single();
  if (invErr) throw invErr;

  const items = input.items.map((it) => ({
    invoice_id: invoice.id,
    product_id: it.product_id ?? null,
    name: it.name,
    price: it.price,
    qty: it.qty,
  }));
  const { error: itemsErr } = await supabase.from("invoice_items").insert(items);
  if (itemsErr) throw itemsErr;

  const paymentsRows = input.payments.map((p) => ({
    invoice_id: invoice.id,
    method: p.method,
    amount: p.amount,
    reference: p.reference ?? null,
  }));
  const { error: payErr } = await supabase.from("payments").insert(paymentsRows);
  if (payErr) throw payErr;

  if (dueAmount > 0 && input.customer_id) {
    const { error: dueErr } = await supabase.from("due_transactions").insert({
      customer_id: input.customer_id,
      invoice_id: invoice.id,
      type: "charge",
      amount: dueAmount,
      method: "Due",
      note: `Invoice #${invoice.number}`,
    });
    if (dueErr) throw dueErr;
  }

  return {
    id: invoice.id as string,
    number: invoice.number as number,
    paid_amount: paidAmount,
    due_amount: dueAmount,
    order_status: (invoice as any).order_status as string,
  };
};

export const updateInvoiceOrderStatus = async (
  id: string,
  status: "Pending" | "Preparing" | "Completed" | "Unpaid"
) => {
  const { error } = await supabase
    .from("invoices")
    .update({ order_status: status })
    .eq("id", id);
  if (error) throw error;
};

export type DashboardStats = {
  totalSalesToday: number;
  ordersToday: number;
  pendingOrders: number;
  totalDue: number;
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const VOID = ["cancelled", "canceled", "void", "voided", "refunded"];
  const live = (i: any) =>
    !VOID.includes(String(i.status ?? "").toLowerCase()) &&
    !VOID.includes(String(i.order_status ?? "").toLowerCase());

  const { data: today, error: e1 } = await supabase
    .from("invoices")
    .select("id, paid_amount, total, status, order_status, created_at")
    .gte("created_at", startOfDay.toISOString());
  if (e1) throw e1;

  const todayLive = (today ?? []).filter(live);
  // Sales = value of the orders placed today (not just the cash collected).
  const totalSalesToday = todayLive.reduce((s: number, i: any) => s + Number(i.total || 0), 0);
  const ordersToday = todayLive.length;

  const { data: pending, error: e2 } = await supabase
    .from("invoices")
    .select("id, status, order_status")
    .in("order_status", ["Pending", "Preparing"]);
  if (e2) throw e2;

  // Outstanding due across all open invoices: total - paid, never negative.
  const { data: dueRows, error: e3 } = await supabase
    .from("invoices")
    .select("total, paid_amount, status, order_status")
    .gt("due_amount", 0);
  if (e3) throw e3;

  const totalDue = (dueRows ?? [])
    .filter(live)
    .reduce(
      (s: number, i: any) => s + Math.max(0, Number(i.total || 0) - Number(i.paid_amount || 0)),
      0
    );

  return {
    totalSalesToday,
    ordersToday,
    pendingOrders: (pending ?? []).filter(live).length,
    totalDue,
  };
};


export type DueTransaction = {
  id: string;
  customer_id: string;
  invoice_id: string | null;
  type: "charge" | "repayment";
  amount: number;
  method: PaymentMethod | null;
  note: string | null;
  created_at: string;
};

export const listCustomerDueHistory = async (
  customerId: string
): Promise<DueTransaction[]> => {
  const { data, error } = await supabase
    .from("due_transactions")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DueTransaction[];
};

export const recordRepayment = async (input: {
  customer_id: string;
  amount: number;
  method: Exclude<PaymentMethod, "Due" | "Split">;
  note?: string;
}) => {
  const { error } = await supabase.from("due_transactions").insert({
    customer_id: input.customer_id,
    type: "repayment",
    amount: input.amount,
    method: input.method,
    note: input.note ?? "Repayment",
  });
  if (error) throw error;
};

export type UnpaidInvoice = {
  id: string;
  number: number;
  total: number;
  due_amount: number;
  paid_amount: number;
  table_label: string | null;
  customer_id: string | null;
  customer_name: string | null;
  payment_method: PaymentMethod;
  order_status: string;
  created_at: string;
};

export const listUnpaidInvoices = async (): Promise<UnpaidInvoice[]> => {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, number, total, due_amount, paid_amount, table_label, customer_id, customer_name, payment_method, order_status, created_at"
    )
    .or("order_status.eq.Unpaid,due_amount.gt.0")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as UnpaidInvoice[];
};

// Pay an unpaid invoice (settle the due) using a mobile/cash method.
export const payUnpaidInvoice = async (input: {
  invoice_id: string;
  amount: number;
  method: Exclude<PaymentMethod, "Due" | "Split">;
  customer_id?: string | null;
}) => {
  const { invoice_id, amount, method, customer_id } = input;

  const { error: payErr } = await supabase.from("payments").insert({
    invoice_id,
    method,
    amount,
    reference: "Pay-now (settle due)",
  });
  if (payErr) throw payErr;

  if (customer_id) {
    const { error: dueErr } = await supabase.from("due_transactions").insert({
      customer_id,
      invoice_id,
      type: "repayment",
      amount,
      method,
      note: "Settled via Orders > Pay Now",
    });
    if (dueErr) throw dueErr;
  }

  // Update invoice totals + status
  const { data: inv, error: getErr } = await supabase
    .from("invoices")
    .select("paid_amount, due_amount, total")
    .eq("id", invoice_id)
    .single();
  if (getErr) throw getErr;

  const newPaid = Number(inv.paid_amount || 0) + amount;
  const newDue = Math.max(0, Number(inv.due_amount || 0) - amount);
  const newStatus = newDue <= 0 ? "Completed" : "Unpaid";

  const { error: updErr } = await supabase
    .from("invoices")
    .update({
      paid_amount: newPaid,
      due_amount: newDue,
      payment_method: method,
      order_status: newStatus,
    })
    .eq("id", invoice_id);
  if (updErr) throw updErr;

  return { paid: newPaid, due: newDue, status: newStatus };
};

// Delete customer ONLY if no due remains.
export const deleteCustomer = async (id: string) => {
  const { data, error } = await supabase
    .from("customers")
    .select("due_balance")
    .eq("id", id)
    .single();
  if (error) throw error;
  if (Number(data?.due_balance || 0) > 0) {
    throw new Error("Cannot delete: customer has an outstanding balance.");
  }
  const { error: delErr } = await supabase.from("customers").delete().eq("id", id);
  if (delErr) throw delErr;
};

// Link an existing unpaid/partially-paid invoice to a customer so its outstanding
// balance is tracked under that customer's due. Never creates a customer or an
// invoice, and never adds a second charge for the same invoice.
export const assignInvoiceToCustomer = async (
  invoiceId: string,
  customerId: string
) => {
  const { data: customer, error: cErr } = await supabase
    .from("customers")
    .select("id, name")
    .eq("id", customerId)
    .single();
  if (cErr) throw cErr;

  const { data: inv, error: iErr } = await supabase
    .from("invoices")
    .select("id, number, total, paid_amount, due_amount, customer_id")
    .eq("id", invoiceId)
    .single();
  if (iErr) throw iErr;

  const outstanding = Math.max(
    0,
    Number(inv.due_amount || 0) > 0
      ? Number(inv.due_amount)
      : Number(inv.total || 0) - Number(inv.paid_amount || 0)
  );
  if (outstanding <= 0) throw new Error("This order has no outstanding balance.");

  const { error: updErr } = await supabase
    .from("invoices")
    .update({
      customer_id: customer.id,
      customer_name: customer.name,
      due_amount: outstanding,
      order_status: "Unpaid",
    })
    .eq("id", invoiceId);
  if (updErr) throw updErr;

  // Only add the due charge if this invoice was not already charged to someone.
  const { data: existing, error: exErr } = await supabase
    .from("due_transactions")
    .select("id, customer_id, type")
    .eq("invoice_id", invoiceId)
    .eq("type", "charge");
  if (exErr) throw exErr;

  if (!existing || existing.length === 0) {
    const { error: dueErr } = await supabase.from("due_transactions").insert({
      customer_id: customer.id,
      invoice_id: invoiceId,
      type: "charge",
      amount: outstanding,
      method: "Due",
      note: `Invoice #${inv.number} assigned to customer`,
    });
    if (dueErr) throw dueErr;
  }

  return { customer_id: customer.id, customer_name: customer.name, due: outstanding };
};

// Update name/phone (NOT financial history).
export const updateCustomer = async (
  id: string,
  patch: { name?: string; phone?: string | null; address?: string | null }
) => {
  const { error } = await supabase.from("customers").update(patch).eq("id", id);
  if (error) throw error;
};

export type InvoiceWithItems = UnpaidInvoice & {
  customer_phone: string | null;
  customer_address: string | null;
  order_type: string | null;
  delivery_fee: number;
  subtotal: number;
  source: string | null;
  invoice_items: {
    name: string;
    price: number;
    qty: number;
    product_id: string | null;
  }[];
  payments: {
    method: PaymentMethod;
    amount: number;
    created_at: string;
  }[];
};

export const getInvoiceWithItems = async (id: string): Promise<InvoiceWithItems> => {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, number, total, paid_amount, due_amount, table_label, customer_id, customer_name, customer_phone, customer_address, order_type, delivery_fee, subtotal, source, payment_method, order_status, created_at, invoice_items(name, price, qty, product_id), payments(method, amount, created_at)"
    )
    .eq("id", id)
    .single();
  if (error) throw error;
  return {
    ...(data as any),
    invoice_items: ((data as any).invoice_items ?? []).map((it: any) => ({
      name: it.name,
      price: Number(it.price || 0),
      qty: Number(it.qty || 0),
      product_id: it.product_id ?? null,
    })),
    payments: ((data as any).payments ?? []).map((p: any) => ({
      method: p.method as PaymentMethod,
      amount: Number(p.amount || 0),
      created_at: p.created_at,
    })),
  } as InvoiceWithItems;
};


