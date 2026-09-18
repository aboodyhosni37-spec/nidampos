// Customer deposits: money the customer pre-pays and can later use for orders.
// Completely separate from Customer Due, loyalty spending and refunds.
import { supabase } from "@/integrations/supabase/client";

export type DepositMethod = "Cash" | "Card" | "EVC-Plus" | "E-Dahab" | "Premier Wallet";

export const DEPOSIT_METHODS: DepositMethod[] = [
  "EVC-Plus",
  "E-Dahab",
  "Premier Wallet",
  "Cash",
  "Card",
];

export type DepositEntry = {
  id: string;
  customer_id: string;
  type: "deposit" | "usage";
  amount: number;
  method: string | null;
  note: string | null;
  invoice_id: string | null;
  staff_id: string | null;
  staff_name: string | null;
  created_at: string;
};

export type DepositSummary = {
  total_deposited: number;
  deposit_used: number;
  balance: number;
};

export const listDeposits = async (customerId: string): Promise<DepositEntry[]> => {
  const { data, error } = await supabase
    .from("customer_deposits")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DepositEntry[];
};

const round = (n: number) => +Number(n || 0).toFixed(2);

// Balance is always derived from the deposit ledger, then stored on the customer
// so the POS can read it cheaply. Idempotent: safe to call as often as needed.
export const recomputeDepositBalance = async (
  customerId: string
): Promise<DepositSummary> => {
  const { data, error } = await supabase
    .from("customer_deposits")
    .select("type, amount")
    .eq("customer_id", customerId);
  if (error) throw error;

  let deposited = 0;
  let used = 0;
  for (const row of data ?? []) {
    const amt = Number((row as any).amount || 0);
    if ((row as any).type === "usage") used += amt;
    else deposited += amt;
  }
  const summary: DepositSummary = {
    total_deposited: round(deposited),
    deposit_used: round(used),
    balance: round(Math.max(0, deposited - used)),
  };

  const { error: uErr } = await supabase
    .from("customers")
    .update({
      deposit_total: summary.total_deposited,
      deposit_used: summary.deposit_used,
      deposit_balance: summary.balance,
    })
    .eq("id", customerId);
  if (uErr) throw uErr;

  return summary;
};

export const addDeposit = async (input: {
  customer_id: string;
  amount: number;
  method: string;
  note?: string;
  staff_id?: string | null;
  staff_name?: string | null;
}): Promise<DepositSummary> => {
  const amount = round(input.amount);
  if (!(amount > 0)) throw new Error("Deposit amount must be greater than 0.");

  const { error } = await supabase.from("customer_deposits").insert({
    customer_id: input.customer_id,
    type: "deposit",
    amount,
    method: input.method,
    note: input.note?.trim() || null,
    staff_id: input.staff_id ?? null,
    staff_name: input.staff_name ?? null,
  });
  if (error) throw error;

  return recomputeDepositBalance(input.customer_id);
};

// Record deposit money used for an order. One usage row per order (enforced by a
// unique index), so re-running this can never deduct twice for the same order.
export const useDeposit = async (input: {
  customer_id: string;
  amount: number;
  invoice_id: string;
  invoice_number?: number | null;
  staff_id?: string | null;
  staff_name?: string | null;
}): Promise<{ applied: number; summary: DepositSummary }> => {
  const requested = round(input.amount);
  if (!(requested > 0)) throw new Error("Amount must be greater than 0.");

  const current = await recomputeDepositBalance(input.customer_id);
  const applied = round(Math.min(requested, current.balance));
  if (!(applied > 0)) throw new Error("This customer has no deposit balance left.");

  const { error } = await supabase.from("customer_deposits").insert({
    customer_id: input.customer_id,
    type: "usage",
    amount: applied,
    method: "Deposit",
    invoice_id: input.invoice_id,
    note: input.invoice_number ? `Used for order #${input.invoice_number}` : "Used for an order",
    staff_id: input.staff_id ?? null,
    staff_name: input.staff_name ?? null,
  });
  if (error) {
    // Duplicate usage for the same order — already recorded, nothing to deduct.
    if ((error as any).code === "23505") {
      return { applied: 0, summary: await recomputeDepositBalance(input.customer_id) };
    }
    throw error;
  }

  return { applied, summary: await recomputeDepositBalance(input.customer_id) };
};

// Settle a customer's outstanding orders (oldest first) from their deposit
// balance. Each order gets at most one deposit-usage record.
export const settleDueWithDeposit = async (input: {
  customer_id: string;
  staff_id?: string | null;
  staff_name?: string | null;
  max_amount?: number;
}): Promise<{ applied: number; orders: number }> => {
  const { payUnpaidInvoice } = await import("./db");
  const summary = await recomputeDepositBalance(input.customer_id);
  let remaining = round(Math.min(summary.balance, input.max_amount ?? summary.balance));
  if (!(remaining > 0)) throw new Error("This customer has no deposit balance left.");

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("id, number, total, paid_amount, status, order_status")
    .eq("customer_id", input.customer_id)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const VOID = ["cancelled", "canceled", "void", "voided", "refunded"];
  let applied = 0;
  let count = 0;

  for (const inv of invoices ?? []) {
    if (remaining <= 0) break;
    if (
      VOID.includes(String((inv as any).status ?? "").toLowerCase()) ||
      VOID.includes(String((inv as any).order_status ?? "").toLowerCase())
    )
      continue;
    const owed = round(Math.max(0, Number(inv.total || 0) - Number(inv.paid_amount || 0)));
    if (owed <= 0) continue;
    const pay = round(Math.min(owed, remaining));

    // Record the deposit usage first — the unique index makes it impossible to
    // deduct twice for the same order.
    const used = await useDeposit({
      customer_id: input.customer_id,
      amount: pay,
      invoice_id: inv.id as string,
      invoice_number: Number(inv.number),
      staff_id: input.staff_id ?? null,
      staff_name: input.staff_name ?? null,
    });
    if (used.applied <= 0) continue;

    await payUnpaidInvoice({
      invoice_id: inv.id as string,
      amount: used.applied,
      method: "Deposit" as any,
      customer_id: input.customer_id,
    });

    applied = round(applied + used.applied);
    remaining = round(remaining - used.applied);
    count += 1;
  }

  await recomputeDepositBalance(input.customer_id);
  return { applied, orders: count };
};
