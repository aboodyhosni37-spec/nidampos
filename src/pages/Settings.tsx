import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Save, ShieldCheck, UserPlus, Lock, Printer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  ALL_PERMISSIONS,
  ADMIN_PERMS,
  deleteRole,
  listRoles,
  upsertRole,
  type PermissionMap,
  type RolePermission,
} from "@/lib/permissions";
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
  type AppUser,
} from "@/lib/users";
import {
  loadReceiptSettings,
  saveReceiptSettings,
  DEFAULT_RECEIPT_SETTINGS,
  type ReceiptSettings,
} from "@/lib/receiptSettings";
import {
  fetchSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  type SystemSettings,
  type Currency,
} from "@/lib/systemSettings";

const Settings = () => {
  const session = getSession();
  const canManageUsers = !!session?.permissions?.manage_users;
  const canManageSystem = !!session?.permissions?.manage_system_settings || session?.role === "admin";

  const [tab, setTab] = useState("users");

  // ===== System settings =====
  const [sys, setSys] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [savingSys, setSavingSys] = useState(false);
  const setSysField = <K extends keyof SystemSettings>(k: K, v: SystemSettings[K]) =>
    setSys((s) => ({ ...s, [k]: v }));
  const handleCurrencyChange = (code: Currency) => {
    setSys((s) => ({
      ...s,
      currency_code: code,
      currency_symbol: code === "USD" ? "$" : "Sh",
    }));
  };
  const saveSystem = async () => {
    setSavingSys(true);
    try {
      await saveSettings(sys);
      toast({ title: "System settings saved" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingSys(false);
    }
  };

  // ===== Users =====
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<RolePermission[]>([]);
  const [userOpen, setUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [uName, setUName] = useState("");
  const [uUsername, setUUsername] = useState("");
  const [uPhone, setUPhone] = useState("");
  const [uPin, setUPin] = useState("");
  const [uRole, setURole] = useState("cashier");
  const [confirmDelUser, setConfirmDelUser] = useState<AppUser | null>(null);

  // ===== Roles =====
  const [draftRoles, setDraftRoles] = useState<RolePermission[]>([]);
  const [newRoleOpen, setNewRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [confirmDelRole, setConfirmDelRole] = useState<RolePermission | null>(null);

  // ===== Receipt & Printer =====
  const [receipt, setReceipt] = useState<ReceiptSettings>(() => loadReceiptSettings());
  const setR = <K extends keyof ReceiptSettings>(k: K, v: ReceiptSettings[K]) =>
    setReceipt((s) => ({ ...s, [k]: v }));
  const saveReceipt = () => {
    saveReceiptSettings(receipt);
    toast({ title: "Printer & Receipt settings saved" });
  };
  const resetReceipt = () => {
    setReceipt({ ...DEFAULT_RECEIPT_SETTINGS });
    saveReceiptSettings({ ...DEFAULT_RECEIPT_SETTINGS });
    toast({ title: "Reset to defaults" });
  };

  const loadAll = async () => {
    try {
      const [u, r, s] = await Promise.all([listUsers(), listRoles(), fetchSettings()]);
      setUsers(u);
      setRoles(r);
      setDraftRoles(r.map((x) => ({ ...x, permissions: { ...x.permissions } })));
      setSys(s);
    } catch (err: any) {
      toast({ title: "Failed to load", description: err.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const groupedPerms = useMemo(() => {
    const out: Record<string, typeof ALL_PERMISSIONS> = {};
    ALL_PERMISSIONS.forEach((p) => {
      out[p.group] ||= [];
      out[p.group].push(p);
    });
    return out;
  }, []);

  // ---- Users actions ----
  const openNewUser = () => {
    setEditingUser(null);
    setUName("");
    setUUsername("");
    setUPhone("");
    setUPin("");
    setURole(roles[0]?.role ?? "cashier");
    setUserOpen(true);
  };

  const openEditUser = (u: AppUser) => {
    setEditingUser(u);
    setUName(u.name);
    setUUsername(u.username ?? "");
    setUPhone(u.phone ?? "");
    setUPin("");
    setURole(u.role);
    setUserOpen(true);
  };

  const submitUser = async () => {
    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          name: uName,
          username: uUsername || null,
          phone: uPhone || null,
          role: uRole,
          ...(uPin ? { pin: uPin } : {}),
        });
        toast({ title: "User updated" });
      } else {
        if (!uPin) return toast({ title: "PIN required", variant: "destructive" });
        await createUser({
          name: uName,
          username: uUsername,
          phone: uPhone,
          pin: uPin,
          role: uRole,
        });
        toast({ title: "User created" });
      }
      setUserOpen(false);
      loadAll();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
  };

  const removeUser = async (u: AppUser) => {
    try {
      await deleteUser(u.id);
      setConfirmDelUser(null);
      loadAll();
      toast({ title: "User removed" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const toggleActive = async (u: AppUser, active: boolean) => {
    try {
      await updateUser(u.id, { is_active: active });
      loadAll();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  // ---- Roles actions ----
  const togglePerm = (role: string, key: string, value: boolean) => {
    setDraftRoles((rs) =>
      rs.map((r) =>
        r.role === role ? { ...r, permissions: { ...r.permissions, [key]: value } } : r
      )
    );
  };

  const saveRole = async (r: RolePermission) => {
    try {
      await upsertRole(r.role, r.permissions, r.is_system);
      toast({ title: `Role "${r.role}" saved` });
      loadAll();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
  };

  const addRole = async () => {
    const name = newRoleName.trim().toLowerCase();
    if (!name) return;
    if (roles.some((r) => r.role === name))
      return toast({ title: "Role already exists", variant: "destructive" });
    try {
      await upsertRole(name, {} as PermissionMap, false);
      setNewRoleName("");
      setNewRoleOpen(false);
      loadAll();
      toast({ title: "Role created" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const removeRole = async (r: RolePermission) => {
    try {
      await deleteRole(r.role);
      setConfirmDelRole(null);
      loadAll();
      toast({ title: "Role removed" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage users, roles & permissions, and system preferences.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="printer">Printer & Receipt</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        {/* USERS */}
        <TabsContent value="users" className="space-y-4">
          <Card className="p-5 rounded-2xl border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-lg">Team members</h2>
                <p className="text-sm text-muted-foreground">
                  Each user signs in with their phone or username + PIN.
                </p>
              </div>
              {canManageUsers && (
                <Button onClick={openNewUser} className="rounded-xl bg-gradient-button text-white">
                  <UserPlus className="h-4 w-4 mr-2" /> Add user
                </Button>
              )}
            </div>
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground text-left bg-secondary/40">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Username</th>
                    <th className="px-5 py-3 font-semibold">Phone</th>
                    <th className="px-5 py-3 font-semibold">Role</th>
                    <th className="px-5 py-3 font-semibold">Active</th>
                    {canManageUsers && <th className="px-5 py-3 font-semibold text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                        No users yet.
                      </td>
                    </tr>
                  )}
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-secondary/30">
                      <td className="px-5 py-3 font-medium">{u.name}</td>
                      <td className="px-5 py-3 text-muted-foreground">{u.username ?? "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground">{u.phone ?? "—"}</td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className="capitalize border-primary/30 text-primary">
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        {canManageUsers ? (
                          <Switch checked={u.is_active} onCheckedChange={(v) => toggleActive(u, v)} />
                        ) : u.is_active ? (
                          "Yes"
                        ) : (
                          "No"
                        )}
                      </td>
                      {canManageUsers && (
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditUser(u)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setConfirmDelUser(u)}
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
          </Card>
        </TabsContent>

        {/* ROLES */}
        <TabsContent value="roles" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Toggle permissions per role. Changes apply on next sign-in.
            </p>
            {canManageUsers && (
              <Button variant="outline" className="rounded-xl" onClick={() => setNewRoleOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> New role
              </Button>
            )}
          </div>

          {draftRoles.map((r) => (
            <Card key={r.role} className="p-5 rounded-2xl border-border space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold capitalize text-lg">{r.role}</h3>
                  {r.is_system && (
                    <Badge variant="outline" className="text-xs border-border">
                      <Lock className="h-3 w-3 mr-1" /> System
                    </Badge>
                  )}
                </div>
                {canManageUsers && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => saveRole(r)} className="bg-gradient-button text-white">
                      <Save className="h-4 w-4 mr-1.5" /> Save
                    </Button>
                    {!r.is_system && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive h-8 w-8"
                        onClick={() => setConfirmDelRole(r)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                {Object.entries(groupedPerms).map(([group, perms]) => (
                  <div key={group} className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-1">
                      {group}
                    </div>
                    {perms.map((p) => (
                      <div
                        key={p.key}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/40"
                      >
                        <span className="text-sm">{p.label}</span>
                        <Switch
                          checked={!!r.permissions[p.key]}
                          disabled={!canManageUsers}
                          onCheckedChange={(v) => togglePerm(r.role, p.key, v)}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* PRINTER & RECEIPT */}
        <TabsContent value="printer" className="space-y-4">
          <Card className="p-6 rounded-2xl border-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-lg">Printer</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={resetReceipt} className="rounded-xl">
                  Reset
                </Button>
                <Button onClick={saveReceipt} className="rounded-xl bg-gradient-button text-white">
                  <Save className="h-4 w-4 mr-1.5" /> Save
                </Button>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Printer name / device</Label>
                <Input
                  value={receipt.printerName}
                  onChange={(e) => setR("printerName", e.target.value)}
                  className="rounded-xl"
                  placeholder="e.g. Epson TM-T20"
                />
              </div>
              <div className="space-y-2">
                <Label>Paper size</Label>
                <Select
                  value={receipt.paperSize}
                  onValueChange={(v) => setR("paperSize", v as ReceiptSettings["paperSize"])}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58mm">58mm (small)</SelectItem>
                    <SelectItem value="80mm">80mm (standard)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40">
              <div>
                <div className="font-medium">Auto-print after order</div>
                <div className="text-sm text-muted-foreground">
                  Open the print dialog automatically when an order is placed
                </div>
              </div>
              <Switch
                checked={receipt.autoPrint}
                onCheckedChange={(v) => setR("autoPrint", v)}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20">
              <div>
                <div className="font-medium flex items-center gap-2">
                  <span>👨‍🍳 Enable Kitchen Print</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  When ON, prints a kitchen ticket (no prices) right after the customer receipt
                </div>
              </div>
              <Switch
                checked={receipt.enableKitchenPrint}
                onCheckedChange={(v) => setR("enableKitchenPrint", v)}
              />
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border-border space-y-4">
            <h2 className="font-semibold text-lg">Receipt header</h2>
            <div className="space-y-2">
              <Label>Business name</Label>
              <Input
                value={receipt.businessName}
                onChange={(e) => setR("businessName", e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Phone number</Label>
                  <Switch
                    checked={receipt.showPhone}
                    onCheckedChange={(v) => setR("showPhone", v)}
                  />
                </div>
                <Input
                  value={receipt.phone}
                  onChange={(e) => setR("phone", e.target.value)}
                  className="rounded-xl"
                  disabled={!receipt.showPhone}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Address</Label>
                  <Switch
                    checked={receipt.showAddress}
                    onCheckedChange={(v) => setR("showAddress", v)}
                  />
                </div>
                <Input
                  value={receipt.address}
                  onChange={(e) => setR("address", e.target.value)}
                  className="rounded-xl"
                  disabled={!receipt.showAddress}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Logo URL (optional)</Label>
                <Switch
                  checked={receipt.showLogo}
                  onCheckedChange={(v) => setR("showLogo", v)}
                />
              </div>
              <Input
                value={receipt.logoUrl}
                onChange={(e) => setR("logoUrl", e.target.value)}
                className="rounded-xl"
                placeholder="https://…/logo.png"
                disabled={!receipt.showLogo}
              />
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border-border space-y-3">
            <h2 className="font-semibold text-lg">Receipt body</h2>
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40">
              <div>
                <div className="font-medium">Show items, quantity & price</div>
              </div>
              <Switch checked={receipt.showItems} onCheckedChange={(v) => setR("showItems", v)} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40">
              <div>
                <div className="font-medium">Show payment method</div>
                <div className="text-sm text-muted-foreground">
                  EVC-Plus, Premier Wallet, E-Dahab, Cash, Card
                </div>
              </div>
              <Switch
                checked={receipt.showPaymentMethod}
                onCheckedChange={(v) => setR("showPaymentMethod", v)}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40">
              <div>
                <div className="font-medium">Show total amount</div>
              </div>
              <Switch checked={receipt.showTotal} onCheckedChange={(v) => setR("showTotal", v)} />
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border-border space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Receipt footer</h2>
              <Switch checked={receipt.showFooter} onCheckedChange={(v) => setR("showFooter", v)} />
            </div>
            <div className="space-y-2">
              <Label>Footer message</Label>
              <Textarea
                value={receipt.footerMessage}
                onChange={(e) => setR("footerMessage", e.target.value)}
                className="rounded-xl min-h-[60px]"
                disabled={!receipt.showFooter}
                placeholder="Thank you! Please come again"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40">
              <div className="font-medium">Show "Powered by Blue Flag"</div>
              <Switch
                checked={receipt.showPoweredBy}
                onCheckedChange={(v) => setR("showPoweredBy", v)}
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={saveReceipt} className="rounded-xl bg-gradient-button text-white">
                <Save className="h-4 w-4 mr-1.5" /> Save all
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* SYSTEM */}
        <TabsContent value="system" className="space-y-4">
          {!canManageSystem && (
            <Card className="p-4 rounded-xl border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm">
              <Lock className="h-4 w-4 inline mr-2" />
              Only administrators can modify system settings.
            </Card>
          )}

          <Card className="p-6 rounded-2xl border-border space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Currency</h2>
              {canManageSystem && (
                <Button
                  onClick={saveSystem}
                  disabled={savingSys}
                  className="rounded-xl bg-gradient-button text-white"
                >
                  <Save className="h-4 w-4 mr-1.5" /> {savingSys ? "Saving…" : "Save"}
                </Button>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={sys.currency_code}
                  onValueChange={(v) => handleCurrencyChange(v as Currency)}
                  disabled={!canManageSystem}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD — US Dollar</SelectItem>
                    <SelectItem value="SOS">SOS — Somali Shilling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Symbol</Label>
                <Input
                  value={sys.currency_symbol}
                  onChange={(e) => setSysField("currency_symbol", e.target.value)}
                  className="rounded-xl"
                  disabled={!canManageSystem}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Applied to POS, receipts and reports.
            </p>
          </Card>

          <Card className="p-6 rounded-2xl border-border space-y-5">
            <h2 className="font-semibold text-lg">Tax</h2>
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40">
              <div>
                <div className="font-medium">Enable tax</div>
                <div className="text-sm text-muted-foreground">
                  Apply tax to every order
                </div>
              </div>
              <Switch
                checked={sys.tax_enabled}
                onCheckedChange={(v) => setSysField("tax_enabled", v)}
                disabled={!canManageSystem}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tax rate (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={sys.tax_rate}
                  onChange={(e) => setSysField("tax_rate", Math.max(0, Number(e.target.value) || 0))}
                  className="rounded-xl"
                  disabled={!canManageSystem || !sys.tax_enabled}
                />
              </div>
              <div className="space-y-2">
                <Label>Tax mode</Label>
                <Select
                  value={sys.tax_inclusive ? "inclusive" : "exclusive"}
                  onValueChange={(v) => setSysField("tax_inclusive", v === "inclusive")}
                  disabled={!canManageSystem || !sys.tax_enabled}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exclusive">Exclusive (added on top)</SelectItem>
                    <SelectItem value="inclusive">Inclusive (already in price)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {canManageSystem && (
              <div className="flex justify-end">
                <Button
                  onClick={saveSystem}
                  disabled={savingSys}
                  className="rounded-xl bg-gradient-button text-white"
                >
                  <Save className="h-4 w-4 mr-1.5" /> Save
                </Button>
              </div>
            )}
          </Card>

          <p className="text-xs text-muted-foreground">
            Receipt header, footer & printer options are in <b>Printer & Receipt</b>.
          </p>
        </TabsContent>
      </Tabs>

      {/* Add/Edit user dialog */}
      <Dialog open={userOpen} onOpenChange={setUserOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit user" : "Add user"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={uName} onChange={(e) => setUName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input value={uUsername} onChange={(e) => setUUsername(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={uPhone} onChange={(e) => setUPhone(e.target.value)} inputMode="numeric" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{editingUser ? "New PIN (leave empty to keep)" : "PIN *"}</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={uPin}
                  onChange={(e) => setUPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="4–6 digits"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={uRole} onValueChange={setURole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.role} value={r.role} className="capitalize">
                        {r.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitUser} className="bg-gradient-button text-white">
              {editingUser ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New role dialog */}
      <Dialog open={newRoleOpen} onOpenChange={setNewRoleOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create custom role</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <Label>Role name</Label>
            <Input
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="e.g. manager"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewRoleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addRole} className="bg-gradient-button text-white">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete user */}
      <AlertDialog open={!!confirmDelUser} onOpenChange={(o) => !o && setConfirmDelUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelUser?.name} will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => confirmDelUser && removeUser(confirmDelUser)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm delete role */}
      <AlertDialog open={!!confirmDelRole} onOpenChange={(o) => !o && setConfirmDelRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role "{confirmDelRole?.role}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Users assigned to this role will lose their permissions until reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => confirmDelRole && removeRole(confirmDelRole)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stub: ADMIN_PERMS reference for type-checker */}
      <span className="hidden">{Object.keys(ADMIN_PERMS).length}</span>
    </div>
  );
};

export default Settings;
