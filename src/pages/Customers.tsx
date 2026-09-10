import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Users,
  UserPlus,
  Search,
  Phone,
  MapPin,
  AlertTriangle,
  Wallet,
  TrendingDown,
  History,
  Pencil,
  Trash2,
  Receipt,
  Star,
  Printer,
} from "lucide-react";
import { fetchOrders, type Order } from "@/lib/orders";
import {
  listLoyaltyHistory,
  summarizeLoyalty,
  rewardLabel,
  type LoyaltyTransaction,
} from "@/lib/loyalty";
import { loadReceiptSettings } from "@/lib/receiptSettings";
import { ReceiptPreview } from "@/components/ReceiptPreview";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  createCustomer,
  deleteCustomer,
  listCustomerDueHistory,
  listCustomers,
  recordRepayment,
  updateCustomer,
  type Customer,
  type DueTransaction,
  type PaymentMethod,
} from "@/lib/db";

const HIGH_DEBT = 100;
const REPAY_METHODS: Exclude<PaymentMethod, "Due" | "Split">[] = [
  "Cash",
  "EVC-Plus",
  "Premier Wallet",
  "E-Dahab",
  "Card",
];

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // New customer dialog
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");

  // History / repayment
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<DueTransaction[]>([]);
  const [repayOpen, setRepayOpen] = useState(false);
  const [repayAmount, setRepayAmount] = useState("");
  const [repayMethod, setRepayMethod] = useState<typeof REPAY_METHODS[number]>("Cash");
  const [repaySubmitting, setRepaySubmitting] = useState(false);

  // Edit / delete
  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  // Order review + invoice printing (uses the existing receipt system)
  const [reviewCustomer, setReviewCustomer] = useState<Customer | null>(null);
  const [reviewOrders, setReviewOrders] = useState<Order[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [loyaltyHistory, setLoyaltyHistory] = useState<LoyaltyTransaction[]>([]);
  const [printAll, setPrintAll] = useState(false);

  const openReview = async (c: Customer) => {
    setReviewCustomer(c);
    setReviewOrders([]);
    setLoyaltyHistory([]);
    setExpandedOrder(null);
    setReviewLoading(true);
    try {
      const [all, loyalty] = await Promise.all([
        fetchOrders(),
        listLoyaltyHistory(c.id).catch(() => [] as LoyaltyTransaction[]),
      ]);
      setReviewOrders(
        all.filter(
          (o) =>
            o.customerId === c.id ||
            (!o.customerId && (o.customer || "").toLowerCase() === c.name.toLowerCase())
        )
      );
      setLoyaltyHistory(loyalty);
    } catch (e: any) {
      toast({ title: "Failed to load orders", description: e.message, variant: "destructive" });
    } finally {
      setReviewLoading(false);
    }
  };

  // Print the customer's complete order history using the existing print node.
  const handlePrintAll = () => {
    setPrintAll(true);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        try {
          window.print();
        } catch {
          /* ignore */
        }
        setPrintAll(false);
      })
    );
  };



  const startEdit = (c: Customer) => {
    setEditTarget(c);
    setEditName(c.name);
    setEditPhone(c.phone || "");
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    if (!editName.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    try {
      await updateCustomer(editTarget.id, {
        name: editName.trim(),
        phone: editPhone.trim() || null,
      });
      toast({ title: "Customer updated" });
      setEditTarget(null);
      refresh();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCustomer(deleteTarget.id);
      toast({ title: "Customer deleted" });
      setDeleteTarget(null);
      refresh();
    } catch (e: any) {
      toast({ title: "Cannot delete", description: e.message, variant: "destructive" });
    }
  };

  const refresh = async () => {
    setLoading(true);
    try {
      setCustomers(await listCustomers());
    } catch (e: any) {
      toast({ title: "Failed to load customers", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q)
    );
  }, [customers, search]);

  const totalOutstanding = customers.reduce((s, c) => s + Number(c.due_balance || 0), 0);
  const withDebt = customers.filter((c) => Number(c.due_balance) > 0).length;
  const highDebt = customers.filter((c) => Number(c.due_balance) >= HIGH_DEBT).length;

  const openHistory = async (c: Customer) => {
    setActiveCustomer(c);
    try {
      setHistory(await listCustomerDueHistory(c.id));
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    try {
      await createCustomer({ name: newName, phone: newPhone, address: newAddress });
      toast({ title: "Customer added" });
      setNewOpen(false);
      setNewName("");
      setNewPhone("");
      setNewAddress("");
      refresh();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const handleRepay = async () => {
    if (!activeCustomer) return;
    const amt = parseFloat(repayAmount);
    if (!amt || amt <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    if (amt > Number(activeCustomer.due_balance)) {
      toast({
        title: "Amount exceeds balance",
        description: `Outstanding is $${Number(activeCustomer.due_balance).toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }
    setRepaySubmitting(true);
    try {
      await recordRepayment({
        customer_id: activeCustomer.id,
        amount: amt,
        method: repayMethod,
      });
      toast({ title: "Payment recorded", description: `$${amt.toFixed(2)} via ${repayMethod}` });
      setRepayOpen(false);
      setRepayAmount("");
      // refresh both customer list + open history
      await refresh();
      const updated = (await listCustomers()).find((c) => c.id === activeCustomer.id) || null;
      if (updated) {
        setActiveCustomer(updated);
        setHistory(await listCustomerDueHistory(updated.id));
      }
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setRepaySubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers & Dues</h1>
          <p className="text-muted-foreground mt-1">
            Manage customer credit, view balances, and record repayments.
          </p>
        </div>
        <Button
          className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft"
          onClick={() => setNewOpen(true)}
        >
          <UserPlus className="h-4 w-4 mr-2" /> Add customer
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          icon={<Wallet className="h-5 w-5" />}
          label="Total Outstanding"
          value={`$${totalOutstanding.toFixed(2)}`}
          color="from-primary to-primary/80"
        />
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          label="Customers with Debt"
          value={`${withDebt} / ${customers.length}`}
          color="from-primary to-primary/80"
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="High Debt Alerts"
          value={highDebt.toString()}
          color="from-primary to-primary/80"
        />
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone…"
          className="pl-10 h-11 rounded-xl"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      <Card className="rounded-2xl border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
            No customers yet. Add one to start tracking dues.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((c) => {
              const debt = Number(c.due_balance);
              const isHigh = debt >= HIGH_DEBT;
              const hasDebt = debt > 0;
              return (
                <div
                  key={c.id}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-secondary/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center font-bold shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate flex items-center gap-2">
                        {c.name}
                        {isHigh && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-secondary text-foreground px-1.5 py-0.5 rounded">
                            <AlertTriangle className="h-3 w-3" /> High debt
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {c.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {c.phone}
                          </span>
                        )}
                        {c.address && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {c.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Due</div>
                      <div
                        className={cn(
                          "font-bold tabular-nums",
                          hasDebt ? "text-foreground" : "text-primary"
                        )}
                      >
                        ${debt.toFixed(2)}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openReview(c)}
                      className="rounded-lg"
                    >
                      <Receipt className="h-3.5 w-3.5 mr-1" /> Orders
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openHistory(c)}
                      className="rounded-lg"
                    >
                      <History className="h-3.5 w-3.5 mr-1" /> History
                    </Button>

                    <Button
                      size="sm"
                      disabled={!hasDebt}
                      onClick={() => {
                        setActiveCustomer(c);
                        setRepayAmount(debt.toFixed(2));
                        setRepayMethod("Cash");
                        setRepayOpen(true);
                      }}
                      className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <TrendingDown className="h-3.5 w-3.5 mr-1" /> Pay
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => startEdit(c)}
                      className="rounded-lg h-8 w-8"
                      title="Edit name / phone"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setDeleteTarget(c)}
                      disabled={hasDebt}
                      className="rounded-lg h-8 w-8 text-destructive disabled:opacity-40"
                      title={hasDebt ? "Cannot delete — outstanding balance" : "Delete customer"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* New customer dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add new customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Address (optional)</Label>
              <Input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog
        open={!!activeCustomer && !repayOpen}
        onOpenChange={(o) => {
          if (!o) setActiveCustomer(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {activeCustomer?.name} · Payment history
            </DialogTitle>
          </DialogHeader>
          {activeCustomer && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary">
                <div>
                  <div className="text-xs text-muted-foreground">Outstanding balance</div>
                  <div className="text-2xl font-bold">
                    ${Number(activeCustomer.due_balance).toFixed(2)}
                  </div>
                </div>
                <Button
                  disabled={Number(activeCustomer.due_balance) <= 0}
                  onClick={() => {
                    setRepayAmount(Number(activeCustomer.due_balance).toFixed(2));
                    setRepayMethod("Cash");
                    setRepayOpen(true);
                  }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
                >
                  Record payment
                </Button>
              </div>

              <div className="max-h-80 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                {history.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No transactions yet.
                  </div>
                )}
                {history.map((t) => (
                  <div key={t.id} className="p-3 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">
                        {t.type === "charge" ? "Credit charged" : "Repayment"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleString()}
                        {t.method ? ` · ${t.method}` : ""}
                        {t.note ? ` · ${t.note}` : ""}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "font-bold tabular-nums",
                        t.type === "charge" ? "text-foreground" : "text-primary"
                      )}
                    >
                      {t.type === "charge" ? "+" : "−"}${Number(t.amount).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Repayment dialog */}
      <Dialog open={repayOpen} onOpenChange={setRepayOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record payment · {activeCustomer?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="text-sm text-muted-foreground">
              Outstanding:{" "}
              <span className="font-semibold text-foreground">
                ${Number(activeCustomer?.due_balance || 0).toFixed(2)}
              </span>
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select
                value={repayMethod}
                onValueChange={(v) => setRepayMethod(v as typeof REPAY_METHODS[number])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPAY_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRepayOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRepay}
              disabled={repaySubmitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {repaySubmitting ? "Saving…" : "Confirm payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit customer (name + phone only) */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Financial history (dues & payments) cannot be edited.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={handleEditSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer profile: loyalty points + all orders */}
      <Dialog open={!!reviewCustomer} onOpenChange={(o) => !o && setReviewCustomer(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{reviewCustomer?.name} · Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1 max-h-[70vh] overflow-y-auto">
            {/* Loyalty points */}
            {reviewCustomer && (
              <div className="rounded-xl border border-border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm inline-flex items-center gap-1.5">
                    <Star className="h-4 w-4" /> Loyalty Points
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {rewardLabel(reviewCustomer.reward_status)}
                  </span>
                </div>
                {(() => {
                  const s = summarizeLoyalty(
                    Number(reviewCustomer.loyalty_points || 0),
                    loyaltyHistory
                  );
                  return (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-secondary p-2">
                        <div className="text-xl font-bold tabular-nums">{s.balance}</div>
                        <div className="text-[11px] text-muted-foreground">Balance</div>
                      </div>
                      <div className="rounded-lg bg-secondary p-2">
                        <div className="text-xl font-bold tabular-nums">{s.earned}</div>
                        <div className="text-[11px] text-muted-foreground">Earned</div>
                      </div>
                      <div className="rounded-lg bg-secondary p-2">
                        <div className="text-xl font-bold tabular-nums">{s.redeemed}</div>
                        <div className="text-[11px] text-muted-foreground">Redeemed</div>
                      </div>
                    </div>
                  );
                })()}
                <div className="rounded-lg border border-border divide-y divide-border max-h-48 overflow-y-auto">
                  {loyaltyHistory.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No loyalty activity yet.
                    </div>
                  ) : (
                    loyaltyHistory.map((t) => (
                      <div key={t.id} className="p-2 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-medium">
                            {t.type === "earn" ? "Points earned" : "Points redeemed"}
                            {t.invoice_number ? ` · Order #${t.invoice_number}` : ""}
                          </div>
                          <div className="text-muted-foreground">
                            {new Date(t.created_at).toLocaleString()}
                            {t.note ? ` · ${t.note}` : ""}
                          </div>
                        </div>
                        <div className="font-bold tabular-nums">
                          {t.type === "earn" ? "+" : "−"}
                          {Number(t.points || 0)} pts
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* All orders */}
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm">All Orders ({reviewOrders.length})</div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg h-8"
                disabled={reviewOrders.length === 0}
                onClick={handlePrintAll}
              >
                <Printer className="h-3.5 w-3.5 mr-1" /> Print All Orders
              </Button>
            </div>

            {reviewLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : reviewOrders.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No orders recorded for this customer yet.
              </div>
            ) : (
              <div className="rounded-xl border border-border divide-y divide-border">
                {reviewOrders.map((o) => {
                  const due = Math.max(0, o.total - (o.paidAmount ?? 0));
                  const paid = o.paidAmount ?? 0;
                  const status = due <= 0 ? "Paid" : paid > 0 ? "Partially paid" : "Unpaid";
                  const open = expandedOrder === o.id;
                  return (
                    <div key={o.id} className="p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold">
                            Order #{o.number}{" "}
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-secondary px-1.5 py-0.5 rounded">
                              {orderTypeLabel(o)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(o.createdAt).toLocaleString()} · {o.items.length} items ·{" "}
                            {o.paymentMethod}
                          </div>
                          <div className="text-xs mt-1">
                            <span className="font-semibold">{status}</span>
                            {" · "}total ${o.total.toFixed(2)} · paid ${paid.toFixed(2)} · due $
                            {due.toFixed(2)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-lg h-8"
                            onClick={() => setExpandedOrder(open ? null : o.id)}
                          >
                            {open ? "Hide" : "View Order"}
                          </Button>
                          <Button
                            size="sm"
                            className="rounded-lg h-8 bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() => setReceiptOrder(o)}
                          >
                            <Receipt className="h-3.5 w-3.5 mr-1" /> Print Invoice
                          </Button>
                        </div>
                      </div>
                      {open && (
                        <div className="mt-2 rounded-lg bg-secondary/60 p-2 space-y-1">
                          <div className="text-xs text-muted-foreground">
                            Type: {orderTypeLabel(o)}
                            {o.table ? ` · Table ${o.table}` : ""} · Status:{" "}
                            {o.orderStatus || "—"}
                          </div>
                          {o.items.map((it, i) => (
                            <div key={`${o.id}-${i}`} className="flex justify-between text-xs">
                              <span>
                                {it.qty} × {it.name}
                              </span>
                              <span className="tabular-nums">
                                ${(it.price * it.qty).toFixed(2)}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between text-xs font-semibold border-t border-border pt-1">
                            <span>Total</span>
                            <span className="tabular-nums">${o.total.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {printAll && reviewCustomer && (
        <OrderHistoryPrintout customer={reviewCustomer} orders={reviewOrders} />
      )}


      {receiptOrder && (
        <ReceiptPreview
          order={receiptOrder}
          onClose={() => setReceiptOrder(null)}
          autoPrint={false}
        />
      )}

      {/* Delete confirm — blocked if due > 0 */}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {Number(deleteTarget?.due_balance || 0) > 0 ? (
                <span className="text-destructive font-medium">
                  This customer has an outstanding balance of $
                  {Number(deleteTarget?.due_balance || 0).toFixed(2)}. Settle the due before deletion.
                </span>
              ) : (
                "This action cannot be undone. Customer record will be removed permanently."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={Number(deleteTarget?.due_balance || 0) > 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Order type shown in the profile: Dine-in / Delivery / Takeaway / Online.
const orderTypeLabel = (o: Order): string => {
  const raw = String(o.orderType || "").toLowerCase();
  if (raw.includes("delivery")) return "Delivery";
  if (raw.includes("dine")) return "Dine-in";
  if (raw.includes("take") || raw.includes("pickup")) return "Takeaway";
  if (String(o.source || "").toLowerCase() === "web") return "Online";
  if (o.table && o.table !== "—") return "Dine-in";
  return "Takeaway";
};

/* Customer order history printout — rendered into the existing #print-root
   node with id="receipt" so the current thermal print setup is reused. */
const OrderHistoryPrintout = ({
  customer,
  orders,
}: {
  customer: Customer;
  orders: Order[];
}) => {
  const settings = loadReceiptSettings();
  const root = document.getElementById("print-root") || (() => {
    const el = document.createElement("div");
    el.id = "print-root";
    document.body.appendChild(el);
    return el;
  })();

  const totals = orders.reduce(
    (acc, o) => {
      const paid = o.paidAmount ?? 0;
      acc.total += o.total;
      acc.paid += paid;
      acc.due += Math.max(0, o.total - paid);
      return acc;
    },
    { total: 0, paid: 0, due: 0 }
  );

  return createPortal(
    <div id="receipt" className="receipt receipt-print p-3 text-[11px] leading-tight">
      <div className="text-center font-bold text-sm">{settings.businessName}</div>
      <div className="text-center">Customer Order History</div>
      <div className="mt-1">Customer: {customer.name}</div>
      {customer.phone && <div>Phone: {customer.phone}</div>}
      <div>Printed: {new Date().toLocaleString()}</div>
      <div className="border-t border-dashed border-black my-1" />
      {orders.map((o) => {
        const paid = o.paidAmount ?? 0;
        const due = Math.max(0, o.total - paid);
        return (
          <div key={o.id} className="mb-1.5">
            <div className="font-bold">
              #{o.number} · {orderTypeLabel(o)}
            </div>
            <div>{new Date(o.createdAt).toLocaleString()}</div>
            {o.items.map((it, i) => (
              <div key={`${o.id}-p-${i}`} className="flex justify-between">
                <span>
                  {it.qty} x {it.name}
                </span>
                <span>{(it.price * it.qty).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between">
              <span>Total / Paid / Due</span>
              <span>
                {o.total.toFixed(2)} / {paid.toFixed(2)} / {due.toFixed(2)}
              </span>
            </div>
            <div>Status: {due <= 0 ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID"}</div>
            <div className="border-t border-dashed border-black mt-1" />
          </div>
        );
      })}
      <div className="font-bold">
        <div className="flex justify-between">
          <span>Orders</span>
          <span>{orders.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Total</span>
          <span>{totals.total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Paid</span>
          <span>{totals.paid.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Outstanding</span>
          <span>{totals.due.toFixed(2)}</span>
        </div>
      </div>
    </div>,
    root
  );
};

const KpiCard = ({

  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) => (
  <Card className="p-5 rounded-2xl border-border">
    <div className="flex items-start justify-between">
      <div
        className={cn(
          "h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center",
          color
        )}
      >
        {icon}
      </div>
    </div>
    <div className="mt-4 text-2xl font-bold tracking-tight">{value}</div>
    <div className="text-sm text-muted-foreground">{label}</div>
  </Card>
);

export default Customers;
