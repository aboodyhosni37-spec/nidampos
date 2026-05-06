import * as XLSX from "xlsx";
import type { ImportRow } from "./menu";

export type ParsedRow = ImportRow & {
  __row: number;
  __errors: string[];
};

const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_]+/g, "");

const findKey = (obj: Record<string, any>, candidates: string[]): string | undefined => {
  const map = new Map<string, string>();
  Object.keys(obj).forEach((k) => map.set(norm(k), k));
  for (const c of candidates) {
    const hit = map.get(norm(c));
    if (hit) return hit;
  }
  return undefined;
};

export const parseMenuExcel = async (file: File): Promise<ParsedRow[]> => {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
  if (json.length === 0) return [];

  const sample = json[0];
  const kCat = findKey(sample, ["category", "cat"]);
  const kName = findKey(sample, ["product name", "name", "product", "item"]);
  const kPrice = findKey(sample, ["price", "amount", "cost"]);
  const kImage = findKey(sample, ["image url", "image", "img", "photo"]);
  const kStock = findKey(sample, ["stock", "qty", "quantity"]);
  const kThr = findKey(sample, ["low stock", "low stock threshold", "threshold", "min stock"]);

  return json.map((r, i) => {
    const errors: string[] = [];
    const category = String(kCat ? r[kCat] ?? "" : "").trim();
    const name = String(kName ? r[kName] ?? "" : "").trim();
    const priceRaw = kPrice ? r[kPrice] : "";
    const price = typeof priceRaw === "number" ? priceRaw : parseFloat(String(priceRaw));
    const stockRaw = kStock ? r[kStock] : 0;
    const stock = stockRaw === "" || stockRaw == null ? 0 : Number(stockRaw);
    const thrRaw = kThr ? r[kThr] : 5;
    const threshold = thrRaw === "" || thrRaw == null ? 5 : Number(thrRaw);
    const image = kImage ? String(r[kImage] ?? "").trim() : "";

    if (!category) errors.push("Missing category");
    if (!name) errors.push("Missing product name");
    if (!Number.isFinite(price) || price < 0) errors.push("Invalid price");
    if (!Number.isFinite(stock) || stock < 0) errors.push("Invalid stock");

    return {
      __row: i + 2, // accounting for header row
      __errors: errors,
      category,
      name,
      price: Number.isFinite(price) ? price : 0,
      image_url: image || null,
      stock: Number.isFinite(stock) ? stock : 0,
      low_stock_threshold: Number.isFinite(threshold) ? threshold : 5,
    };
  });
};

export const exportMenuExcel = (
  rows: { category_name: string; name: string; price: number; image_url: string | null; stock: number; low_stock_threshold: number }[]
) => {
  const data = rows.map((r) => ({
    Category: r.category_name,
    "Product Name": r.name,
    Price: r.price,
    "Image URL": r.image_url ?? "",
    Stock: r.stock,
    "Low Stock Threshold": r.low_stock_threshold,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Menu");
  XLSX.writeFile(wb, `nidam-menu-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const downloadMenuTemplate = () => {
  const ws = XLSX.utils.json_to_sheet([
    { Category: "Mains", "Product Name": "Grilled Chicken", Price: 14.0, "Image URL": "", Stock: 25, "Low Stock Threshold": 5 },
    { Category: "Drinks", "Product Name": "Coca Cola", Price: 2.5, "Image URL": "", Stock: 100, "Low Stock Threshold": 10 },
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Menu");
  XLSX.writeFile(wb, "nidam-menu-template.xlsx");
};
