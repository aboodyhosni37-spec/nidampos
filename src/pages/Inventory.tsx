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
import { Package, Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2 } from "lucide-react";
import { listProducts, replaceMenu, updateProductStock, type DbProduct } from "@/lib/menu";
import {
  parseMenuExcel,
  exportMenuExcel,
  downloadMenuTemplate,
  type ParsedRow,
} from "@/lib/excelImport";
import { toast } from "@/hooks/use-toast";

const Inventory = () => {
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

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
            onClick={() => fileRef.current?.click()}
            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
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
          <div className="text-2xl font-bold mt-1 text-amber-600">{lowStockCount}</div>
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
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground">Loading…</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground">
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
    </div>
  );
};

export default Inventory;
