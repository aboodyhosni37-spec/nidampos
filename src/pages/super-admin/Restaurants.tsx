import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Pencil, Eye, ExternalLink, Search, Loader2, Trash2, Power, Ban } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DEFAULT_POS_URL, assignMember, listMembers, listPosUsers, listRestaurants, newRestaurantCode,
  posUrlFor, removeMember, saveRestaurant, setRestaurantStatus, subscriptionState, type Restaurant,
} from "@/lib/superAdmin";

const STATUSES = ["active", "inactive", "suspended"];
const SUBS = ["trial", "active", "past_due", "cancelled"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const blank = (): Partial<Restaurant> => ({
  name: "", restaurant_code: "", owner_name: "", owner_email: "", status: "active",
  subscription_plan: "standard", subscription_status: "trial", pos_url: DEFAULT_POS_URL,
  subscription_starts_at: new Date().toISOString().slice(0, 10),
});
const fmt = (d?: string | null) => (d ? new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString() : "—");

export default function SuperAdminRestaurants() {
  const [rows, setRows] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("created_desc");
  const [edit, setEdit] = useState<Partial<Restaurant> | null>(null);
  const [view, setView] = useState<Restaurant | null>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);

  const load = async () => {
    setLoading(true);
    try { setRows(await listRestaurants()); setLoadErr(""); }
    catch (e: any) { setLoadErr(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = rows.filter((r) =>
      (filter === "all" || r.status === filter) &&
      (!t || [r.name, r.restaurant_code, r.owner_name, r.owner_email, r.phone].some((v) => v?.toLowerCase().includes(t)))
    );
    return list.sort((a, b) =>
      sort === "name_asc" ? a.name.localeCompare(b.name) :
      sort === "name_desc" ? b.name.localeCompare(a.name) :
      sort === "created_asc" ? a.created_at.localeCompare(b.created_at) :
      b.created_at.localeCompare(a.created_at));
  }, [rows, q, filter, sort]);

  const set = (k: keyof Restaurant, v: string) => setEdit((e) => ({ ...e!, [k]: v || null }));

  const save = async () => {
    if (!edit || saving.current) return;
    if (!edit.name?.trim()) return toast.error("Restaurant name is required");
    if (!edit.owner_name?.trim()) return toast.error("Owner full name is required");
    if (!edit.owner_email?.trim() || !EMAIL_RE.test(edit.owner_email.trim())) return toast.error("Enter a valid owner email");
    if (edit.subscription_starts_at && edit.subscription_ends_at && edit.subscription_ends_at < edit.subscription_starts_at)
      return toast.error("Expiry date must be after the start date");
    saving.current = true; setBusy(true);
    try {
      const row = { ...edit, name: edit.name.trim(), owner_email: edit.owner_email.trim().toLowerCase() };
      if (!row.id) row.restaurant_code = newRestaurantCode(row.name!);
      await saveRestaurant(row);
      toast.success(row.id ? "Restaurant updated" : `Restaurant created · ID ${row.restaurant_code}`);
      setEdit(null);
      load();
    } catch (e: any) {
      toast.error(e.code === "23505" ? "That restaurant ID already exists — please try again" : e.message);
    } finally { saving.current = false; setBusy(false); }
  };

  const changeStatus = async (r: Restaurant, s: Restaurant["status"]) => {
    try { await setRestaurantStatus(r, s); toast.success(`${r.name} is now ${s}`); load(); setView(null); }
    catch (e: any) { toast.error(e.message); }
  };

  const sel = (k: keyof Restaurant, opts: string[]) => (
    <select className="w-full h-10 rounded-md border bg-background px-3 text-sm capitalize"
      value={(edit?.[k] as string) ?? ""} onChange={(e) => set(k, e.target.value)}>
      {opts.map((o) => <option key={o} value={o}>{o.replace("_", " ")}</option>)}
    </select>
  );

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Restaurants</h1>
        <Button onClick={() => setEdit(blank())}><Plus className="h-4 w-4 mr-1" /> Add restaurant</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, ID, owner, email, phone" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All restaurants</option>
          <option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option>
        </select>
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="created_desc">Newest first</option><option value="created_asc">Oldest first</option>
          <option value="name_asc">Name A–Z</option><option value="name_desc">Name Z–A</option>
        </select>
      </div>

      <Card className="overflow-x-auto">
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : loadErr ? (
          <div className="p-6 text-sm">Couldn't load restaurants: {loadErr} <Button size="sm" variant="outline" className="ml-2" onClick={load}>Retry</Button></div>
        ) : shown.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No restaurants match.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground text-left border-b">
              <tr>{["Restaurant", "ID", "Owner", "Phone", "Plan", "Expiry", "Status", "POS", "Created", ""].map((h) => <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {shown.map((r) => {
                const sub = subscriptionState(r);
                return (
                  <tr key={r.id} className="align-middle">
                    <td className="px-3 py-2 font-semibold">{r.name}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.restaurant_code}</td>
                    <td className="px-3 py-2">{r.owner_name || "—"}<div className="text-xs text-muted-foreground">{r.owner_email}</div></td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.phone || "—"}</td>
                    <td className="px-3 py-2 capitalize whitespace-nowrap">{r.subscription_plan}<div className="text-xs text-muted-foreground">{sub}</div></td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmt(r.subscription_ends_at)}</td>
                    <td className="px-3 py-2"><span className="px-2 py-0.5 rounded bg-secondary capitalize text-xs">{r.status}</span></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground max-w-[160px] truncate" title={r.pos_url || DEFAULT_POS_URL}>{(r.pos_url || DEFAULT_POS_URL).replace(/^https?:\/\//, "")}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmt(r.created_at)}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="outline" className="h-8 w-8" title="View details" onClick={() => setView(r)}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="outline" className="h-8 w-8" title="Edit" onClick={() => setEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="outline" className="h-8 w-8" title={r.status === "active" ? "Deactivate" : "Activate"}
                          onClick={() => changeStatus(r, r.status === "active" ? "inactive" : "active")}><Power className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="outline" className="h-8 w-8" title={r.status === "suspended" ? "Reactivate" : "Suspend"}
                          onClick={() => changeStatus(r, r.status === "suspended" ? "active" : "suspended")}><Ban className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="outline" className="h-8 w-8" title="Open POS" asChild>
                          <a href={posUrlFor(r)} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Dialog open={!!edit} onOpenChange={(o) => !o && !busy && setEdit(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? "Edit restaurant" : "Add restaurant"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1"><Label>Restaurant name *</Label><Input value={edit.name ?? ""} onChange={(e) => set("name", e.target.value)} /></div>
              <div className="col-span-2 space-y-1"><Label>Restaurant ID</Label>
                <Input value={edit.id ? edit.restaurant_code ?? "" : "Created automatically when saved"} disabled /></div>
              <div className="space-y-1"><Label>Owner full name *</Label><Input value={edit.owner_name ?? ""} onChange={(e) => set("owner_name", e.target.value)} /></div>
              <div className="space-y-1"><Label>Owner email *</Label><Input type="email" value={edit.owner_email ?? ""} onChange={(e) => set("owner_email", e.target.value)} /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={edit.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></div>
              <div className="space-y-1"><Label>Status</Label>{sel("status", STATUSES)}</div>
              <div className="col-span-2 space-y-1"><Label>Address</Label><Input value={edit.address ?? ""} onChange={(e) => set("address", e.target.value)} /></div>
              <div className="col-span-2 space-y-1"><Label>POS application URL</Label><Input value={edit.pos_url ?? ""} onChange={(e) => set("pos_url", e.target.value)} /></div>
              <div className="space-y-1"><Label>Plan</Label><Input value={edit.subscription_plan ?? ""} onChange={(e) => set("subscription_plan", e.target.value)} /></div>
              <div className="space-y-1"><Label>Subscription</Label>{sel("subscription_status", SUBS)}</div>
              <div className="space-y-1"><Label>Start date</Label><Input type="date" value={edit.subscription_starts_at ?? ""} onChange={(e) => set("subscription_starts_at", e.target.value)} /></div>
              <div className="space-y-1"><Label>Expiry date</Label><Input type="date" value={edit.subscription_ends_at ?? ""} onChange={(e) => set("subscription_ends_at", e.target.value)} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setEdit(null)}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {view && <Details r={view} onClose={() => setView(null)} onEdit={() => { setEdit(view); setView(null); }} onStatus={changeStatus} />}
    </div>
  );
}

function Details({ r, onClose, onEdit, onStatus }: {
  r: Restaurant; onClose: () => void; onEdit: () => void; onStatus: (r: Restaurant, s: Restaurant["status"]) => void;
}) {
  const [members, setMembers] = useState<Awaited<ReturnType<typeof listMembers>> | null>(null);
  const [users, setUsers] = useState<{ id: string; name: string; role: string }[]>([]);
  const [pick, setPick] = useState("");
  const reload = () => listMembers(r.id).then(setMembers).catch((e) => toast.error(e.message));
  useEffect(() => { reload(); listPosUsers().then(setUsers).catch(() => {}); }, [r.id]);

  const available = users.filter((u) => !members?.some((m) => m.app_user_id === u.id));
  const add = async () => {
    const u = users.find((x) => x.id === pick);
    if (!u) return;
    try { await assignMember(r, u.id, u.name); setPick(""); reload(); toast.success(`${u.name} assigned`); }
    catch (e: any) { toast.error(e.message); }
  };
  const row = (k: string, v: React.ReactNode) => (
    <div className="flex justify-between gap-4 py-1.5 text-sm"><span className="text-muted-foreground">{k}</span><span className="text-right break-all">{v || "—"}</span></div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{r.name}</DialogTitle></DialogHeader>
        <div className="divide-y">
          {row("Restaurant ID", <span className="font-mono">{r.restaurant_code}</span>)}
          {row("Owner", r.owner_name)}{row("Owner email", r.owner_email)}{row("Phone", r.phone)}{row("Address", r.address)}
          {row("POS URL", r.pos_url || DEFAULT_POS_URL)}
          {row("Plan", <span className="capitalize">{r.subscription_plan}</span>)}
          {row("Subscription", `${subscriptionState(r)} (${fmt(r.subscription_starts_at)} → ${fmt(r.subscription_ends_at)})`)}
          {row("Status", <span className="capitalize">{r.status}</span>)}
          {row("Created", fmt(r.created_at))}
        </div>
        <div className="space-y-2">
          <div className="font-semibold text-sm">Assigned POS users</div>
          {members === null ? <p className="text-xs text-muted-foreground">Loading…</p> :
            members.length === 0 ? <p className="text-xs text-muted-foreground">No users assigned.</p> :
            <div className="divide-y border rounded-md">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-3 py-1.5 text-sm">
                  <span>{m.app_users?.name ?? "Unknown"} <span className="text-xs text-muted-foreground capitalize">· {m.app_users?.role}{m.app_users && !m.app_users.is_active ? " · inactive" : ""}</span></span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Remove"
                    onClick={() => removeMember(r, m.id, m.app_users?.name ?? "").then(reload).catch((e) => toast.error(e.message))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>}
          <div className="flex gap-2">
            <select className="flex-1 h-9 rounded-md border bg-background px-2 text-sm" value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">Assign an existing POS user…</option>
              {available.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
            <Button size="sm" disabled={!pick} onClick={add}>Assign</Button>
          </div>
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => onStatus(r, r.status === "active" ? "inactive" : "active")}>{r.status === "active" ? "Deactivate" : "Activate"}</Button>
          <Button variant="outline" onClick={() => onStatus(r, r.status === "suspended" ? "active" : "suspended")}>{r.status === "suspended" ? "Reactivate" : "Suspend"}</Button>
          <Button variant="outline" asChild><a href={posUrlFor(r)} target="_blank" rel="noopener noreferrer">Open POS</a></Button>
          <Button onClick={onEdit}>Edit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
