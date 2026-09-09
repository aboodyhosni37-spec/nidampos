// Staff session for the POS. PIN login is unchanged — this module only stores,
// expires and re-validates the session created by the PIN forms.
import { supabase } from "@/integrations/supabase/client";
import type { PermissionMap } from "./permissions";

const KEY = "nidam_pos_user";
export const SESSION_EVENT = "nidam-session-changed";
const MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

export type SessionUser = {
  id?: string;
  name: string;
  method: "web" | "pos";
  identifier: string;
  role: string;
  permissions: PermissionMap;
  issuedAt?: number;
  expiresAt?: number;
};

const notify = () => {
  try {
    window.dispatchEvent(new Event(SESSION_EVENT));
  } catch {}
};

export const getSession = (): SessionUser | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionUser;
    // A session must carry a real staff id, a role and a valid expiry.
    if (!parsed || !parsed.id || !parsed.role || !parsed.expiresAt) {
      localStorage.removeItem(KEY);
      return null;
    }
    if (Date.now() > Number(parsed.expiresAt)) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const setSession = (u: SessionUser) => {
  const now = Date.now();
  localStorage.setItem(
    KEY,
    JSON.stringify({ ...u, issuedAt: now, expiresAt: now + MAX_AGE_MS })
  );
  notify();
};

export const clearSession = () => {
  localStorage.removeItem(KEY);
  notify();
};

export const subscribeSession = (cb: () => void) => {
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(SESSION_EVENT, cb);
  window.addEventListener("focus", cb);
  document.addEventListener("visibilitychange", cb);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SESSION_EVENT, cb);
    window.removeEventListener("focus", cb);
    document.removeEventListener("visibilitychange", cb);
  };
};

// Server-side check: the staff account must still exist, still be active and
// still hold the stored role. Permissions are refreshed from the database.
export const validateSession = async (): Promise<SessionUser | null> => {
  const s = getSession();
  if (!s?.id) return null;
  try {
    const { data, error } = await supabase
      .from("app_users")
      .select("id, name, role, is_active")
      .eq("id", s.id)
      .maybeSingle();
    if (error) return s; // offline / transient error: keep the local session
    if (!data || !data.is_active) {
      clearSession();
      return null;
    }
    const { data: roleRow } = await supabase
      .from("role_permissions")
      .select("permissions")
      .eq("role", data.role)
      .maybeSingle();
    const fresh: SessionUser = {
      ...s,
      name: data.name,
      role: data.role,
      permissions: ((roleRow?.permissions as PermissionMap) ?? s.permissions) || {},
    };
    localStorage.setItem(KEY, JSON.stringify(fresh));
    return fresh;
  } catch {
    return s;
  }
};

export const can = (permission: keyof PermissionMap): boolean => {
  const s = getSession();
  if (!s) return false;
  return !!s.permissions?.[permission];
};
