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
