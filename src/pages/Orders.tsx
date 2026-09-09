import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Eye, CreditCard, Printer, Merge, Pencil, Plus, Minus, Trash2, Wallet, UserPlus } from "lucide-react";

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
import {
  payUnpaidInvoice,
  listCustomers,
  assignInvoiceToCustomer,
  type Customer,
  type PaymentMethod,
} from "@/lib/db";
import { useSearchParams } from "react-router-dom";

import {
  fetchInvoiceDetail,
  saveInvoiceItems,
  mergeInvoices,
  type EditableItem,
  type InvoiceDetail,
} from "@/lib/invoiceEdit";
import { listProducts, type DbProduct } from "@/lib/menu";
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
  Pending: "bg-secondary text-foreground border-border",
  Preparing: "bg-accent text-accent-foreground border-border",
  Completed: "bg-primary/10 text-primary border-primary/30",
  Unpaid: "bg-foreground text-background border-foreground",
};

const Orders = () => {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"All" | "Due" | OrderWorkflowStatus>(
    searchParams.get("filter") === "due" ? "Due" : "All"
  );
  const [selected, setSelected] = useState<Order | null>(null);

  // Customer due drawer
  const [dueCustomer, setDueCustomer] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Assign a due order to a customer
  const [assignOrder, setAssignOrder] = useState<Order | null>(null);
  const [assignCustomerId, setAssignCustomerId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);


  // Pay-now dialog state
  const [payOrder, setPayOrder] = useState<Order | null>(null);
  const [payMethod, setPayMethod] = useState<typeof PAY_METHODS[number]>("EVC-Plus");
  const [paying, setPaying] = useState(false);

  // Merge state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [merging, setMerging] = useState(false);

  // Edit state
  const [editInvoice, setEditInvoice] = useState<InvoiceDetail | null>(null);
  const [editItems, setEditItems] = useState<EditableItem[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [productQuery, setProductQuery] = useState("");


  const refresh = async () => {
    try {
      setOrders(await fetchOrders());
    } catch (e: any) {
      toast({ title: "Failed to load orders", description: e.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    refresh();
    listCustomers().then(setCustomers).catch(() => {});

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
        customer_id: payOrder.customerId ?? undefined,
      });
      toast({
        title: "Payment received",
        description: `Order #${payOrder.number} marked as PAID via ${payMethod}.`,
      });
      setPayOrder(null);
      refresh();
      listCustomers().then(setCustomers).catch(() => {});
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setPaying(false);
    }
  };

  const handleAssign = async () => {
    if (!assignOrder || !assignCustomerId) return;
    setAssigning(true);
    try {
      const res = await assignInvoiceToCustomer(assignOrder.id, assignCustomerId);
      toast({
        title: "Order assigned",
        description: `Order #${assignOrder.number} now sits under ${res.customer_name}'s due.`,
      });
      setAssignOrder(null);
      setAssignCustomerId("");
      await refresh();
      listCustomers().then(setCustomers).catch(() => {});
      setDueCustomer(res.customer_id);
    } catch (e: any) {
      toast({ title: "Failed to assign", description: e.message, variant: "destructive" });
    } finally {
      setAssigning(false);
    }
  };


  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleMerge = async () => {
    setMerging(true);
    try {
      const res = await mergeInvoices(selectedIds);
      toast({
        title: "Orders merged",
        description: `Combined into order #${res.number}. Paid $${res.paid.toFixed(
          2
        )}, remaining $${res.due.toFixed(2)}.`,
      });
      setSelectedIds([]);
      setMergeOpen(false);
      refresh();
    } catch (e: any) {
      toast({ title: "Merge failed", description: e.message, variant: "destructive" });
    } finally {
      setMerging(false);
    }
  };

  const openEdit = async (o: Order) => {
    try {
      const detail = await fetchInvoiceDetail(o.id);
      setEditInvoice(detail);
      setEditItems(detail.items.map((i) => ({ ...i })));
      setProductQuery("");
      if (products.length === 0) setProducts(await listProducts());
    } catch (e: any) {
      toast({ title: "Could not open order", description: e.message, variant: "destructive" });
    }
  };

  const changeQty = (idx: number, delta: number) =>
    setEditItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, qty: Math.max(0, it.qty + delta) } : it))
    );

  const removeItem = (idx: number) =>
    setEditItems((prev) => prev.filter((_, i) => i !== idx));

  const addProduct = (p: DbProduct) =>
    setEditItems((prev) => {
      const hit = prev.findIndex((i) => i.name === p.name && i.price === Number(p.price));
      if (hit >= 0)
        return prev.map((it, i) => (i === hit ? { ...it, qty: it.qty + 1 } : it));
      return [
        ...prev,
        { product_id: p.id, name: p.name, price: Number(p.price), qty: 1 },
      ];
    });

  const editTotal = editItems.reduce((s, i) => s + i.price * i.qty, 0);
  const editPaid = editInvoice?.paid_amount ?? 0;
  const editDue = Math.max(0, editTotal - editPaid);

  const productMatches = useMemo(() => {
    const t = productQuery.trim().toLowerCase();
    if (!t) return [];
    return products.filter((p) => p.name.toLowerCase().includes(t)).slice(0, 8);
  }, [productQuery, products]);

  const handleSaveEdit = async () => {
    if (!editInvoice) return;
    setSavingEdit(true);
    try {
      const res = await saveInvoiceItems(editInvoice.id, editItems);
      toast({
        title: "Order updated",
        description: `New total $${res.total.toFixed(2)} · paid $${res.paid.toFixed(
          2
        )} · due $${res.due.toFixed(2)}.`,
      });
      setEditInvoice(null);
      refresh();
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const filtered = orders
    .filter((o) =>
      filter === "All"
        ? true
        : filter === "Due"
        ? (o.dueAmount ?? 0) > 0
        : (o.orderStatus ?? "Completed") === filter
    )
    .filter(
      (o) =>
        o.number.toString().includes(q) ||
        o.table.toLowerCase().includes(q.toLowerCase()) ||
        (o.customer || "").toLowerCase().includes(q.toLowerCase()) ||
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
          {selectedIds.length >= 2 && (
            <Button
              onClick={() => setMergeOpen(true)}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
            >
              <Merge className="h-4 w-4 mr-1.5" /> Merge ({selectedIds.length})
            </Button>
          )}
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>

            <SelectTrigger className="w-36 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All statuses</SelectItem>
              <SelectItem value="Due">Due orders</SelectItem>

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
                <th className="p-4 w-10"></th>
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
                    <td className="p-4">
                      <Checkbox
                        checked={selectedIds.includes(o.id)}
                        onCheckedChange={() => toggleSelected(o.id)}
                        aria-label={`Select order ${o.number}`}
                      />
                    </td>
                    <td className="p-4 font-semibold">
                      #{o.number}
                      {o.customer && (
                        <div className="text-xs font-normal text-muted-foreground">
                          {o.customer}
                        </div>
                      )}
                      {isUnpaid && (
                        <div className="text-xs font-normal text-muted-foreground">
                          Due ${(o.dueAmount ?? o.total).toFixed(2)}
                        </div>
                      )}
                    </td>


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
                        {isUnpaid && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(o)}
                            className="h-8 rounded-lg"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                        )}
                        {isUnpaid && o.customer && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDueCustomer(o.customer!)}
                            className="h-8 rounded-lg"
                          >
                            <Wallet className="h-3.5 w-3.5 mr-1" /> Customer Due
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
                  <td colSpan={9} className="p-12 text-center text-muted-foreground">
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

      {/* Customer due — outstanding balance + unpaid / partially-paid orders */}
      <Dialog open={!!dueCustomer} onOpenChange={(o) => !o && setDueCustomer(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dueCustomer} · Customer due</DialogTitle>
            <DialogDescription>
              Outstanding balance and the orders that are still unpaid.
            </DialogDescription>
          </DialogHeader>
          {dueCustomer && (() => {
            const record = customers.find(
              (c) => c.name.toLowerCase() === dueCustomer.toLowerCase()
            );
            const dueOrders = orders.filter(
              (o) =>
                (o.customer || "").toLowerCase() === dueCustomer.toLowerCase() &&
                (o.dueAmount ?? 0) > 0
            );
            const orderDue = dueOrders.reduce((s, o) => s + (o.dueAmount ?? 0), 0);
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-secondary">
                    <div className="text-xs text-muted-foreground">Customer balance</div>
                    <div className="text-xl font-bold">
                      ${Number(record?.due_balance ?? 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary">
                    <div className="text-xs text-muted-foreground">Due on orders</div>
                    <div className="text-xl font-bold">${orderDue.toFixed(2)}</div>
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                  {dueOrders.length === 0 && (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      No unpaid orders — everything is settled.
                    </div>
                  )}
                  {dueOrders.map((o) => (
                    <div key={o.id} className="p-3 flex items-center justify-between text-sm">
                      <div>
                        <div className="font-semibold">Order #{o.number}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(o.createdAt).toLocaleString()} · {o.items.length} items
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">${(o.dueAmount ?? 0).toFixed(2)} due</div>
                        <div className="text-xs text-muted-foreground">
                          ${o.total.toFixed(2)} total · ${(o.paidAmount ?? 0).toFixed(2)} paid
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>



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
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-foreground text-background">
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

      {/* Merge confirmation */}
      <Dialog open={mergeOpen} onOpenChange={(o) => !o && setMergeOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Merge {selectedIds.length} orders?</DialogTitle>
            <DialogDescription>
              The items will be combined into the oldest order, matching products added together.
              Payments already taken are kept and never charged twice.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-secondary p-3 text-sm space-y-1">
            {orders
              .filter((o) => selectedIds.includes(o.id))
              .map((o) => (
                <div key={o.id} className="flex justify-between">
                  <span>#{o.number} · {o.table}</span>
                  <span className="font-semibold tabular-nums">${o.total.toFixed(2)}</span>
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeOpen(false)} className="rounded-xl">
              No, cancel
            </Button>
            <Button
              onClick={handleMerge}
              disabled={merging}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {merging ? "Merging…" : "Yes, merge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit unpaid / partially paid order */}
      <Dialog open={!!editInvoice} onOpenChange={(o) => !o && setEditInvoice(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Order #{editInvoice?.number}</DialogTitle>
            <DialogDescription>
              Change items and quantities. Money already paid stays as it is — only the remaining
              balance is recalculated.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {editItems.map((it, idx) => (
                <div
                  key={`${it.name}-${idx}`}
                  className="flex items-center gap-2 rounded-xl bg-secondary/50 p-3 min-h-16"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm break-words">{it.name}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      ${it.price.toFixed(2)} each
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 rounded-lg"
                    onClick={() => changeQty(idx, -1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-bold tabular-nums">{it.qty}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 rounded-lg"
                    onClick={() => changeQty(idx, 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <div className="w-16 text-right font-bold text-sm tabular-nums">
                    ${(it.price * it.qty).toFixed(2)}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeItem(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {editItems.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No items — add at least one below.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Add item</Label>
              <Input
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="Search products…"
                className="h-11 rounded-xl"
              />
              {productMatches.length > 0 && (
                <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                  {productMatches.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        addProduct(p);
                        setProductQuery("");
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-secondary/60 text-left"
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="font-semibold tabular-nums">
                        ${Number(p.price).toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-secondary p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">New total</span>
                <span className="font-semibold tabular-nums">${editTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Already paid</span>
                <span className="font-semibold tabular-nums">${editPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base pt-1 border-t border-border">
                <span className="font-semibold">Remaining due</span>
                <span className="font-bold tabular-nums">${editDue.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditInvoice(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={savingEdit || editItems.filter((i) => i.qty > 0).length === 0}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {savingEdit ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  );
};

export default Orders;
