// Cashier work sessions. A session opens when staff sign in and closes when they
// sign out / their login expires. Orders created while a session is open are
// linked to it — the POS order-creation workflow itself is unchanged.
import { supabase } from "@/integrations/supabase/client";
import type { PaymentMethod } from "./db";

const SESSION_ID_KEY = "nidam_pos_session_id";
// Per-tab marker: sessionStorage survives reloads but dies with the tab/window,
// so its absence means the window was closed since the last sign-in.
const TAB_ALIVE_KEY = "nidam_pos_tab_alive";
// A session with no heartbeat for this long is considered abandoned (crash,
// power loss, lost connectivity) and is closed at its last seen time.
const STALE_MS = 5 * 60 * 1000;
const HEARTBEAT_MS = 45 * 1000;

export const markTabAlive = () => {
  try {
    sessionStorage.setItem(TAB_ALIVE_KEY, "1");
  } catch {}
};

export const isTabAlive = (): boolean => {
  try {
    return sessionStorage.getItem(TAB_ALIVE_KEY) === "1";
  } catch {
    return true;
  }
};

export const clearTabAlive = () => {
  try {
    sessionStorage.removeItem(TAB_ALIVE_KEY);
  } catch {}
};


export type PosSession = {
  id: string;
  user_id: string | null;
  user_name: string;
  user_role: string;
  login_method: string | null;
  started_at: string;
  ended_at: string | null;
  end_reason: string | null;
  last_seen_at?: string | null;
};


export type SessionOrder = {
  id: string;
  number: number;
  created_at: string;
  customer_name: string | null;
  total: number;
  paid_amount: number;
  due_amount: number;
  payment_method: PaymentMethod;
  order_status: string;
  status: string;
};

export type SessionWithTotals = PosSession & {
  orders_count: number;
  total_sales: number;
  total_payments: number;
  total_due: number;
  methods: Record<string, number>;
  status: string;
};


export const getCurrentSessionId = (): string | null => {
  try {
    return localStorage.getItem(SESSION_ID_KEY) || null;
  } catch {
    return null;
  }
};

// Called right after a successful PIN login. Never blocks the login.
export const startPosSession = async (user: {
  id?: string;
  name: string;
  role: string;
  method?: string;
}): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from("pos_sessions")
      .insert({
        user_id: user.id ?? null,
        user_name: user.name,
        user_role: user.role,
        login_method: user.method ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    localStorage.setItem(SESSION_ID_KEY, data.id as string);
    markTabAlive();
    startHeartbeat();
    return data.id as string;
  } catch {
    return null;
  }
};

export const endPosSession = async (reason = "sign-out"): Promise<void> => {
  const id = getCurrentSessionId();
  stopHeartbeat();
  try {
    localStorage.removeItem(SESSION_ID_KEY);
  } catch {}
  clearTabAlive();
  if (!id) return;
  try {
    await supabase
      .from("pos_sessions")
      .update({ ended_at: new Date().toISOString(), end_reason: reason })
      .eq("id", id)
      .is("ended_at", null);
  } catch {}
};

// ---------- Heartbeat: proves the session is still open ----------
let hbTimer: ReturnType<typeof setInterval> | null = null;

const beat = async () => {
  const id = getCurrentSessionId();
  if (!id) return;
  try {
    await supabase
      .from("pos_sessions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", id)
      .is("ended_at", null);
  } catch {}
};

export const startHeartbeat = () => {
  if (hbTimer) return;
  void beat();
  hbTimer = setInterval(beat, HEARTBEAT_MS);
};

export const stopHeartbeat = () => {
  if (hbTimer) clearInterval(hbTimer);
  hbTimer = null;
};

// ---------- Window close: end the session with a keepalive request ----------
// Runs during pagehide, where async clients may be torn down, so it uses a raw
// keepalive fetch. Guarded by `ended_at is null` so it can never duplicate an end.
const endSessionOnUnload = (reason = "window-closed") => {
  const id = getCurrentSessionId();
  if (!id) return;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return;
  try {
    fetch(
      `${url}/rest/v1/pos_sessions?id=eq.${encodeURIComponent(id)}&ended_at=is.null`,
      {
        method: "PATCH",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          apikey: key as string,
          Authorization: `Bearer ${key}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          ended_at: new Date().toISOString(),
          end_reason: reason,
        }),
      }
    ).catch(() => {});
  } catch {}
  try {
    localStorage.removeItem(SESSION_ID_KEY);
  } catch {}
};

// ---------- Recovery: close sessions whose heartbeat stopped ----------
export const reapStaleSessions = async (): Promise<void> => {
  const current = getCurrentSessionId();
  try {
    const cutoff = new Date(Date.now() - STALE_MS).toISOString();
    const { data } = await supabase
      .from("pos_sessions")
      .select("id, last_seen_at")
      .is("ended_at", null)
      .lt("last_seen_at", cutoff)
      .limit(50);
    for (const row of data ?? []) {
      if (current && row.id === current) continue;
      await supabase
        .from("pos_sessions")
        .update({
          ended_at: (row as any).last_seen_at ?? new Date().toISOString(),
          end_reason: "timeout",
        })
        .eq("id", row.id)
        .is("ended_at", null);
    }
  } catch {}
};

// Installed once at app start. Returns a cleanup function.
export const installSessionLifecycle = (): (() => void) => {
  const onPageHide = (e: PageTransitionEvent) => {
    // A cached (back/forward) page is not a real close.
    if ((e as any).persisted) return;
    endSessionOnUnload("window-closed");
  };
  const onVisibility = () => {
    if (document.visibilityState === "visible") void beat();
  };

  if (getCurrentSessionId()) startHeartbeat();
  void reapStaleSessions();

  window.addEventListener("pagehide", onPageHide);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    window.removeEventListener("pagehide", onPageHide);
    document.removeEventListener("visibilitychange", onVisibility);
    stopHeartbeat();
  };
};


const VOID = ["cancelled", "canceled", "void", "voided", "refunded"];
const isLive = (i: any) =>
  !VOID.includes(String(i.status ?? "").toLowerCase()) &&
  !VOID.includes(String(i.order_status ?? "").toLowerCase());

// Sessions with their order totals. When userId is given, only that staff
// member's own sessions are returned.
export const listSessions = async (opts?: {
  userId?: string | null;
  limit?: number;
}): Promise<SessionWithTotals[]> => {
  let q = supabase
    .from("pos_sessions")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(opts?.limit ?? 100);
  if (opts?.userId) q = q.eq("user_id", opts.userId);
  const { data: sessions, error } = await q;
  if (error) throw error;

  const ids = (sessions ?? []).map((s: any) => s.id as string);
  if (ids.length === 0) return [];

  const { data: invoices, error: iErr } = await supabase
    .from("invoices")
    .select("session_id, total, paid_amount, due_amount, status, order_status, payment_method")
    .in("session_id", ids);
  if (iErr) throw iErr;

  type Agg = { n: number; sales: number; paid: number; due: number; methods: Record<string, number> };
  const agg = new Map<string, Agg>();
  for (const inv of invoices ?? []) {
    if (!isLive(inv)) continue;
    const key = String((inv as any).session_id);
    const cur: Agg = agg.get(key) ?? { n: 0, sales: 0, paid: 0, due: 0, methods: {} };
    cur.n += 1;
    cur.sales += Number(inv.total || 0);
    cur.paid += Number(inv.paid_amount || 0);
    cur.due += Math.max(0, Number(inv.total || 0) - Number(inv.paid_amount || 0));
    const m = String((inv as any).payment_method || "Unknown");
    cur.methods[m] = +((cur.methods[m] ?? 0) + Number(inv.total || 0)).toFixed(2);
    agg.set(key, cur);
  }

  return (sessions ?? []).map((s: any) => {
    const a = agg.get(s.id) ?? { n: 0, sales: 0, paid: 0, due: 0, methods: {} };
    return {
      ...(s as PosSession),
      orders_count: a.n,
      total_sales: +a.sales.toFixed(2),
      total_payments: +a.paid.toFixed(2),
      total_due: +a.due.toFixed(2),
      methods: a.methods,
      status: s.ended_at ? "Ended / Signed Out" : "Active",
    };
  });

};

export const listSessionOrders = async (sessionId: string): Promise<SessionOrder[]> => {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, number, created_at, customer_name, total, paid_amount, due_amount, payment_method, order_status, status"
    )
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SessionOrder[];
};
