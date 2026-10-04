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
  subscription_starts_at: string | null;
  pos_url: string | null;
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

export const DEFAULT_POS_URL = "https://https-lamahamarcafe-c37fc-web-app.lovable.app/login";

export const posUrlFor = (r: Restaurant) => {
  // restaurant id is context only, never proof of access.
  const base = r.pos_url || DEFAULT_POS_URL;
  return `${base}${base.includes("?") ? "&" : "?"}restaurant=${encodeURIComponent(r.restaurant_code)}`;
};

export const newRestaurantCode = (name: string) => {
  const slug = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "rest";
  return `${slug}-${Math.random().toString(36).slice(2, 7)}`;
};

export type SubState = "Active" | "Expiring" | "Expired" | "Suspended" | "Trial" | "Cancelled";
export const subscriptionState = (r: Restaurant): SubState => {
  if (r.status === "suspended") return "Suspended";
  if (r.subscription_status === "cancelled") return "Cancelled";
  if (r.subscription_ends_at) {
    const days = (new Date(r.subscription_ends_at + "T23:59:59").getTime() - Date.now()) / 86400000;
    if (days < 0) return "Expired";
    if (days <= 14) return "Expiring";
  }
  return r.subscription_status === "trial" ? "Trial" : "Active";
};

export const setRestaurantStatus = async (r: Restaurant, status: Restaurant["status"]) => {
  const { error } = await db.from("restaurants").update({ status }).eq("id", r.id);
  if (error) throw error;
  await audit(`restaurant_${status === "active" ? "activated" : status}`, { id: r.id, name: r.name, from: r.status, to: status });
};

export const listMembers = async (restaurantId: string) => {
  const { data, error } = await db
    .from("restaurant_members")
    .select("id, app_user_id, app_users(name, role, is_active)")
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
  return (data ?? []) as { id: string; app_user_id: string; app_users: { name: string; role: string; is_active: boolean } | null }[];
};

export const listPosUsers = async () => {
  const { data, error } = await db.from("app_users").select("id, name, role").order("name");
  if (error) throw error;
  return (data ?? []) as { id: string; name: string; role: string }[];
};

export const assignMember = async (r: Restaurant, userId: string, userName: string) => {
  const { error } = await db.from("restaurant_members").insert({ restaurant_id: r.id, app_user_id: userId });
  if (error) throw error;
  await audit("restaurant_user_assigned", { id: r.id, name: r.name, user: userName });
};

export const removeMember = async (r: Restaurant, memberId: string, userName: string) => {
  const { error } = await db.from("restaurant_members").delete().eq("id", memberId);
  if (error) throw error;
  await audit("restaurant_user_removed", { id: r.id, name: r.name, user: userName });
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
    await audit("restaurant_updated", { id: r.id, name: r.name, status: r.status, subscription_status: r.subscription_status, pos_url: r.pos_url });
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
