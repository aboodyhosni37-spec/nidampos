import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, Eye, CreditCard, Printer } from "lucide-react";
import {
  fetchOrders,
  updateOrderStatus,
  type Order,
  type OrderWorkflowStatus,
} from "@/lib/orders";
import { ReceiptPreview } from "@/components/ReceiptPreview";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { payUnpaidInvoice, type PaymentMethod } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STATUSES: OrderWorkflowStatus[] = ["Pending", "Preparing", "Completed", "Unpaid"];
const PAY_METHODS: Exclude<PaymentMethod, "Due" | "Split">[] = [
  "EVC-Plus",
  "Premier Wallet",
  "E-Dahab",
  "Cash",
  "Card",
];

const statusStyles: Record<OrderWorkflowStatus, string> = {
  Pending: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  Preparing: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  Completed: "bg-primary/10 text-primary border-primary/30",
  Unpaid: "bg-rose-500/15 text-rose-700 border-rose-500/30",
};

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"All" | OrderWorkflowStatus>("All");
  const [selected, setSelected] = useState<Order | null>(null);

  // Pay-now dialog state
  const [payOrder, setPayOrder] = useState<Order | null>(null);
  const [payMethod, setPayMethod] = useState<typeof PAY_METHODS[number]>("EVC-Plus");
  const [paying, setPaying] = useState(false);

  const refresh = async () => {
    try {
      setOrders(await fetchOrders());
    } catch (e: any) {
      toast({ title: "Failed to load orders", description: e.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("orders-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invoices" },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleStatusChange = async (o: Order, status: OrderWorkflowStatus) => {
    // Optimistic
    setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, orderStatus: status } : x)));
    try {
      await updateOrderStatus(o.id, status);
    } catch (e: any) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
      refresh();
    }
  };

  const handlePayNow = async () => {
    if (!payOrder) return;
    const due = payOrder.dueAmount ?? payOrder.total;
    if (due <= 0) {
      toast({ title: "Nothing to pay" });
      setPayOrder(null);
      return;
    }
    setPaying(true);
    try {
      await payUnpaidInvoice({
        invoice_id: payOrder.id,
        amount: due,
        method: payMethod,
        customer_id: undefined,
      });
      toast({
        title: "Payment received",
        description: `Order #${payOrder.number} marked as PAID via ${payMethod}.`,
      });
      setPayOrder(null);
      refresh();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setPaying(false);
    }
  };

  const filtered = orders
    .filter((o) => (filter === "All" ? true : (o.orderStatus ?? "Completed") === filter))
    .filter(
      (o) =>
        o.number.toString().includes(q) ||
        o.table.toLowerCase().includes(q.toLowerCase()) ||
        o.paymentMethod.toLowerCase().includes(q.toLowerCase())
    );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground mt-1">All orders processed at your restaurant.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-36 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders…"
              className="pl-10 rounded-xl"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Card className="rounded-2xl overflow-hidden border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-muted-foreground">
              <tr className="text-left">
                <th className="p-4 font-semibold">Order #</th>
                <th className="p-4 font-semibold">Table</th>
                <th className="p-4 font-semibold">Items</th>
                <th className="p-4 font-semibold">Payment</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Time</th>
                <th className="p-4 font-semibold text-right">Total</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((o) => {
                const st = (o.orderStatus ?? "Completed") as OrderWorkflowStatus;
                const isUnpaid = st === "Unpaid" || (o.dueAmount ?? 0) > 0;
                return (
                  <tr key={o.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="p-4 font-semibold">#{o.number}</td>
                    <td className="p-4">{o.table}</td>
                    <td className="p-4">{o.items.length}</td>
                    <td className="p-4">{o.paymentMethod}</td>
                    <td className="p-4">
                      <Select
                        value={st}
                        onValueChange={(v) => handleStatusChange(o, v as OrderWorkflowStatus)}
                      >
                        <SelectTrigger
                          className={cn(
                            "h-8 w-32 rounded-full border text-xs font-semibold",
                            statusStyles[st]
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(o.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 text-right font-bold">${o.total.toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {isUnpaid && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setPayOrder(o);
                              setPayMethod("EVC-Plus");
                            }}
                            className="h-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            <CreditCard className="h-3.5 w-3.5 mr-1" /> Pay Now
                          </Button>
                        )}
                        <button
                          onClick={() => setSelected(o)}
                          className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium px-2"
                        >
                          <Eye className="h-4 w-4" /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && (
        <ReceiptPreview order={selected} onClose={() => setSelected(null)} autoPrint={false} />
      )}

      <Dialog open={!!payOrder} onOpenChange={(o) => !o && setPayOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Pay Now · Order #{payOrder?.number}
            </DialogTitle>
            <DialogDescription>
              Settle the unpaid balance using a mobile or cash method.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary">
              <div>
                <div className="text-xs text-muted-foreground">Amount due</div>
                <div className="text-2xl font-bold tabular-nums">
                  ${(payOrder?.dueAmount ?? payOrder?.total ?? 0).toFixed(2)}
                </div>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-rose-500/15 text-rose-600">
                Unpaid
              </span>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-2 gap-2">
                {PAY_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPayMethod(m)}
                    className={cn(
                      "h-11 rounded-xl border text-sm font-semibold transition-all",
                      payMethod === m
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 border-transparent shadow-soft"
                        : "bg-card border-border hover:border-primary/40"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setPayOrder(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => payOrder && setSelected(payOrder)}
              className="rounded-xl"
            >
              <Printer className="h-4 w-4 mr-1.5" /> Print Receipt
            </Button>
            <Button
              onClick={handlePayNow}
              disabled={paying}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {paying ? "Processing…" : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;
