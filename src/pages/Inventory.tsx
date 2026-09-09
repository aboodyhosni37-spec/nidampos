import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Package, Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2, Plus, Pencil, ImagePlus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  listProducts,
  replaceMenu,
  updateProductStock,
  updateProductDetails,
  uploadProductImage,
  addInventory,
  updateProductVisibility,
  type DbProduct,
} from "@/lib/menu";

import {
  parseMenuExcel,
  exportMenuExcel,
  downloadMenuTemplate,
  type ParsedRow,
} from "@/lib/excelImport";
import { toast } from "@/hooks/use-toast";

const emptyForm = {
  category: "",
  name: "",
  price: "",
  stock: "",
  low_stock_threshold: "5",
  image_url: "",
};

const Inventory = () => {
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<DbProduct | null>(null);
  const [editForm, setEditForm] = useState({ name: "", price: "", image_url: "" as string | null });
  const [editSaving, setEditSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const openEdit = (p: DbProduct) => {
    setEditing(p);
    setEditForm({ name: p.name, price: String(p.price), image_url: p.image_url });
  };

  const onEditImageChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      setEditForm((f) => ({ ...f, image_url: url }));
      toast({ title: "Image ready", description: "Save to apply it to this product." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (imageRef.current) imageRef.current.value = "";
    }
  };

  const submitEdit = async () => {
    if (!editing) return;
    const name = editForm.name.trim();
    const price = parseFloat(editForm.price);
    if (!name) {
      toast({ title: "Product name is required", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast({ title: "Enter a valid price", variant: "destructive" });
      return;
    }
    setEditSaving(true);
    try {
      await updateProductDetails(editing.id, {
        name,
        price,
        image_url: editForm.image_url || null,
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editing.id ? { ...p, name, price, image_url: editForm.image_url || null } : p
        )
      );
      toast({ title: "Product updated", description: `${name} is live on the customer menu.` });
      setEditing(null);
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };
  const toggleVisibility = async (
    p: DbProduct,
    patch: { show_on_web?: boolean; show_in_pos?: boolean }
  ) => {
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
    try {
      await updateProductVisibility(p.id, patch);
      const where = "show_on_web" in patch ? "Customer website" : "POS";
      const on = "show_on_web" in patch ? patch.show_on_web : patch.show_in_pos;
      toast({ title: `${where}: ${on ? "visible" : "hidden"}`, description: p.name });
    } catch (e: any) {
      setProducts((prev) => prev.map((x) => (x.id === p.id ? p : x)));
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  };




  const refresh = () => {
    setLoading(true);
    listProducts()
      .then(setProducts)
      .catch((e) => toast({ title: "Failed to load", description: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseMenuExcel(file);
      if (rows.length === 0) {
        toast({ title: "Empty file", description: "No rows found.", variant: "destructive" });
        return;
      }
      setParsed(rows);
      setPreviewOpen(true);
    } catch (err: any) {
      toast({ title: "Parse failed", description: err.message, variant: "destructive" });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const validRows = parsed.filter((r) => r.__errors.length === 0);
  const invalidCount = parsed.length - validRows.length;

  const confirmImport = async () => {
    if (validRows.length === 0) {
      toast({ title: "No valid rows", variant: "destructive" });
      return;
    }
    setImporting(true);
    try {
      const res = await replaceMenu(validRows);
      toast({
        title: "Menu imported",
        description: `${res.productsCreated} products in ${res.categoriesCreated} categories.`,
      });
      setPreviewOpen(false);
      setParsed([]);
      refresh();
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handleStockChange = async (id: string, value: string) => {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 0) return;
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock: n } : p)));
    try {
      await updateProductStock(id, n);
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  };

  const submitAdd = async () => {
    const price = parseFloat(form.price);
    const stock = form.stock === "" ? 0 : parseInt(form.stock, 10);
    const thr = form.low_stock_threshold === "" ? 5 : parseInt(form.low_stock_threshold, 10);
    if (!form.category.trim() || !form.name.trim()) {
      toast({ title: "Category and product name are required", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast({ title: "Enter a valid price", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      toast({ title: "Enter a valid quantity", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await addInventory([
        {
          category: form.category,
          name: form.name,
          price,
          stock,
          low_stock_threshold: Number.isFinite(thr) ? thr : 5,
          image_url: form.image_url || null,
        },
      ]);
      toast({
        title: res.updated > 0 ? "Stock added" : "Product added",
        description:
          res.updated > 0
            ? `${form.name.trim()} stock increased by ${stock}.`
            : `${form.name.trim()} created with ${stock} in stock.`,
      });
      setAddOpen(false);
      setForm(emptyForm);
      refresh();
    } catch (e: any) {
      toast({ title: "Could not add", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const categoryNames = [...new Set(products.map((p) => p.category_name))].sort();

  const lowStockCount = products.filter((p) => p.stock <= p.low_stock_threshold).length;


  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1">
            Manage your menu, stock, and low-stock thresholds.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={downloadMenuTemplate} className="rounded-xl">
            <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Template
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              exportMenuExcel(products.map((p) => ({
                category_name: p.category_name,
                name: p.name,
                price: p.price,
                image_url: p.image_url,
                stock: p.stock,
                low_stock_threshold: p.low_stock_threshold,
              })))
            }
            disabled={products.length === 0}
            className="rounded-xl"
          >
            <Download className="h-4 w-4 mr-1.5" /> Export
          </Button>
          <Button
            onClick={() => setAddOpen(true)}
            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Inventory
          </Button>
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            className="rounded-xl"
          >
            <Upload className="h-4 w-4 mr-1.5" /> Import Excel
          </Button>

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={onFileChosen}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 rounded-2xl border-border">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Items</div>
          <div className="text-2xl font-bold mt-1">{products.length}</div>
        </Card>
        <Card className="p-4 rounded-2xl border-border">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Low Stock</div>
          <div className="text-2xl font-bold mt-1 text-foreground">{lowStockCount}</div>
        </Card>
        <Card className="p-4 rounded-2xl border-border">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Inventory Value</div>
          <div className="text-2xl font-bold mt-1">
            ${products.reduce((s, p) => s + p.price * p.stock, 0).toFixed(2)}
          </div>
        </Card>
      </div>

      <Card className="rounded-2xl overflow-hidden border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-muted-foreground text-left">
              <tr>
                <th className="p-4 font-semibold">Item</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold text-right">Price</th>
                <th className="p-4 font-semibold text-right">Stock</th>
                <th className="p-4 font-semibold text-right">Threshold</th>
                <th className="p-4 font-semibold">Visibility</th>
                <th className="p-4 font-semibold">Status</th>

                <th className="p-4 font-semibold text-right">Edit</th>

              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground">Loading…</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground">
                    No products yet. Import your menu from Excel to get started.
                  </td>
                </tr>

              ) : (
                products.map((p) => {
                  const low = p.stock <= p.low_stock_threshold;
                  return (
                    <tr key={p.id} className="hover:bg-secondary/40">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.name}
                              className="h-10 w-10 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground">
                              <Package className="h-4 w-4" />
                            </div>
                          )}
                          <span className="font-semibold">{p.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{p.category_name}</td>
                      <td className="p-4 text-right">${p.price.toFixed(2)}</td>
                      <td className="p-4 text-right">
                        <Input
                          type="number"
                          min={0}
                          value={p.stock}
                          onChange={(e) => handleStockChange(p.id, e.target.value)}
                          className="h-8 w-20 ml-auto text-right rounded-lg"
                        />
                      </td>
                      <td className="p-4 text-right text-muted-foreground">{p.low_stock_threshold}</td>
                      <td className="p-4">
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-2 text-xs">
                            <Switch
                              checked={p.show_on_web}
                              onCheckedChange={(v) => toggleVisibility(p, { show_on_web: v })}
                            />
                            <span className="text-muted-foreground">Website</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs">
                            <Switch
                              checked={p.show_in_pos}
                              onCheckedChange={(v) => toggleVisibility(p, { show_in_pos: v })}
                            />
                            <span className="text-muted-foreground">POS</span>
                          </label>
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold " +
                            (low
                              ? "bg-destructive/10 text-destructive"
                              : "bg-primary/10 text-primary")
                          }
                        >
                          <Package className="h-3 w-3" /> {low ? "Low" : "In stock"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(p)}
                          className="rounded-lg"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                        </Button>
                      </td>
                    </tr>

                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Import preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import Preview</DialogTitle>
            <DialogDescription>
              Review parsed rows before replacing your current menu.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3 text-sm flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-4 w-4" /> {validRows.length} valid
            </div>
            {invalidCount > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="h-4 w-4" /> {invalidCount} with errors (skipped)
              </div>
            )}
          </div>

          <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead className="bg-secondary/60 sticky top-0">
                <tr className="text-left">
                  <th className="p-2 font-semibold">Row</th>
                  <th className="p-2 font-semibold">Category</th>
                  <th className="p-2 font-semibold">Name</th>
                  <th className="p-2 font-semibold text-right">Price</th>
                  <th className="p-2 font-semibold text-right">Stock</th>
                  <th className="p-2 font-semibold">Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parsed.map((r) => (
                  <tr
                    key={r.__row}
                    className={r.__errors.length ? "bg-destructive/5" : ""}
                  >
                    <td className="p-2 text-muted-foreground">{r.__row}</td>
                    <td className="p-2">{r.category || <em className="text-muted-foreground">—</em>}</td>
                    <td className="p-2 font-medium">{r.name || <em className="text-muted-foreground">—</em>}</td>
                    <td className="p-2 text-right">${(r.price || 0).toFixed(2)}</td>
                    <td className="p-2 text-right">{r.stock ?? 0}</td>
                    <td className="p-2 text-destructive">{r.__errors.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-muted-foreground">
            <AlertTriangle className="h-3 w-3 inline mr-1" />
            Importing will <b>replace</b> your existing menu (categories & products).
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmImport}
              disabled={importing || validRows.length === 0}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {importing ? "Importing…" : `Replace menu (${validRows.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add inventory dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => !o && setAddOpen(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Inventory</DialogTitle>
            <DialogDescription>
              Existing items get their stock increased. New items are created with the same fields
              as the Excel import.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Category</Label>
              <Input
                list="inv-categories"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Drinks"
                className="h-11 rounded-xl"
              />
              <datalist id="inv-categories">
                {categoryNames.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Product name</Label>
              <Input
                list="inv-products"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Coca Cola"
                className="h-11 rounded-xl"
              />
              <datalist id="inv-products">
                {products.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label>Price</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Quantity to add</Label>
              <Input
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Low stock alert</Label>
              <Input
                type="number"
                min={0}
                value={form.low_stock_threshold}
                onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Image URL (optional)</Label>
              <Input
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={submitAdd}
              disabled={saving}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? "Saving…" : "Add to inventory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit product dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit product</DialogTitle>
            <DialogDescription>
              Name, price and photo update on the customer menu right after saving. Stock and
              category are not affected.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-4">
              {editForm.image_url ? (
                <img
                  src={editForm.image_url}
                  alt={editForm.name}
                  className="h-20 w-20 rounded-xl object-cover border border-border"
                />
              ) : (
                <div className="h-20 w-20 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground border border-border">
                  <Package className="h-6 w-6" />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => imageRef.current?.click()}
                  disabled={uploading}
                  className="rounded-lg"
                >
                  <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
                  {uploading ? "Uploading…" : editForm.image_url ? "Replace photo" : "Add photo"}
                </Button>
                {editForm.image_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditForm((f) => ({ ...f, image_url: null }))}
                    className="rounded-lg"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remove
                  </Button>
                )}
                <input
                  ref={imageRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onEditImageChosen}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Product name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Selling price</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={editForm.price}
                onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={submitEdit}
              disabled={editSaving || uploading}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {editSaving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>


  );
};

export default Inventory;
