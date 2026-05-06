import { supabase } from "@/integrations/supabase/client";

export type Permission =
  | "access_pos"
  | "place_order"
  | "access_due"
  | "access_expenses"
  | "manage_expenses"
  | "view_reports"
  | "manage_products"
  | "manage_categories"
  | "manage_users"
  | "access_settings"
  | "access_orders"
  | "access_customers"
  | "access_inventory"
  | "apply_discount"
  | "manage_system_settings"
  | "access_staff"
  | "manage_staff";

export type PermissionMap = Partial<Record<Permission, boolean>>;

export type RolePermission = {
  role: string;
  permissions: PermissionMap;
  is_system: boolean;
  updated_at: string;
};

export const ALL_PERMISSIONS: { key: Permission; label: string; group: string }[] = [
  { key: "access_pos", label: "Access POS", group: "POS" },
  { key: "place_order", label: "Place Order", group: "POS" },
  { key: "access_due", label: "Access Due / Credit", group: "POS" },
  { key: "access_orders", label: "View Orders", group: "Orders" },
  { key: "access_customers", label: "View Customers", group: "Orders" },
  { key: "access_expenses", label: "Access Expense Module", group: "Expenses" },
  { key: "manage_expenses", label: "Add / Edit / Delete Expenses", group: "Expenses" },
  { key: "view_reports", label: "View Reports", group: "Reports" },
  { key: "access_inventory", label: "View Inventory", group: "Inventory" },
  { key: "manage_products", label: "Manage Products", group: "Inventory" },
  { key: "manage_categories", label: "Manage Categories", group: "Inventory" },
  { key: "apply_discount", label: "Apply Discount in POS", group: "POS" },
  { key: "access_staff", label: "View Staff & Salaries", group: "Staff" },
  { key: "manage_staff", label: "Manage Staff Salaries (Admin only)", group: "Staff" },
  { key: "manage_users", label: "Manage Users (Admin only)", group: "Admin" },
  { key: "access_settings", label: "Access Settings", group: "Admin" },
  { key: "manage_system_settings", label: "Modify System Settings (Admin only)", group: "Admin" },
];

export const ADMIN_PERMS: PermissionMap = ALL_PERMISSIONS.reduce(
  (a, p) => ({ ...a, [p.key]: true }),
  {} as PermissionMap
);

export const listRoles = async (): Promise<RolePermission[]> => {
  const { data, error } = await supabase.from("role_permissions").select("*").order("role");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    role: r.role,
    permissions: (r.permissions || {}) as PermissionMap,
    is_system: !!r.is_system,
    updated_at: r.updated_at,
  }));
};

export const upsertRole = async (
  role: string,
  permissions: PermissionMap,
  is_system = false
) => {
  const { error } = await supabase
    .from("role_permissions")
    .upsert({ role, permissions: permissions as any, is_system });
  if (error) throw error;
};

export const deleteRole = async (role: string) => {
  const { error } = await supabase.from("role_permissions").delete().eq("role", role);
  if (error) throw error;
};
