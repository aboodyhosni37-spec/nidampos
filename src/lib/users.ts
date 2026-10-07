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

const RESTAURANT_KEY = "nidam_pos_restaurant";

export const getRequestedRestaurant = (): string => {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("restaurant");
    if (fromUrl) {
      localStorage.setItem(RESTAURANT_KEY, fromUrl);
      return fromUrl;
    }
    return localStorage.getItem(RESTAURANT_KEY) || "lamahamar-cafe";
  } catch {
    return "lamahamar-cafe";
  }
};

// Server-verified PIN sign-in. The server checks the PIN, the restaurant
// assignment, restaurant status and subscription, then issues a real session.
// Returns null for a wrong PIN; throws with a clear message when blocked.
export const secureLogin = async (pin: string, username?: string): Promise<AppUser | null> => {
  const { data, error } = await supabase.functions.invoke("pos-login", {
    body: { pin, username, restaurant: getRequestedRestaurant() },
  });
  if (error) {
    let msg = "Login failed";
    let status = 0;
    try {
      status = (error as any).context?.status ?? 0;
      const b = await (error as any).context?.json?.();
      if (b?.error) msg = b.error;
    } catch {}
    if (status === 401 || msg === "Invalid PIN") return null;
    throw new Error(msg);
  }
  await supabase.auth.setSession(data.session);
  try {
    localStorage.setItem(RESTAURANT_KEY, data.restaurant.code);
    localStorage.setItem("nidam_pos_restaurant_name", data.restaurant.name);
  } catch {}
  return { ...data.user, pin: "", phone: null, is_active: true } as AppUser;
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
