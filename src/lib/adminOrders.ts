// Admin/Owner-only order controls: delete an order, correct its order number.
// Every action is recorded in admin_audit_log.
import { supabase } from "@/integrations/supabase/client";
import { getSession } from "./auth";
import { reconcileCustomerDues } from "./db";
import { reconcileCustomerLoyalty } from "./loyalty";

export const RESTAURANT = "LamaHamar Cafe";

export const canAdminOrders = (): boolean => {
  const s = getSession();
  if (!s) return false;
  const role = String(s.role || "").toLowerCase();
  return role === "admin" || role === "owner" || !!s.permissions?.manage_users;
};

const requireAdmin = () => {
  if (!canAdminOrders()) throw new Error("Only Admin/Owner can do this.");
  return getSession()!;
};

const audit = async (row: Record<string, unknown>) => {
  const s = getSession();
  const { error } = await (supabase as any).from("admin_audit_log").insert({
    restaurant: RESTAURANT,
    performed_by_id: s?.id ?? null,
    performed_by_name: s?.name ?? null,
    performed_by_role: s?.role ?? null,
    ...row,
  });
  if (error) console.error("Audit log failed", error);
};

export const deleteOrder = async (invoiceId: string, reason?: string) => {
  requireAdmin();
  const { data: inv, error } = await supabase
    .from("invoices")
    .select("id, number, customer_id, customer_name, total, paid_amount, due_amount, created_at")
    .eq("id", invoiceId)
    .single();
  if (error) throw error;

  // Remove only records that belong to this order.
  const steps: [string, () => PromiseLike<{ error: any }>][] = [
    ["loyalty", () => supabase.from("loyalty_transactions").delete().eq("invoice_id", invoiceId)],
    ["due", () => supabase.from("due_transactions").delete().eq("invoice_id", invoiceId)],
    // Deposit history is kept; just unlink it from the deleted order.
    ["deposits", () => supabase.from("customer_deposits").update({ invoice_id: null }).eq("invoice_id", invoiceId)],
    ["payments", () => supabase.from("payments").delete().eq("invoice_id", invoiceId)],
    ["items", () => supabase.from("invoice_items").delete().eq("invoice_id", invoiceId)],
    ["order", () => supabase.from("invoices").delete().eq("id", invoiceId)],
  ];
  for (const [, run] of steps) {
    const { error: e } = await run();
    if (e) throw e;
  }

  await audit({
    action: "delete_order",
    invoice_id: invoiceId,
    old_number: inv.number,
    reason: reason?.trim() || null,
    details: {
      customer_id: inv.customer_id,
      customer_name: inv.customer_name,
      total: inv.total,
      paid_amount: inv.paid_amount,
      due_amount: inv.due_amount,
      created_at: inv.created_at,
    },
  });

  // Close the gap: renumber remaining orders sequentially and reset the counter.
  const { error: rErr } = await (supabase as any).rpc("resequence_invoice_numbers");
  if (rErr) console.error("Order renumbering failed", rErr);

  await reconcileCustomerDues().catch(() => {});
  if (inv.customer_id) await reconcileCustomerLoyalty(inv.customer_id).catch(() => {});
};

export const changeOrderNumber = async (invoiceId: string, newNumber: number) => {
  requireAdmin();
  if (!Number.isInteger(newNumber) || newNumber <= 0) throw new Error("Enter a valid positive order number.");
  const { data: inv, error } = await supabase
    .from("invoices").select("id, number").eq("id", invoiceId).single();
  if (error) throw error;
  if (Number(inv.number) === newNumber) throw new Error("That is already this order's number.");

  const { data: dup, error: dErr } = await supabase
    .from("invoices").select("id").eq("number", newNumber).limit(1);
  if (dErr) throw dErr;
  if (dup && dup.length) throw new Error(`Order #${newNumber} already exists.`);

  const { error: uErr } = await supabase.from("invoices").update({ number: newNumber }).eq("id", invoiceId);
  if (uErr) {
    if (String(uErr.code) === "23505") throw new Error(`Order #${newNumber} already exists.`);
    throw uErr;
  }
  // Keep text references (e.g. "Invoice #105") in due/loyalty history in sync.
  await supabase.from("loyalty_transactions").update({ invoice_number: newNumber }).eq("invoice_id", invoiceId);
  const { data: dues } = await supabase.from("due_transactions").select("id, note").eq("invoice_id", invoiceId);
  for (const d of dues ?? []) {
    if (d.note?.includes(`#${inv.number}`)) {
      await supabase.from("due_transactions")
        .update({ note: d.note.split(`#${inv.number}`).join(`#${newNumber}`) }).eq("id", d.id);
    }
  }

  await audit({ action: "change_order_number", invoice_id: invoiceId, old_number: inv.number, new_number: newNumber });
};
