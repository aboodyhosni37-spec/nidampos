import { useEffect, useState } from "react";
import {
  DollarSign,
  ShoppingBag,
  Clock,
  Wallet,
  PackageX,
  ArrowUpRight,
  TrendingDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { loadOrders, type Order } from "@/lib/orders";
import { getDashboardStats, type DashboardStats } from "@/lib/db";
import { listProducts, type DbProduct } from "@/lib/menu";
import { sumExpensesInRange } from "@/lib/expenses";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lowStock, setLowStock] = useState<DbProduct[]>([]);
  const [todayExpenses, setTodayExpenses] = useState(0);

  useEffect(() => {
    setOrders(loadOrders());
    getDashboardStats().then(setStats).catch(() => {});
    listProducts()
      .then((all) => setLowStock(all.filter((p) => p.stock <= p.low_stock_threshold)))
      .catch(() => {});
    const today = new Date().toISOString().slice(0, 10);
    sumExpensesInRange(today, today).then(setTodayExpenses).catch(() => {});
  }, []);

  const widgets = [
    {
      label: "Total Sales (Today)",
      value: `$${(stats?.totalSalesToday ?? 0).toFixed(2)}`,
      icon: DollarSign,
      color: "from-blue-500 to-indigo-500",
      to: "/dashboard/reports",
    },
    {
      label: "Orders Today",
      value: (stats?.ordersToday ?? 0).toString(),
      icon: ShoppingBag,
      color: "from-indigo-500 to-purple-500",
      to: "/dashboard/orders",
    },
    {
      label: "Pending Orders",
      value: (stats?.pendingOrders ?? 0).toString(),
      icon: Clock,
      color: "from-amber-500 to-orange-500",
      to: "/dashboard/orders",
    },
    {
      label: "Total Due",
      value: `$${(stats?.totalDue ?? 0).toFixed(2)}`,
      icon: Wallet,
      color: "from-rose-500 to-pink-500",
      to: "/dashboard/customers",
    },
    {
      label: "Low Stock Alerts",
      value: lowStock.length.toString(),
      icon: PackageX,
      color: "from-emerald-500 to-teal-500",
      to: "/dashboard/inventory",
    },
    {
      label: "Expenses Today",
      value: `$${todayExpenses.toFixed(2)}`,
      icon: TrendingDown,
      color: "from-red-500 to-rose-500",
      to: "/dashboard/expenses",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back 👋</h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening at your restaurant today.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {widgets.map((s) => (
          <Link key={s.label} to={s.to} className="block">
            <Card className="p-5 rounded-2xl border-border hover:border-primary/40 hover:shadow-soft transition-colors cursor-pointer h-full">
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    "h-11 w-11 rounded-xl bg-gradient-to-br text-white flex items-center justify-center shadow-soft",
                    s.color
                  )}
                >
                  <s.icon className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-4 text-2xl font-bold tracking-tight">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-border lg:col-span-2">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-lg">Recent Orders</h2>
            <span className="text-sm text-muted-foreground">{orders.length} total</span>
          </div>
          <div className="divide-y divide-border">
            {orders.slice(0, 6).map((o) => (
              <div
                key={o.id}
                className="p-4 flex items-center justify-between hover:bg-secondary/40 transition-colors"
              >
                <div>
                  <div className="font-semibold">Order #{o.number}</div>
                  <div className="text-xs text-muted-foreground">
                    {o.table} · {o.items.length} items ·{" "}
                    {new Date(o.createdAt).toLocaleTimeString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">${o.total.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">
                    {o.paymentMethod}
                    {o.orderStatus ? ` · ${o.orderStatus}` : ""}
                  </div>
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                No orders yet. Head to the POS to create your first sale.
              </div>
            )}
          </div>
        </Card>

        <Card className="rounded-2xl border-border">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-lg">Low Stock</h2>
            <Link
              to="/dashboard/inventory"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Manage
            </Link>
          </div>
          <div className="divide-y divide-border">
            {lowStock.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                All items are well stocked.
              </div>
            ) : (
              lowStock.slice(0, 8).map((p) => (
                <div
                  key={p.id}
                  className="p-4 flex items-center justify-between hover:bg-secondary/40"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.category_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-destructive">{p.stock}</div>
                    <div className="text-[10px] text-muted-foreground">
                      / {p.low_stock_threshold} min
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
