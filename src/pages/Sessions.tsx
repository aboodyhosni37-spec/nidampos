import { useEffect, useMemo, useState } from "react";
import { CalendarClock, ClipboardList, Loader2, RefreshCw, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { getSession } from "@/lib/auth";
import {
  listSessionOrders,
  listSessions,
  type SessionOrder,
  type SessionWithTotals,
} from "@/lib/posSessions";
import { fetchSettings, formatMoney, type SystemSettings } from "@/lib/systemSettings";

const fmtDateTime = (v?: string | null) =>
  v ? new Date(v).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

const Sessions = () => {
  const staff = getSession();
  const isAdmin =
    staff?.role === "admin" || !!staff?.permissions?.view_all_sessions;

  const [sys, setSys] = useState<SystemSettings | null>(null);
  const [rows, setRows] = useState<SessionWithTotals[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<SessionWithTotals | null>(null);
  const [orders, setOrders] = useState<SessionOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const money = (n: number) => (sys ? formatMoney(n, sys) : `$${n.toFixed(2)}`);

  const load = async () => {
    setLoading(true);
    try {
      const [s, list] = await Promise.all([
        fetchSettings(),
        listSessions(isAdmin ? {} : { userId: staff?.id ?? null }),
      ]);
      setSys(s);
      setRows(list);
    } catch (e: any) {
      toast({ title: "Could not load sessions", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openSession = async (s: SessionWithTotals) => {
    setOpen(s);
    setOrdersLoading(true);
    try {
      setOrders(await listSessionOrders(s.id));
    } catch (e: any) {
      toast({ title: "Could not load orders", description: e.message, variant: "destructive" });
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.user_name.toLowerCase().includes(q) ||
        r.user_role.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (a, r) => ({
          sales: a.sales + r.total_sales,
          paid: a.paid + r.total_payments,
          due: a.due + r.total_due,
          orders: a.orders + r.orders_count,
        }),
        { sales: 0, paid: 0, due: 0, orders: 0 }
      ),
    [filtered]
  );

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cashier Sessions</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Every staff sign-in and the orders created during it."
              : "Your own sign-in sessions and the orders you created."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search staff or session…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg h-9 w-44 sm:w-56"
          />
          <Button variant="outline" size="sm" onClick={load} className="rounded-lg">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Sessions" value={String(filtered.length)} />
        <Stat label="Orders" value={String(totals.orders)} />
        <Stat label="Total Sales" value={money(totals.sales)} />
        <Stat label="Total Due" value={money(totals.due)} />
      </div>

      <Card className="rounded-2xl border-border overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading sessions…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No sessions recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Session</th>
                  <th className="text-left p-3">Staff</th>
                  <th className="text-left p-3">Started</th>
                  <th className="text-left p-3">Ended</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Orders</th>
                  <th className="text-right p-3">Sales</th>
                  <th className="text-right p-3">Payments</th>
                  <th className="text-right p-3">Due</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-3 font-mono text-xs">{r.id.slice(0, 8).toUpperCase()}</td>
                    <td className="p-3">
                      <div className="font-semibold">{r.user_name}</div>
                      <div className="text-xs text-muted-foreground capitalize">{r.user_role}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap">{fmtDateTime(r.started_at)}</td>
                    <td className="p-3 whitespace-nowrap">
                      {r.ended_at ? (
                        fmtDateTime(r.ended_at)
                      ) : (
                        <span className="text-xs font-semibold text-primary">Active now</span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          r.ended_at
                            ? "bg-secondary text-muted-foreground"
                            : "bg-primary/15 text-primary"
                        }`}
                      >
                        {r.ended_at ? "Signed Out" : "Active"}
                      </span>
                    </td>
                    <td className="p-3 text-right">{r.orders_count}</td>
                    <td className="p-3 text-right font-semibold">{money(r.total_sales)}</td>
                    <td className="p-3 text-right">{money(r.total_payments)}</td>
                    <td className="p-3 text-right">{money(r.total_due)}</td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        onClick={() => openSession(r)}
                      >
                        View Orders
                      </Button>
                    </td>
                  </tr>
                ))}

              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Session Orders
            </DialogTitle>
          </DialogHeader>
          {open && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <Info icon={ShieldCheck} label="Session ID" value={open.id} mono />
                <Info icon={User} label="Staff / Cashier" value={`${open.user_name} · ${open.user_role}`} />
                <Info icon={CalendarClock} label="Session start" value={fmtDateTime(open.started_at)} />
                <Info
                  icon={CalendarClock}
                  label="Session end"
                  value={open.ended_at ? fmtDateTime(open.ended_at) : "Still active"}
                />
                <Info
                  icon={ShieldCheck}
                  label="Session status"
                  value={
                    open.ended_at
                      ? `Ended / Signed Out${open.end_reason ? ` (${open.end_reason})` : ""}`
                      : "Active"
                  }
                />
                <Info icon={ClipboardList} label="Orders" value={String(open.orders_count)} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Stat label="Session Sales" value={money(open.total_sales)} />
                <Stat label="Session Payments" value={money(open.total_payments)} />
                <Stat label="Session Due" value={money(open.total_due)} />
              </div>

              <div className="rounded-xl border border-border p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Payment methods
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-sm">
                  {METHOD_ORDER.filter((m) => open.methods?.[m]).length === 0 ? (
                    <span className="text-muted-foreground text-xs">No orders in this session.</span>
                  ) : (
                    METHOD_ORDER.filter((m) => open.methods?.[m]).map((m) => (
                      <span key={m} className="px-2 py-1 rounded-lg bg-secondary/60">
                        <span className="font-semibold">{m}</span>{" "}
                        <span className="text-muted-foreground">{money(open.methods[m])}</span>
                      </span>
                    ))
                  )}
                </div>
              </div>


              {ordersLoading ? (
                <div className="py-8 flex items-center justify-center text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading orders…
                </div>
              ) : orders.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No orders were created in this session.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="text-left p-2.5">Order</th>
                        <th className="text-left p-2.5">Date / Time</th>
                        <th className="text-left p-2.5">Customer</th>
                        <th className="text-left p-2.5">Method</th>
                        <th className="text-right p-2.5">Total</th>
                        <th className="text-right p-2.5">Paid</th>
                        <th className="text-right p-2.5">Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => {
                        const due = Math.max(
                          0,
                          Number(o.total || 0) - Number(o.paid_amount || 0)
                        );
                        return (
                          <tr key={o.id} className="border-t border-border">
                            <td className="p-2.5 font-semibold">#{o.number}</td>
                            <td className="p-2.5 whitespace-nowrap">{fmtDateTime(o.created_at)}</td>
                            <td className="p-2.5">{o.customer_name || "Walk-in"}</td>
                            <td className="p-2.5">{o.payment_method}</td>
                            <td className="p-2.5 text-right font-semibold">{money(Number(o.total || 0))}</td>
                            <td className="p-2.5 text-right">{money(Number(o.paid_amount || 0))}</td>
                            <td className="p-2.5 text-right">{money(due)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <Card className="rounded-2xl border-border p-4">
    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
      {label}
    </div>
    <div className="text-xl font-bold mt-1">{value}</div>
  </Card>
);

const Info = ({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: any;
  label: string;
  value: string;
  mono?: boolean;
}) => (
  <div className="rounded-xl border border-border p-3">
    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
      <Icon className="h-3 w-3" /> {label}
    </div>
    <div className={`mt-1 font-semibold break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
  </div>
);

export default Sessions;
