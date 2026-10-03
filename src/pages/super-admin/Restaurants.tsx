import { useEffect, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { listRestaurants, saveRestaurant, type Restaurant } from "@/lib/superAdmin";

const STATUSES = ["active", "suspended", "inactive"];
const SUBS = ["trial", "active", "past_due", "cancelled"];
const empty: Partial<Restaurant> = { name: "", restaurant_code: "", status: "active", subscription_plan: "standard", subscription_status: "trial" };

export default function SuperAdminRestaurants() {
  const [rows, setRows] = useState<Restaurant[]>([]);
  const [edit, setEdit] = useState<Partial<Restaurant> | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => listRestaurants().then(setRows).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const set = (k: keyof Restaurant, v: string) => setEdit((e) => ({ ...e!, [k]: v || null }));

  const save = async () => {
    if (!edit?.name?.trim() || !edit.restaurant_code?.trim()) return toast.error("Name and ID are required");
    setBusy(true);
    try {
      await saveRestaurant({ ...edit, restaurant_code: edit.restaurant_code.trim().toLowerCase().replace(/\s+/g, "-") });
      toast.success("Saved");
      setEdit(null);
      load();
    } catch (e: any) {
      toast.error(e.code === "23505" ? "That restaurant ID is already used" : e.message);
    } finally {
      setBusy(false);
    }
  };

  const sel = (k: keyof Restaurant, opts: string[]) => (
    <select
      className="w-full h-10 rounded-md border bg-background px-3 text-sm"
      value={(edit?.[k] as string) ?? ""}
      onChange={(e) => set(k, e.target.value)}
    >
      {opts.map((o) => <option key={o} value={o}>{o.replace("_", " ")}</option>)}
    </select>
  );

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Restaurants</h1>
        <Button onClick={() => setEdit({ ...empty })}><Plus className="h-4 w-4 mr-1" /> Add restaurant</Button>
      </div>
      <Card className="divide-y">
        {rows.map((r) => (
          <div key={r.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold">{r.name}</div>
              <div className="text-xs text-muted-foreground">ID: {r.restaurant_code}{r.owner_name ? ` · Owner: ${r.owner_name}` : ""}</div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-secondary capitalize">{r.status}</span>
              <span className="px-2 py-1 rounded border capitalize">{r.subscription_plan} · {r.subscription_status.replace("_", " ")}</span>
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
      </Card>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{edit?.id ? "Edit restaurant" : "New restaurant"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1"><Label>Name</Label><Input value={edit.name ?? ""} onChange={(e) => set("name", e.target.value)} /></div>
              <div className="space-y-1"><Label>Restaurant ID</Label><Input value={edit.restaurant_code ?? ""} disabled={!!edit.id} onChange={(e) => set("restaurant_code", e.target.value)} /></div>
              <div className="space-y-1"><Label>Status</Label>{sel("status", STATUSES)}</div>
              <div className="space-y-1"><Label>Owner name</Label><Input value={edit.owner_name ?? ""} onChange={(e) => set("owner_name", e.target.value)} /></div>
              <div className="space-y-1"><Label>Owner email</Label><Input value={edit.owner_email ?? ""} onChange={(e) => set("owner_email", e.target.value)} /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={edit.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></div>
              <div className="space-y-1"><Label>Plan</Label><Input value={edit.subscription_plan ?? ""} onChange={(e) => set("subscription_plan", e.target.value)} /></div>
              <div className="space-y-1"><Label>Subscription</Label>{sel("subscription_status", SUBS)}</div>
              <div className="space-y-1"><Label>Renews / ends</Label><Input type="date" value={edit.subscription_ends_at ?? ""} onChange={(e) => set("subscription_ends_at", e.target.value)} /></div>
              <div className="col-span-2 space-y-1"><Label>Address</Label><Input value={edit.address ?? ""} onChange={(e) => set("address", e.target.value)} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
            <Button onClick={save} disabled={busy}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
