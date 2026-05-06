import { supabase } from "@/integrations/supabase/client";

export type Staff = {
  id: string;
  name: string;
  role: string;
  photo_url: string | null;
  salary_amount: number;
  is_active: boolean;
  created_at: string;
};

export type SalaryPayment = {
  id: string;
  staff_id: string;
  amount: number;
  method: string;
  note: string | null;
  paid_on: string;
  created_at: string;
};

export const SALARY_METHODS = ["EVC-Plus", "Premier Wallet", "E-Dahab", "Cash"] as const;

export const listStaff = async (): Promise<Staff[]> => {
  const { data, error } = await supabase.from("staff").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as Staff[];
};

export const createStaff = async (input: {
  name: string;
  role: string;
  salary_amount: number;
  photo_url?: string | null;
}) => {
  const { data, error } = await supabase
    .from("staff")
    .insert({
      name: input.name.trim(),
      role: input.role.trim() || "Staff",
      salary_amount: input.salary_amount,
      photo_url: input.photo_url ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Staff;
};

export const updateStaff = async (
  id: string,
  patch: Partial<Pick<Staff, "name" | "role" | "salary_amount" | "photo_url" | "is_active">>
) => {
  const { error } = await supabase.from("staff").update(patch).eq("id", id);
  if (error) throw error;
};

export const deleteStaff = async (id: string) => {
  const { error } = await supabase.from("staff").delete().eq("id", id);
  if (error) throw error;
};

export const uploadStaffPhoto = async (file: File): Promise<string> => {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("staff-photos").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("staff-photos").getPublicUrl(path);
  return data.publicUrl;
};

export const listSalaryPayments = async (staffId?: string): Promise<SalaryPayment[]> => {
  let q = supabase.from("salary_payments").select("*").order("paid_on", { ascending: false });
  if (staffId) q = q.eq("staff_id", staffId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as SalaryPayment[];
};

export const createSalaryPayment = async (input: {
  staff_id: string;
  amount: number;
  method: string;
  note?: string;
  paid_on: string;
}) => {
  const { error } = await supabase.from("salary_payments").insert(input);
  if (error) throw error;
};

export const deleteSalaryPayment = async (id: string) => {
  const { error } = await supabase.from("salary_payments").delete().eq("id", id);
  if (error) throw error;
};
