import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Printer, X } from "lucide-react";
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
import { fetchReport, type ReportData } from "@/lib/reports";
import { getCachedSettings, subscribeSettings } from "@/lib/systemSettings";
import { MOBILE_METHODS } from "@/lib/db";

type PaymentFilter = "all" | "Cash" | "Card" | "EVC-Plus" | "Premier Wallet" | "E-Dahab" | "Due" | "Split";
type Preset = "today" | "week" | "month" | "all" | "custom";

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const presetRange = (p: Preset): { from?: Date; to?: Date } => {
  const to = new Date();
  if (p === "today") return { from: startOfToday(), to };
  if (p === "week") {
    const from = startOfToday();
    from.setDate(from.getDate() - 6);
    return { from, to };
  }
  if (p === "month") {
    const from = new Date();
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
    return { from, to };
  }
  return { from: undefined, to: undefined };
};

const Reports = () => {
  const [preset, setPreset] = useState<Preset>("today");
  const [from, setFrom] = useState<Date | undefined>(startOfToday());
  const [to, setTo] = useState<Date | undefined>(new Date());
  const [payment, setPayment] = useState<PaymentFilter>("all");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState(getCachedSettings().currency_symbol);

  useEffect(() => {
    const unsub = subscribeSettings((s) => setSymbol(s.currency_symbol));
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchReport(from, to)
      .then((d) => active && setData(d))
      .catch(() => active && setData(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [from, to]);

  const money = (n: number) => `${symbol}${n.toFixed(2)}`;

  // Payment-method filter narrows the invoice set; every figure is still derived
  // from the stored invoice/payment records, never from displayed values.
  const view = useMemo(() => {
    if (!data) return null;
    if (payment === "all") return data;
    const invoices = data.invoices.filter((i) => i.payment_method === payment);
    const ids = new Set(invoices.map((i) => i.id));
    const payments = data.payments.filter((p) => ids.has(p.invoice_id));
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const totalSales = invoices.reduce((s, i) => s + i.total, 0);
    const tax = round2(invoices.reduce((s, i) => s + i.tax, 0));
    const deliveryFees = round2(invoices.reduce((s, i) => s + i.delivery_fee, 0));
    const expenses = 0; // expenses are not tied to a payment method
    const byMethod: Record<string, number> = {};
    payments.forEach((p) => {
      if (p.method === "Due" || p.amount <= 0) return;
      byMethod[p.method] = round2((byMethod[p.method] || 0) + p.amount);
    });
    const itemTotals = new Map<string, { qty: number; revenue: number }>();
    invoices.forEach((inv) =>
      inv.items.forEach((it) => {
        const cur = itemTotals.get(it.name) || { qty: 0, revenue: 0 };
        cur.qty += it.qty;
        cur.revenue += it.price * it.qty;
        itemTotals.set(it.name, cur);
      })
    );
    return {
      ...data,
      invoices,
      payments,
      topItems: [...itemTotals.entries()]
        .map(([name, t]) => ({ name, qty: t.qty, revenue: round2(t.revenue) }))
        .sort((a, b) => b.revenue - a.revenue),
      totals: {
        ...data.totals,
        orders: invoices.length,
        grossSales: round2(invoices.reduce((s, i) => s + i.subtotal, 0)),
        deliveryFees,
        tax,
        netSales: round2(totalSales - deliveryFees - tax),
        expenses,
        netProfit: round2(totalSales - expenses),
        discounts: round2(
          invoices.reduce((s, i) => s + Math.max(0, i.subtotal + i.delivery_fee - i.total), 0)
        ),
        totalSales: round2(totalSales),
        totalPaid: round2(invoices.reduce((s, i) => s + Math.min(i.paid_amount, i.total), 0)),
        totalDue: round2(
          invoices.reduce((s, i) => s + Math.max(0, i.total - i.paid_amount), 0)
        ),
        avgTicket: invoices.length ? round2(totalSales / invoices.length) : 0,
        byMethod,
        cash: byMethod["Cash"] || 0,
        card: byMethod["Card"] || 0,
        mobile: MOBILE_METHODS.reduce((s, m) => s + (byMethod[m] || 0), 0),
      },
    } as ReportData;
  }, [data, payment]);

  const t = view?.totals;
  const hasFilters = preset !== "all" || payment !== "all";

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p === "custom") return;
    const r = presetRange(p);
    setFrom(r.from);
    setTo(r.to);
  };

  const clearFilters = () => {
    setPayment("all");
    applyPreset("all");
  };

  const summary = [
    { label: "Total Sales", value: money(t?.totalSales ?? 0), strong: true },
    { label: "Orders", value: String(t?.orders ?? 0) },
    { label: "Total Tax", value: money(t?.tax ?? 0) },
    { label: "Discounts", value: money(t?.discounts ?? 0) },
    { label: "Total Paid", value: money(t?.totalPaid ?? 0) },
    { label: "Total Due", value: money(t?.totalDue ?? 0) },
  ];

  const rangeLabel = view
    ? `${view.range.fromDate} to ${view.range.toDate}`
    : "";

  const printReport = () => {
    if (!view || !t) return;
    const row = (l: string, v: string, strong = false) =>
      `<tr${strong ? ' class="strong"' : ""}><td>${l}</td><td class="r">${v}</td></tr>`;
    const html = `<!doctype html><html><head><meta charset="utf-8" />
<title>Report ${rangeLabel}</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff;margin:24px;}
h1{font-size:20px;margin:0 0 4px;}
.meta{font-size:12px;color:#444;margin-bottom:16px;}
h2{font-size:14px;margin:18px 0 6px;text-transform:uppercase;letter-spacing:.04em;}
table{width:100%;border-collapse:collapse;font-size:13px;}
td,th{padding:6px 4px;border-bottom:1px solid #ddd;text-align:left;}
.r{text-align:right;}
tr.strong td{font-weight:700;border-top:1px solid #000;}
</style></head><body>
<h1>Sales Report</h1>
<div class="meta">Date range: ${rangeLabel}<br/>Payment method: ${payment === "all" ? "All methods" : payment}<br/>Tax: ${(view.taxRate * 100).toFixed(2)}% ${view.taxInclusive ? "(inclusive)" : "(exclusive)"}<br/>Printed: ${format(new Date(), "PPpp")}</div>
<h2>Summary</h2><table>
${row("Orders", String(t.orders))}
${row("Gross Sales", money(t.grossSales))}
${row("Discounts", `- ${money(t.discounts)}`)}
${row("Delivery Fees", money(t.deliveryFees))}
${row("Total Tax", money(t.tax))}
${row("Net Sales", money(t.netSales))}
${row("Total Sales", money(t.totalSales), true)}
${row("Total Paid", money(t.totalPaid))}
${row("Total Due", money(t.totalDue), true)}
</table>
<h2>Money Received by Method</h2><table>
${methods.map((m) => row(m.label, money(m.value))).join("")}
${row("Total received", money(methodsTotal), true)}
</table>
<h2>Day by Day</h2><table>
<tr><th>Date</th><th class="r">Orders</th><th class="r">Sales</th><th class="r">Tax</th><th class="r">Paid</th><th class="r">Due</th></tr>
${view.daily
  .map(
    (d) =>
      `<tr><td>${d.date}</td><td class="r">${d.orders}</td><td class="r">${money(d.sales)}</td><td class="r">${money(d.tax)}</td><td class="r">${money(d.paid)}</td><td class="r">${money(d.due)}</td></tr>`
  )
  .join("")}
${`<tr class="strong"><td>Totals</td><td class="r">${t.orders}</td><td class="r">${money(t.totalSales)}</td><td class="r">${money(t.tax)}</td><td class="r">${money(t.totalPaid)}</td><td class="r">${money(t.totalDue)}</td></tr>`}
</table>
<script>window.onload=function(){window.print();}</script>
</body></html>`;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };

  const breakdown = [
    { label: "Gross Sales", value: money(t?.grossSales ?? 0) },
    { label: "Discounts", value: `- ${money(t?.discounts ?? 0)}` },
    { label: "Delivery Fees", value: money(t?.deliveryFees ?? 0) },
    { label: "Total Tax", value: money(t?.tax ?? 0) },
    { label: "Net Sales", value: money(t?.netSales ?? 0) },
    { label: "Avg. Ticket", value: money(t?.avgTicket ?? 0) },
    { label: "Expenses", value: `- ${money(t?.expenses ?? 0)}` },
    { label: "Net Profit", value: money(t?.netProfit ?? 0) },
  ];

  const methods = [
    { label: "Cash", value: t?.cash ?? 0 },
    { label: "Card", value: t?.card ?? 0 },
    { label: "Mobile (EVC / Premier / E-Dahab)", value: t?.mobile ?? 0 },
    { label: "Other methods", value: t?.other ?? 0 },
  ];
  const methodsTotal = Math.round(methods.reduce((s, m) => s + m.value, 0) * 100) / 100;


  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Calculated from your saved orders, payments and expenses.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          <Button variant="outline" onClick={printReport} disabled={!view || loading}>
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
        </div>
      </div>

      <Card className="p-4 md:p-5 rounded-2xl border-border space-y-4">
        <div className="flex flex-wrap gap-2">
          {([
            ["today", "Today"],
            ["week", "Last 7 days"],
            ["month", "This month"],
            ["all", "All time"],
          ] as [Preset, string][]).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={preset === key ? "default" : "outline"}
              onClick={() => applyPreset(key)}
            >
              {label}
            </Button>
          ))}
        </div>

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
                  onSelect={(d) => {
                    setPreset("custom");
                    setFrom(d);
                  }}
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
                  onSelect={(d) => {
                    setPreset("custom");
                    setTo(d);
                  }}
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

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {summary.map((s) => (
          <Card key={s.label} className="p-5 rounded-2xl border-border">
            <div className="text-sm text-muted-foreground">{s.label}</div>
            <div className={cn("font-bold mt-1", s.strong ? "text-3xl" : "text-2xl")}>
              {s.value}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6 rounded-2xl border-border">
          <h2 className="font-semibold text-lg mb-4">Sales Breakdown</h2>
          <div className="divide-y divide-border">
            {breakdown.map((b) => (
              <div key={b.label} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-muted-foreground">{b.label}</span>
                <span className="font-semibold">{b.value}</span>
              </div>
            ))}
            {(t?.refunds ?? 0) > 0 && (
              <div className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-muted-foreground">Refunds</span>
                <span className="font-semibold">- {money(t?.refunds ?? 0)}</span>
              </div>
            )}
            {(t?.voidedOrders ?? 0) > 0 && (
              <div className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-muted-foreground">
                  Cancelled / voided orders (excluded)
                </span>
                <span className="font-semibold">
                  {t?.voidedOrders} · {money(t?.voidedValue ?? 0)}
                </span>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-border">
          <h2 className="font-semibold text-lg mb-4">Money Received by Method</h2>
          <div className="space-y-3">
            {methods.map((m) => {
              const pct = methodsTotal ? (m.value / methodsTotal) * 100 : 0;
              return (
                <div key={m.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{m.label}</span>
                    <span className="text-muted-foreground">{money(m.value)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="pt-2 flex justify-between text-sm font-semibold border-t border-border">
              <span>Total received</span>
              <span>{money(methodsTotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Outstanding due</span>
              <span>{money(t?.totalDue ?? 0)}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6 rounded-2xl border-border">
          <h2 className="font-semibold text-lg mb-4">Top Selling Items</h2>
          <div className="space-y-3">
            {(view?.topItems ?? []).slice(0, 5).map((it, i) => (
              <div
                key={it.name}
                className="flex items-center justify-between p-3 rounded-xl bg-secondary/50"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{it.name}</div>
                    <div className="text-xs text-muted-foreground">{it.qty} sold</div>
                  </div>
                </div>
                <div className="font-bold">{money(it.revenue)}</div>
              </div>
            ))}
            {!loading && (view?.topItems.length ?? 0) === 0 && (
              <div className="text-sm text-muted-foreground">No data for selected filters.</div>
            )}
          </div>
        </Card>

        <Card className="rounded-2xl border-border overflow-hidden">
          <div className="p-6 pb-3">
            <h2 className="font-semibold text-lg">Day by Day</h2>
          </div>
          <div className="divide-y divide-border max-h-[320px] overflow-auto">
            {(view?.daily ?? []).slice(0, 31).map((d) => (
              <div key={d.date} className="px-6 py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-semibold">{d.date}</div>
                  <div className="text-xs text-muted-foreground">{d.orders} orders</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{money(d.sales)}</div>
                  <div className="text-xs text-muted-foreground">
                    paid {money(d.paid)} · due {money(d.due)}
                  </div>
                </div>
              </div>
            ))}
            {!loading && (view?.daily.length ?? 0) === 0 && (
              <div className="px-6 py-8 text-sm text-muted-foreground">
                No orders for selected filters.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
