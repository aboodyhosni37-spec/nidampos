// Hagaajiye Tech Super Admin: separate email/password accounts, role checked
// server-side via user_roles + has_role(). POS PIN sessions are untouched.
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type Restaurant = {
  id: string;
  restaurant_code: string;
  name: string;
  owner_name: string | null;
  owner_email: string | null;
  phone: string | null;
  address: string | null;
  status: "active" | "suspended" | "inactive";
  subscription_plan: string;
  subscription_status: "trial" | "active" | "past_due" | "cancelled";
  subscription_ends_at: string | null;
  notes: string | null;
  created_at: string;
};

export const isSuperAdmin = async (): Promise<boolean> => {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { data } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", u.user.id)
    .eq("role", "super_admin")
    .maybeSingle();
  if (data) return true;
  // Bootstrap: the very first account becomes Super Admin (server-enforced).
  const { data: claimed } = await db.rpc("claim_first_super_admin");
  return !!claimed;
};

const audit = async (action: string, details: Record<string, unknown>) => {
  const { data: u } = await supabase.auth.getUser();
  await db.from("admin_audit_log").insert({
    action,
    restaurant: (details.name as string) || "Platform",
    performed_by_id: null,
    performed_by_name: u.user?.email ?? null,
    performed_by_role: "super_admin",
    details,
  });
};

export const listRestaurants = async (): Promise<Restaurant[]> => {
  const { data, error } = await db.from("restaurants").select("*").order("created_at");
  if (error) throw error;
  return data ?? [];
};

export const saveRestaurant = async (r: Partial<Restaurant>) => {
  const row = { ...r };
  delete (row as any).created_at;
  if (r.id) {
    const { error } = await db.from("restaurants").update(row).eq("id", r.id);
    if (error) throw error;
    await audit("restaurant_updated", { id: r.id, name: r.name, status: r.status, subscription_status: r.subscription_status });
  } else {
    const { error } = await db.from("restaurants").insert(row);
    if (error) throw error;
    await audit("restaurant_created", { name: r.name, code: r.restaurant_code });
  }
};

export const getOverview = async () => {
  const [rest, users, logs] = await Promise.all([
    listRestaurants(),
    db.from("app_users").select("id, is_active"),
    db.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(10),
  ]);
  const u = (users.data ?? []) as { is_active: boolean }[];
  return {
    restaurants: rest,
    totalUsers: u.length,
    activeUsers: u.filter((x) => x.is_active).length,
    recent: (logs.data ?? []) as any[],
  };
};
