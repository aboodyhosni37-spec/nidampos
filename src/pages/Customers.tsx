import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
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
          color="from-amber-500 to-orange-500"
        />
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          label="Customers with Debt"
          value={`${withDebt} / ${customers.length}`}
          color="from-blue-500 to-indigo-500"
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="High Debt Alerts"
          value={highDebt.toString()}
          color="from-red-500 to-rose-500"
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
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded">
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
                          hasDebt ? "text-amber-600" : "text-primary"
                        )}
                      >
                        ${debt.toFixed(2)}
                      </div>
                    </div>
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
                        t.type === "charge" ? "text-amber-600" : "text-primary"
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
          "h-11 w-11 rounded-xl bg-gradient-to-br text-white flex items-center justify-center shadow-soft",
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
