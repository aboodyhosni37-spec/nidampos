// Client-side session for the demo POS. Permissions are loaded from DB.
import type { PermissionMap } from "./permissions";
import { ADMIN_PERMS } from "./permissions";

const KEY = "nidam_pos_user";

export type SessionUser = {
  id?: string;
  name: string;
  method: "web" | "pos";
  identifier: string;
  role: string;
  permissions: PermissionMap;
};

export const getSession = (): SessionUser | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionUser;
    // Backward compatibility for older sessions without role
    if (!parsed.role) {
      return { ...parsed, role: "admin", permissions: ADMIN_PERMS };
    }
    return parsed;
  } catch {
    return null;
  }
};

export const setSession = (u: SessionUser) => {
  localStorage.setItem(KEY, JSON.stringify(u));
};

export const clearSession = () => {
  localStorage.removeItem(KEY);
};

export const can = (permission: keyof PermissionMap): boolean => {
  const s = getSession();
  if (!s) return false;
  return !!s.permissions?.[permission];
};
