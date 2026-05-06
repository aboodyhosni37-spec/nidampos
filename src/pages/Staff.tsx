import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  UserCircle2,
  DollarSign,
  Upload,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "@/hooks/use-toast";
import { getSession } from "@/lib/auth";
import {
  createSalaryPayment,
  createStaff,
  deleteSalaryPayment,
  deleteStaff,
  listSalaryPayments,
  listStaff,
  SALARY_METHODS,
  updateStaff,
  uploadStaffPhoto,
  type SalaryPayment,
  type Staff,
} from "@/lib/staff";

const todayIso = () => new Date().toISOString().slice(0, 10);

const Staffpage = () => {
  const session = getSession();
  const canManage = !!session?.permissions?.manage_staff || session?.role === "admin";

  const [staff, setStaff] = useState<Staff[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Staff | null>(null);

  // Staff form
  const [staffOpen, setStaffOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [sName, setSName] = useState("");
  const [sRole, setSRole] = useState("");
  const [sSalary, setSSalary] = useState("");
  const [sPhoto, setSPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Staff | null>(null);

  // Payment form
  const [payOpen, setPayOpen] = useState(false);
  const [pAmount, setPAmount] = useState("");
  const [pMethod, setPMethod] = useState<string>("EVC-Plus");
  const [pNote, setPNote] = useState("");
  const [pDate, setPDate] = useState(todayIso());

  const load = async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([listStaff(), listSalaryPayments()]);
      setStaff(s);
      setPayments(p);
      if (selected) {
        const upd = s.find((x) => x.id === selected.id);
        setSelected(upd ?? null);
      }
    } catch (e: any) {
      toast({ title: "Failed to load", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalsByStaff = useMemo(() => {
    const m: Record<string, number> = {};
    payments.forEach((p) => {
      m[p.staff_id] = (m[p.staff_id] || 0) + Number(p.amount || 0);
    });
    return m;
  }, [payments]);

  const monthTotal = useMemo(() => {
    const ym = new Date().toISOString().slice(0, 7);
    return payments
      .filter((p) => p.paid_on.startsWith(ym))
      .reduce((s, p) => s + Number(p.amount || 0), 0);
  }, [payments]);

  const openNewStaff = () => {
    setEditing(null);
    setSName("");
    setSRole("");
    setSSalary("");
    setSPhoto(null);
    setStaffOpen(true);
  };
  const openEditStaff = (s: Staff) => {
    setEditing(s);
    setSName(s.name);
    setSRole(s.role);
    setSSalary(String(s.salary_amount));
    setSPhoto(s.photo_url);
    setStaffOpen(true);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadStaffPhoto(file);
      setSPhoto(url);
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const submitStaff = async () => {
    const salary = parseFloat(sSalary) || 0;
    if (!sName.trim()) return toast({ title: "Name required", variant: "destructive" });
    try {
      if (editing) {
        await updateStaff(editing.id, {
          name: sName.trim(),
          role: sRole.trim() || "Staff",
          salary_amount: salary,
          photo_url: sPhoto,
        });
        toast({ title: "Staff updated" });
      } else {
        await createStaff({
          name: sName,
          role: sRole,
          salary_amount: salary,
          photo_url: sPhoto,
        });
        toast({ title: "Staff added" });
      }
      setStaffOpen(false);
      load();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const removeStaff = async (s: Staff) => {
    try {
      await deleteStaff(s.id);
      if (selected?.id === s.id) setSelected(null);
      setConfirmDel(null);
      load();
      toast({ title: "Staff removed" });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const submitPayment = async () => {
    if (!selected) return;
    const amt = parseFloat(pAmount);
    if (!Number.isFinite(amt) || amt <= 0)
      return toast({ title: "Amount must be > 0", variant: "destructive" });
    try {
      await createSalaryPayment({
        staff_id: selected.id,
        amount: amt,
        method: pMethod,
        note: pNote.trim() || undefined,
        paid_on: pDate,
      });
      setPayOpen(false);
      setPAmount("");
      setPNote("");
      setPDate(todayIso());
      load();
      toast({ title: "Salary recorded" });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const removePayment = async (id: string) => {
    try {
      await deleteSalaryPayment(id);
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const selectedPayments = payments.filter((p) => p.staff_id === selected?.id);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff & Salaries</h1>
          <p className="text-muted-foreground mt-1">
            Track staff records and salary payments.
          </p>
        </div>
        {canManage && (
          <Button className="rounded-xl bg-gradient-button text-white" onClick={openNewStaff}>
            <Plus className="h-4 w-4 mr-2" /> Add staff
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-5 rounded-2xl border-border">
          <div className="text-sm text-muted-foreground">Staff members</div>
          <div className="text-2xl font-bold mt-1">{staff.length}</div>
        </Card>
        <Card className="p-5 rounded-2xl border-border">
          <div className="text-sm text-muted-foreground">Paid this month</div>
          <div className="text-2xl font-bold mt-1">${monthTotal.toFixed(2)}</div>
        </Card>
        <Card className="p-5 rounded-2xl border-border">
          <div className="text-sm text-muted-foreground">All-time payments</div>
          <div className="text-2xl font-bold mt-1">{payments.length}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-border lg:col-span-1">
          <div className="p-5 border-b border-border font-semibold">Staff list</div>
          <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
            {loading && (
              <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
            )}
            {!loading && staff.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No staff yet.
              </div>
            )}
            {staff.map((s) => {
              const paid = totalsByStaff[s.id] || 0;
              const remaining = Math.max(0, Number(s.salary_amount || 0) - paid);
              const active = selected?.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className={
                    "w-full text-left p-4 flex items-center gap-3 hover:bg-secondary/40 transition-colors " +
                    (active ? "bg-secondary/60" : "")
                  }
                >
                  {s.photo_url ? (
                    <img
                      src={s.photo_url}
                      alt={s.name}
                      className="h-11 w-11 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-secondary flex items-center justify-center">
                      <UserCircle2 className="h-7 w-7 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{s.role}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Remaining</div>
                    <div className="font-bold text-sm">${remaining.toFixed(2)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="rounded-2xl border-border lg:col-span-2">
          {!selected ? (
            <div className="p-12 text-center text-muted-foreground">
              Select a staff member to view salary records.
            </div>
          ) : (
            <>
              <div className="p-5 border-b border-border flex items-center gap-4">
                {selected.photo_url ? (
                  <img
                    src={selected.photo_url}
                    alt={selected.name}
                    className="h-14 w-14 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center">
                    <UserCircle2 className="h-9 w-9 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-lg">{selected.name}</div>
                  <div className="text-xs text-muted-foreground">{selected.role}</div>
                  <Badge variant="outline" className="mt-1 text-xs border-primary/30 text-primary">
                    Salary: ${Number(selected.salary_amount).toFixed(2)}
                  </Badge>
                </div>
                {canManage && (
                  <div className="flex gap-1.5">
                    <Button size="icon" variant="ghost" onClick={() => openEditStaff(selected)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setConfirmDel(selected)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-xl bg-gradient-button text-white"
                      onClick={() => setPayOpen(true)}
                    >
                      <DollarSign className="h-4 w-4 mr-1" /> Record payment
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 p-5 border-b border-border">
                <div>
                  <div className="text-xs text-muted-foreground">Total paid</div>
                  <div className="font-bold text-lg">
                    ${(totalsByStaff[selected.id] || 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Remaining</div>
                  <div className="font-bold text-lg">
                    $
                    {Math.max(
                      0,
                      Number(selected.salary_amount || 0) - (totalsByStaff[selected.id] || 0)
                    ).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Payments</div>
                  <div className="font-bold text-lg">{selectedPayments.length}</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 text-left text-muted-foreground">
                    <tr>
                      <th className="p-3 font-semibold">Date</th>
                      <th className="p-3 font-semibold">Method</th>
                      <th className="p-3 font-semibold">Note</th>
                      <th className="p-3 font-semibold text-right">Amount</th>
                      {canManage && <th className="p-3"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedPayments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-muted-foreground">
                          No payments yet.
                        </td>
                      </tr>
                    )}
                    {selectedPayments.map((p) => (
                      <tr key={p.id}>
                        <td className="p-3">{p.paid_on}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="border-border">
                            {p.method}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">{p.note || "—"}</td>
                        <td className="p-3 text-right font-semibold">
                          ${Number(p.amount).toFixed(2)}
                        </td>
                        {canManage && (
                          <td className="p-3 text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removePayment(p.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Staff dialog */}
      <Dialog open={staffOpen} onOpenChange={setStaffOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit staff" : "Add staff"}</DialogTitle>
            <DialogDescription>
              Salary information is for tracking only — not a login account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              {sPhoto ? (
                <img
                  src={sPhoto}
                  alt="preview"
                  className="h-16 w-16 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
                  <UserCircle2 className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
              <label className="inline-flex items-center gap-2 text-sm cursor-pointer text-primary">
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading…" : "Upload photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                  }}
                />
              </label>
            </div>
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={sName} onChange={(e) => setSName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Input
                  value={sRole}
                  onChange={(e) => setSRole(e.target.value)}
                  placeholder="e.g. Cashier"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Monthly salary ($)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  value={sSalary}
                  onChange={(e) => setSSalary(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStaffOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitStaff} className="bg-gradient-button text-white">
              {editing ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record salary payment</DialogTitle>
            <DialogDescription>{selected?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={pAmount}
                  onChange={(e) => setPAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={pDate} onChange={(e) => setPDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={pMethod} onValueChange={setPMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SALARY_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input value={pNote} onChange={(e) => setPNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitPayment} className="bg-gradient-button text-white">
              Save payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this staff record?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDel?.name} and all salary payment history will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => confirmDel && removeStaff(confirmDel)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Staffpage;
