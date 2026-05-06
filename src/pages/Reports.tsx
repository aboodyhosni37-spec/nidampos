import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { loadOrders, type Order } from "@/lib/orders";

type PaymentFilter = "all" | Order["paymentMethod"];

const Reports = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [payment, setPayment] = useState<PaymentFilter>("all");

  useEffect(() => setOrders(loadOrders()), []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const created = new Date(o.createdAt);
      if (from) {
        const start = new Date(from);
        start.setHours(0, 0, 0, 0);
        if (created < start) return false;
      }
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        if (created > end) return false;
      }
      if (payment !== "all" && o.paymentMethod !== payment) return false;
      return true;
    });
  }, [orders, from, to, payment]);

  const total = filtered.reduce((s, o) => s + o.total, 0);
  const byPayment = filtered.reduce<Record<string, number>>((acc, o) => {
    acc[o.paymentMethod] = (acc[o.paymentMethod] || 0) + o.total;
    return acc;
  }, {});

  const itemTotals: Record<string, { qty: number; revenue: number }> = {};
  filtered.forEach((o) =>
    o.items.forEach((it) => {
      const cur = itemTotals[it.name] || { qty: 0, revenue: 0 };
      cur.qty += it.qty;
      cur.revenue += it.price * it.qty;
      itemTotals[it.name] = cur;
    })
  );
  const top = Object.entries(itemTotals)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);

  const hasFilters = from || to || payment !== "all";
  const clearFilters = () => {
    setFrom(undefined);
    setTo(undefined);
    setPayment("all");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground mt-1">Sales performance and insights.</p>
      </div>

      <Card className="p-4 md:p-5 rounded-2xl border-border">
        <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full md:w-[180px] justify-start text-left font-normal",
                    !from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {from ? format(from, "PP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={from}
                  onSelect={setFrom}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full md:w-[180px] justify-start text-left font-normal",
                    !to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {to ? format(to, "PP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={to}
                  onSelect={setTo}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Payment Method</Label>
            <Select value={payment} onValueChange={(v) => setPayment(v as PaymentFilter)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="EVC-Plus">EVC-Plus</SelectItem>
                <SelectItem value="Premier Wallet">Premier Wallet</SelectItem>
                <SelectItem value="E-Dahab">E-Dahab</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
                <SelectItem value="Due">Due</SelectItem>
                <SelectItem value="Split">Split</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="md:ml-auto text-muted-foreground hover:text-foreground"
            >
              <X className="mr-1 h-4 w-4" />
              Clear filters
            </Button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 rounded-2xl border-border">
          <div className="text-sm text-muted-foreground">Total Revenue</div>
          <div className="text-3xl font-bold mt-1">${total.toFixed(2)}</div>
        </Card>
        <Card className="p-5 rounded-2xl border-border">
          <div className="text-sm text-muted-foreground">Orders</div>
          <div className="text-3xl font-bold mt-1">{filtered.length}</div>
        </Card>
        <Card className="p-5 rounded-2xl border-border">
          <div className="text-sm text-muted-foreground">Avg. Ticket</div>
          <div className="text-3xl font-bold mt-1">
            ${filtered.length ? (total / filtered.length).toFixed(2) : "0.00"}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6 rounded-2xl border-border">
          <h2 className="font-semibold text-lg mb-4">Revenue by Payment</h2>
          <div className="space-y-3">
            {Object.entries(byPayment).map(([method, amount]) => {
              const pct = total ? (amount / total) * 100 : 0;
              return (
                <div key={method}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{method}</span>
                    <span className="text-muted-foreground">${amount.toFixed(2)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-gradient-button transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {Object.keys(byPayment).length === 0 && (
              <div className="text-sm text-muted-foreground">No data for selected filters.</div>
            )}
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-border">
          <h2 className="font-semibold text-lg mb-4">Top Selling Items</h2>
          <div className="space-y-3">
            {top.map(([name, t], i) => (
              <div key={name} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-button text-white flex items-center justify-center font-bold text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{name}</div>
                    <div className="text-xs text-muted-foreground">{t.qty} sold</div>
                  </div>
                </div>
                <div className="font-bold">${t.revenue.toFixed(2)}</div>
              </div>
            ))}
            {top.length === 0 && (
              <div className="text-sm text-muted-foreground">No data for selected filters.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
