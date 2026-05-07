import { supabase } from "@/integrations/supabase/client";

// Admin-only operation. Hard-deletes all orders/items/payments/due transactions.
export const resetAllOrders = async () => {
  // Delete in order of dependency.
  const tables = ["payments", "due_transactions", "invoice_items", "invoices"] as const;
  for (const tbl of tables) {
    const { error } = await supabase.from(tbl as any).delete().not("id", "is", null);
    if (error) throw error;
  }
  // Reset customer due balances since due_transactions are gone.
  await supabase.from("customers").update({ due_balance: 0 }).not("id", "is", null);
};
