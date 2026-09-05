import { useEffect, useMemo, useState } from "react";
import { Wallet, Plus, Trash2, Pencil, Calendar as CalendarIcon, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { getSession } from "@/lib/auth";
import {
  createExpense,
  createExpenseCategory,
  deleteExpense,
  deleteExpenseCategory,
  listExpenseCategories,
  listExpenses,
  updateExpense,
  type Expense,
  type ExpenseCategory,
} from "@/lib/expenses";

const todayIso = () => new Date().toISOString().slice(0, 10);

type Range = "today" | "week" | "month" | "all";

const Expenses = () => {
  const session = getSession();
  const canManage = !!session?.permissions?.manage_expenses;

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cats, setCats] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("week");

  // Form state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [fCat, setFCat] = useState<string>("");
  const [fDesc, setFDesc] = useState("");
  const [fAmount, setFAmount] = useState<string>("");
  const [fDate, setFDate] = useState<string>(todayIso());
  const [submitting, setSubmitting] = useState(false);

  // Categories dialog
  const [catOpen, setCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  // Delete confirm
  const [confirmDel, setConfirmDel] = useState<Expense | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [e, c] = await Promise.all([listExpenses(), listExpenseCategories()]);
      setExpenses(e);
      setCats(c);
    } catch (err: any) {
      toast({ title: "Failed to load expenses", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (range === "week") start.setDate(now.getDate() - 6);
    else if (range === "month") start.setDate(1);
    return expenses.filter((e) => {
      if (range === "all") return true;
      const d = new Date(e.expense_date + "T00:00:00");
      return d >= start;
    });
  }, [expenses, range]);

  const total = filtered.reduce((s, i) => s + Number(i.amount || 0), 0);
  const todayTotal = expenses
    .filter((e) => e.expense_date === todayIso())
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const byCategory = filtered.reduce<Record<string, number>>((acc, e) => {
    acc[e.category_name] = (acc[e.category_name] || 0) + Number(e.amount || 0);
    return acc;
  }, {});

  const resetForm = () => {
    setEditing(null);
    setFCat(cats[0]?.id ?? "");
    setFDesc("");
    setFAmount("");
    setFDate(todayIso());
  };

  const openNew = () => {
    resetForm();
    setFCat(cats[0]?.id ?? "");
    setOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setFCat(e.category_id ?? "");
    setFDesc(e.description);
    setFAmount(String(e.amount));
    setFDate(e.expense_date);
    setOpen(true);
  };

  const submit = async () => {
    const amount = parseFloat(fAmount);
    if (!fCat) return toast({ title: "Pick a category", variant: "destructive" });
    if (!fDesc.trim()) return toast({ title: "Description required", variant: "destructive" });
    if (!Number.isFinite(amount) || amount <= 0)
      return toast({ title: "Amount must be greater than 0", variant: "destructive" });

    const cat = cats.find((c) => c.id === fCat);
    if (!cat) return;

    setSubmitting(true);
    try {
      if (editing) {
        await updateExpense(editing.id, {
          category_id: fCat,
          category_name: cat.name,
          description: fDesc.trim(),
          amount,
          expense_date: fDate,
        });
        toast({ title: "Expense updated" });
      } else {
        await createExpense({
          category_id: fCat,
          category_name: cat.name,
          description: fDesc.trim(),
          amount,
          expense_date: fDate,
          created_by: session?.name ?? null,
        });
        toast({ title: "Expense added" });
      }
      setOpen(false);
      await load();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const removeExpense = async (e: Expense) => {
    try {
      await deleteExpense(e.id);
      toast({ title: "Expense removed" });
      setConfirmDel(null);
      await load();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await createExpenseCategory(newCatName);
      setNewCatName("");
      const c = await listExpenseCategories();
      setCats(c);
      toast({ title: "Category added" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const removeCategory = async (id: string) => {
    try {
      await deleteExpenseCategory(id);
      setCats((cs) => cs.filter((c) => c.id !== id));
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground mt-1">Track and manage business expenses.</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <Button variant="outline" className="rounded-xl" onClick={() => setCatOpen(true)}>
                <Tag className="h-4 w-4 mr-2" /> Categories
              </Button>
              <Button className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft" onClick={openNew}>
                <Plus className="h-4 w-4 mr-2" /> Add expense
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 rounded-2xl border-border">
          <div className="text-sm text-muted-foreground">Today</div>
          <div className="text-2xl font-bold mt-1">${todayTotal.toFixed(2)}</div>
        </Card>
        <Card className="p-5 rounded-2xl border-border">
          <div className="text-sm text-muted-foreground capitalize">{range}</div>
          <div className="text-2xl font-bold mt-1">${total.toFixed(2)}</div>
        </Card>
        <Card className="p-5 rounded-2xl border-border">
          <div className="text-sm text-muted-foreground">Entries</div>
          <div className="text-2xl font-bold mt-1">{filtered.length}</div>
        </Card>
        <Card className="p-5 rounded-2xl border-border">
          <div className="text-sm text-muted-foreground">Categories</div>
          <div className="text-2xl font-bold mt-1">{cats.length}</div>
        </Card>
      </div>

      {/* Range tabs */}
      <Card className="p-3 rounded-2xl border-border">
        <div className="flex gap-2 flex-wrap">
          {(["today", "week", "month", "all"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={
                "px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all " +
                (range === r
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft"
                  : "bg-secondary text-muted-foreground hover:text-foreground")
              }
            >
              {r}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-border lg:col-span-2 overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-lg">Expense History</h2>
            <Badge variant="outline" className="border-border text-muted-foreground">
              {filtered.length} entries
            </Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-muted-foreground text-left">
                <tr>
                  <th className="p-4 font-semibold">Date</th>
                  <th className="p-4 font-semibold">Category</th>
                  <th className="p-4 font-semibold">Description</th>
                  <th className="p-4 font-semibold text-right">Amount</th>
                  {canManage && <th className="p-4 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-muted-foreground">
                      No expenses for this range.
                    </td>
                  </tr>
                ) : (
                  filtered.map((it) => (
                    <tr key={it.id} className="hover:bg-secondary/40">
                      <td className="p-4 text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          {it.expense_date}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-secondary">
                          {it.category_name}
                        </span>
                      </td>
                      <td className="p-4">{it.description}</td>
                      <td className="p-4 text-right font-semibold">${Number(it.amount).toFixed(2)}</td>
                      {canManage && (
                        <td className="p-4 text-right whitespace-nowrap">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openEdit(it)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setConfirmDel(it)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="rounded-2xl border-border">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-lg">By Category</h2>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-4 space-y-3">
            {Object.keys(byCategory).length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No data.</div>
            ) : (
              Object.entries(byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([name, amt]) => {
                  const pct = total ? (amt / total) * 100 : 0;
                  return (
                    <div key={name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{name}</span>
                        <span className="text-muted-foreground">${amt.toFixed(2)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-gradient-button transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </Card>
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit expense" : "Add expense"}</DialogTitle>
            <DialogDescription>
              Track every cost so reports and dashboards stay accurate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={fCat} onValueChange={setFCat}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose category" />
                </SelectTrigger>
                <SelectContent>
                  {cats.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={fDesc} onChange={(e) => setFDesc(e.target.value)} placeholder="e.g. Vegetables & meat" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount ($)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  value={fAmount}
                  onChange={(e) => setFAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={submitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {submitting ? "Saving…" : editing ? "Save changes" : "Add expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Categories dialog */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage expense categories</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="flex gap-2">
              <Input
                placeholder="New category name"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
              />
              <Button onClick={addCategory} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {cats.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-secondary/50"
                >
                  <span className="font-medium">{c.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive h-8 w-8"
                    onClick={() => removeCategory(c.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDel?.description} — ${Number(confirmDel?.amount || 0).toFixed(2)}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => confirmDel && removeExpense(confirmDel)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Expenses;
