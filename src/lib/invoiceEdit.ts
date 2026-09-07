// Staff-side order maintenance: merge open orders and edit orders that still
// have an outstanding balance. Payment history is never modified or deleted —
// paid amounts are always recomputed from the existing `payments` rows.
import { supabase } from "@/integrations/supabase/client";

export type EditableItem = {
  id?: string; // invoice_items.id (absent for newly added lines)
  product_id: string | null;
  name: string;
  price: number;
  qty: number;
};

export type InvoiceDetail = {
  id: string;
  number: number;
  customer_id: string | null;
  customer_name: string | null;
  table_label: string | null;
  subtotal: number;
  total: number;
  paid_amount: number;
  due_amount: number;
  payment_method: string;
  order_status: string;
  created_at: string;
  items: EditableItem[];
};

const sumPayments = async (invoiceId: string) => {
  const { data, error } = await supabase
    .from("payments")
    .select("amount, method")
    .eq("invoice_id", invoiceId);
  if (error) throw error;
  return (data ?? [])
    .filter((p: any) => p.method !== "Due")
    .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
};

export const fetchInvoiceDetail = async (id: string): Promise<InvoiceDetail> => {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, number, customer_id, customer_name, table_label, subtotal, total, paid_amount, due_amount, payment_method, order_status, created_at, invoice_items(id, product_id, name, price, qty)"
    )
    .eq("id", id)
    .single();
  if (error) throw error;
  const inv: any = data;
  return {
    ...inv,
    subtotal: Number(inv.subtotal || 0),
    total: Number(inv.total || 0),
    paid_amount: Number(inv.paid_amount || 0),
    due_amount: Number(inv.due_amount || 0),
    items: (inv.invoice_items ?? []).map((it: any) => ({
      id: it.id,
      product_id: it.product_id ?? null,
      name: it.name,
      price: Number(it.price),
      qty: Number(it.qty),
    })),
  };
};

// Keep the customer's running balance in sync with a change in an invoice's due.
const syncCustomerDue = async (
  customerId: string | null,
  invoiceId: string,
  delta: number,
  note: string
) => {
  if (!customerId || Math.abs(delta) < 0.005) return;
  const { error } = await supabase.from("due_transactions").insert({
    customer_id: customerId,
    invoice_id: invoiceId,
    type: delta > 0 ? "charge" : "repayment",
    amount: Math.abs(delta),
    method: "Due",
    note,
  });
  if (error) throw error;
};

/**
 * Replace the item lines of an existing order and recalculate its totals.
 * Payments already taken stay untouched: paid is re-derived from the payments
 * table and only the remaining due changes.
 */
export const saveInvoiceItems = async (
  invoiceId: string,
  items: EditableItem[]
): Promise<{ total: number; paid: number; due: number; status: string }> => {
  const clean = items.filter((i) => i.qty > 0);
  if (clean.length === 0) throw new Error("An order must keep at least one item.");

  const before = await fetchInvoiceDetail(invoiceId);
  const paid = await sumPayments(invoiceId);
  const total = clean.reduce((s, i) => s + i.price * i.qty, 0);
  const due = Math.max(0, Number((total - paid).toFixed(2)));
  const status = due > 0 ? "Unpaid" : "Completed";

  // Rewrite the lines (items only — never payments).
  const { error: delErr } = await supabase
    .from("invoice_items")
    .delete()
    .eq("invoice_id", invoiceId);
  if (delErr) throw delErr;

  const { error: insErr } = await supabase.from("invoice_items").insert(
    clean.map((i) => ({
      invoice_id: invoiceId,
      product_id: i.product_id,
      name: i.name,
      price: i.price,
      qty: i.qty,
    }))
  );
  if (insErr) throw insErr;

  const { error: updErr } = await supabase
    .from("invoices")
    .update({
      subtotal: total,
      total,
      paid_amount: paid,
      due_amount: due,
      order_status: status,
    })
    .eq("id", invoiceId);
  if (updErr) throw updErr;

  await syncCustomerDue(
    before.customer_id,
    invoiceId,
    due - before.due_amount,
    `Order #${before.number} edited`
  );

  return { total, paid, due, status };
};

/**
 * Merge several open orders into the oldest one. Identical products are
 * combined by quantity, payments from every order are re-pointed at the
 * surviving order (never duplicated), and totals/due are recalculated.
 */
export const mergeInvoices = async (
  invoiceIds: string[]
): Promise<{ targetId: string; number: number; total: number; paid: number; due: number }> => {
  if (invoiceIds.length < 2) throw new Error("Select at least two orders to merge.");

  const details = await Promise.all(invoiceIds.map(fetchInvoiceDetail));
  const sorted = [...details].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const target = sorted[0];
  const sources = sorted.slice(1);

  // Combine identical products (same name + price).
  const map = new Map<string, EditableItem>();
  sorted.forEach((inv) =>
    inv.items.forEach((it) => {
      const key = `${it.name}|${it.price}`;
      const hit = map.get(key);
      if (hit) hit.qty += it.qty;
      else map.set(key, { ...it, id: undefined });
    })
  );
  const items = [...map.values()];
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  // Move payment history onto the surviving order (no new payment rows).
  for (const src of sources) {
    const { error } = await supabase
      .from("payments")
      .update({ invoice_id: target.id })
      .eq("invoice_id", src.id);
    if (error) throw error;
    const { error: dueErr } = await supabase
      .from("due_transactions")
      .update({ invoice_id: target.id })
      .eq("invoice_id", src.id);
    if (dueErr) throw dueErr;
  }

  const paid = await sumPayments(target.id);
  const due = Math.max(0, Number((total - paid).toFixed(2)));

  // Rewrite the surviving order's lines.
  const { error: delItems } = await supabase
    .from("invoice_items")
    .delete()
    .eq("invoice_id", target.id);
  if (delItems) throw delItems;
  const { error: insItems } = await supabase.from("invoice_items").insert(
    items.map((i) => ({
      invoice_id: target.id,
      product_id: i.product_id,
      name: i.name,
      price: i.price,
      qty: i.qty,
    }))
  );
  if (insItems) throw insItems;

  const mergedFrom = sources.map((s) => `#${s.number}`).join(", ");
  const { error: updErr } = await supabase
    .from("invoices")
    .update({
      subtotal: total,
      total,
      paid_amount: paid,
      due_amount: due,
      order_status: due > 0 ? "Unpaid" : "Completed",
      customer_name:
        target.customer_name ?? sources.find((s) => s.customer_name)?.customer_name ?? null,
      customer_id: target.customer_id ?? sources.find((s) => s.customer_id)?.customer_id ?? null,
      table_label: target.table_label ?? sources.find((s) => s.table_label)?.table_label ?? null,
    })
    .eq("id", target.id);
  if (updErr) throw updErr;

  // Remove the now-empty source orders (their items go with them; payments and
  // due history were already moved above).
  for (const src of sources) {
    const { error: delSrcItems } = await supabase
      .from("invoice_items")
      .delete()
      .eq("invoice_id", src.id);
    if (delSrcItems) throw delSrcItems;
    const { error: delSrc } = await supabase.from("invoices").delete().eq("id", src.id);
    if (delSrc) throw delSrc;
  }

  await syncCustomerDue(
    target.customer_id,
    target.id,
    due - details.reduce((s, d) => s + d.due_amount, 0),
    `Orders ${mergedFrom} merged into #${target.number}`
  );

  return { targetId: target.id, number: target.number, total, paid, due };
};
