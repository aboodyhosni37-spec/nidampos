import { supabase } from "@/integrations/supabase/client";

export type DbCategory = {
  id: string;
  name: string;
  sort_order: number;
};

export type DbProduct = {
  id: string;
  category_id: string | null;
  category_name: string;
  name: string;
  price: number;
  image_url: string | null;
  stock: number;
  low_stock_threshold: number;
  is_active: boolean;
};

export const listCategories = async (): Promise<DbCategory[]> => {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return (data ?? []) as DbCategory[];
};

export const listProducts = async (): Promise<DbProduct[]> => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("category_name")
    .order("name");
  if (error) throw error;
  return (data ?? []) as DbProduct[];
};

export type ImportRow = {
  category: string;
  name: string;
  price: number;
  image_url?: string | null;
  stock?: number;
  low_stock_threshold?: number;
};

export type ImportResult = {
  categoriesCreated: number;
  productsCreated: number;
};

/**
 * Replaces the entire menu with the provided rows.
 * Categories are upserted by name; products are inserted fresh.
 */
export const replaceMenu = async (rows: ImportRow[]): Promise<ImportResult> => {
  // Wipe products & categories
  const { error: delP } = await supabase.from("products").delete().not("id", "is", null);
  if (delP) throw delP;
  const { error: delC } = await supabase.from("categories").delete().not("id", "is", null);
  if (delC) throw delC;

  // Unique categories preserving order
  const seen = new Set<string>();
  const cats: { name: string; sort_order: number }[] = [];
  rows.forEach((r) => {
    const n = r.category.trim();
    if (!n || seen.has(n)) return;
    seen.add(n);
    cats.push({ name: n, sort_order: cats.length });
  });

  const { data: catRows, error: catErr } = await supabase
    .from("categories")
    .insert(cats)
    .select("*");
  if (catErr) throw catErr;

  const catMap = new Map<string, string>();
  (catRows ?? []).forEach((c: any) => catMap.set(c.name, c.id));

  const products = rows.map((r) => ({
    category_id: catMap.get(r.category.trim()) ?? null,
    category_name: r.category.trim(),
    name: r.name.trim(),
    price: r.price,
    image_url: r.image_url?.trim() || null,
    stock: r.stock ?? 0,
    low_stock_threshold: r.low_stock_threshold ?? 5,
    is_active: true,
  }));

  const { error: prodErr } = await supabase.from("products").insert(products);
  if (prodErr) throw prodErr;

  return {
    categoriesCreated: cats.length,
    productsCreated: products.length,
  };
};

export const updateProductStock = async (id: string, stock: number) => {
  const { error } = await supabase
    .from("products")
    .update({ stock, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};

/** Updates only the product's display details (name, price, image). */
export const updateProductDetails = async (
  id: string,
  patch: { name?: string; price?: number; image_url?: string | null }
) => {
  const { error } = await supabase
    .from("products")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};

/** Product images live in the existing public storage bucket, products/ folder. */
export const uploadProductImage = async (file: File): Promise<string> => {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `products/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("staff-photos")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("staff-photos").getPublicUrl(path);
  return data.publicUrl;
};


export type AddInventoryResult = {
  created: number;
  updated: number;
  categoriesCreated: number;
};

/**
 * Adds stock without replacing the menu. Uses exactly the same product,
 * category and stock fields as the Excel import. Existing products get their
 * stock INCREASED (never overwritten); unknown products are created.
 */
export const addInventory = async (rows: ImportRow[]): Promise<AddInventoryResult> => {
  const cleaned = rows
    .map((r) => ({ ...r, category: r.category.trim(), name: r.name.trim() }))
    .filter((r) => r.category && r.name);
  if (cleaned.length === 0) throw new Error("Nothing to add.");

  const existingCats = await listCategories();
  const catMap = new Map<string, string>();
  existingCats.forEach((c) => catMap.set(c.name.toLowerCase(), c.id));

  const newCatNames = [
    ...new Set(cleaned.map((r) => r.category).filter((n) => !catMap.has(n.toLowerCase()))),
  ];
  if (newCatNames.length > 0) {
    const base = existingCats.length;
    const { data: created, error } = await supabase
      .from("categories")
      .insert(newCatNames.map((name, i) => ({ name, sort_order: base + i })))
      .select("*");
    if (error) throw error;
    (created ?? []).forEach((c: any) => catMap.set(String(c.name).toLowerCase(), c.id));
  }

  const { data: allProducts, error: prodErr } = await supabase
    .from("products")
    .select("id, name, category_name, stock");
  if (prodErr) throw prodErr;
  const prodMap = new Map<string, { id: string; stock: number }>();
  (allProducts ?? []).forEach((p: any) =>
    prodMap.set(`${String(p.category_name).toLowerCase()}|${String(p.name).toLowerCase()}`, {
      id: p.id,
      stock: Number(p.stock || 0),
    })
  );

  let updated = 0;
  const toCreate: any[] = [];

  for (const r of cleaned) {
    const key = `${r.category.toLowerCase()}|${r.name.toLowerCase()}`;
    const hit = prodMap.get(key);
    const addQty = Number(r.stock ?? 0);
    if (hit) {
      const patch = {
        stock: hit.stock + addQty,
        updated_at: new Date().toISOString(),
        ...(Number.isFinite(r.price) && r.price > 0 ? { price: r.price } : {}),
        ...(r.image_url ? { image_url: r.image_url } : {}),
        ...(r.low_stock_threshold != null
          ? { low_stock_threshold: r.low_stock_threshold }
          : {}),
      };
      const { error } = await supabase.from("products").update(patch).eq("id", hit.id);

      if (error) throw error;
      hit.stock += addQty;
      updated += 1;
    } else {
      toCreate.push({
        category_id: catMap.get(r.category.toLowerCase()) ?? null,
        category_name: r.category,
        name: r.name,
        price: r.price,
        image_url: r.image_url?.trim() || null,
        stock: addQty,
        low_stock_threshold: r.low_stock_threshold ?? 5,
        is_active: true,
      });
    }
  }

  if (toCreate.length > 0) {
    const { error } = await supabase.from("products").insert(toCreate);
    if (error) throw error;
  }

  return { created: toCreate.length, updated, categoriesCreated: newCatNames.length };
};

