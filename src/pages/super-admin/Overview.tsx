import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { getOverview } from "@/lib/superAdmin";

export default function SuperAdminOverview() {
  const [d, setD] = useState<Awaited<ReturnType<typeof getOverview>> | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    getOverview().then(setD).catch((e) => setErr(e.message));
  }, []);

  if (err) return <p className="text-sm">{err}</p>;
  if (!d) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const r = d.restaurants;
  const stats = [
    ["Restaurants", r.length],
    ["Active", r.filter((x) => x.status === "active").length],
    ["Suspended", r.filter((x) => x.status === "suspended").length],
    ["POS users", d.totalUsers],
    ["Active POS users", d.activeUsers],
    ["Subscriptions active", r.filter((x) => x.subscription_status === "active").length],
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-2xl font-bold">Overview</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map(([label, v]) => (
          <Card key={label as string} className="p-4">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-2xl font-bold tabular-nums">{v}</div>
          </Card>
        ))}
      </div>
      <Card className="p-4">
        <h2 className="font-semibold mb-3">Recent admin activity</h2>
        {d.recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <div className="divide-y text-sm">
            {d.recent.map((a) => (
              <div key={a.id} className="py-2 flex flex-wrap justify-between gap-2">
                <span>
                  <span className="font-medium">{a.action.replace(/_/g, " ")}</span>
                  {a.old_number ? ` · #${a.old_number}` : ""} · {a.restaurant}
                </span>
                <span className="text-muted-foreground">
                  {a.performed_by_name || "—"} · {new Date(a.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
