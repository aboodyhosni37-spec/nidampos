import { supabase } from "@/integrations/supabase/client";

export type ExpenseCategory = { id: string; name: string };

export type Expense = {
  id: string;
  category_id: string | null;
  category_name: string;
  description: string;
  amount: number;
  expense_date: string; // YYYY-MM-DD
  created_by: string | null;
  created_at: string;
};

export const listExpenseCategories = async (): Promise<ExpenseCategory[]> => {
  const { data, error } = await supabase
    .from("expense_categories")
    .select("id, name")
    .order("name");
  if (error) throw error;
  return (data ?? []) as ExpenseCategory[];
};

export const createExpenseCategory = async (name: string) => {
  const { data, error } = await supabase
    .from("expense_categories")
    .insert({ name: name.trim() })
    .select("id, name")
    .single();
  if (error) throw error;
  return data as ExpenseCategory;
};

export const deleteExpenseCategory = async (id: string) => {
  const { error } = await supabase.from("expense_categories").delete().eq("id", id);
  if (error) throw error;
};

export const listExpenses = async (): Promise<Expense[]> => {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Expense[];
};

export const createExpense = async (input: {
  category_id: string;
  category_name: string;
  description: string;
  amount: number;
  expense_date: string;
  created_by?: string | null;
}) => {
  const { data, error } = await supabase
    .from("expenses")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as Expense;
};

export const updateExpense = async (id: string, patch: Partial<Expense>) => {
  const { error } = await supabase.from("expenses").update(patch).eq("id", id);
  if (error) throw error;
};

export const deleteExpense = async (id: string) => {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
};

export const sumExpensesInRange = async (fromIso: string, toIso: string): Promise<number> => {
  const { data, error } = await supabase
    .from("expenses")
    .select("amount")
    .gte("expense_date", fromIso)
    .lte("expense_date", toIso);
  if (error) throw error;
  return (data ?? []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
};
