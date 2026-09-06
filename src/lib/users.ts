import { supabase } from "@/integrations/supabase/client";

export type AppUser = {
  id: string;
  name: string;
  username: string | null;
  phone: string | null;
  pin: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

export const listUsers = async (): Promise<AppUser[]> => {
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AppUser[];
};

export const createUser = async (input: {
  name: string;
  username?: string;
  phone?: string;
  pin: string;
  role: string;
}) => {
  if (!/^\d{4,6}$/.test(input.pin)) throw new Error("PIN must be 4–6 digits");
  const { data, error } = await supabase
    .from("app_users")
    .insert({
      name: input.name.trim(),
      username: input.username?.trim() || null,
      phone: input.phone?.trim() || null,
      pin: input.pin,
      role: input.role,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as AppUser;
};

export const updateUser = async (
  id: string,
  patch: Partial<Pick<AppUser, "name" | "username" | "phone" | "role" | "is_active" | "pin">>
) => {
  if (patch.pin && !/^\d{4,6}$/.test(patch.pin)) throw new Error("PIN must be 4–6 digits");
  const { error } = await supabase.from("app_users").update(patch).eq("id", id);
  if (error) throw error;
};

export const deleteUser = async (id: string) => {
  const { error } = await supabase.from("app_users").delete().eq("id", id);
  if (error) throw error;
};

export const findUserByPin = async (pin: string): Promise<AppUser | null> => {
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("pin", pin)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as AppUser) ?? null;
};

export const findUserByPhonePin = async (phone: string, pin: string): Promise<AppUser | null> => {
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("phone", phone)
    .eq("pin", pin)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return (data as AppUser) ?? null;
};

export const findUserByUsernamePin = async (username: string, pin: string): Promise<AppUser | null> => {
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("username", username)
    .eq("pin", pin)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return (data as AppUser) ?? null;
};
