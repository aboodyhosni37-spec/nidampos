// Reports engine — all figures are computed from the stored invoice / payment /
// expense records in the database. Nothing is derived from UI values or local storage.
import { supabase } from "@/integrations/supabase/client";
import { MOBILE_METHODS, type PaymentMethod } from "@/lib/db";
import { fetchSettings } from "@/lib/systemSettings";

export type ReportRange = { fromIso: string; toIso: string; fromDate: string; toDate: string };

export type ReportInvoice = {
  id: string;
  number: number;
  created_at: string;
  subtotal: number;
  total: number;
  paid_amount: number;
  due_amount: number;
  delivery_fee: number;
  status: string;
  order_status: string;
  payment_method: PaymentMethod;
  customer_name: string | null;
  table_label: string | null;
  source: string;
  tax: number;
  items: { name: string; price: number; qty: number }[];
};

export type ReportPayment = {
  id: string;
  invoice_id: string;
  method: PaymentMethod;
  amount: number;
  created_at: string;
};

export type ReportTotals = {
  orders: number;
  grossSales: number;
  discounts: number;
  deliveryFees: number;
  tax: number;
  netSales: number;
  totalSales: number;
  totalPaid: number;
  totalDue: number;
  avgTicket: number;
  byMethod: Record<string, number>;
  cash: number;
  card: number;
  mobile: number;
  other: number;
  refunds: number;
  voidedOrders: number;
  voidedValue: number;
  expenses: number;
  netProfit: number;
};

export type ReportData = {
  range: ReportRange;
  invoices: ReportInvoice[];
  payments: ReportPayment[];
  totals: ReportTotals;
  topItems: { name: string; qty: number; revenue: number }[];
  daily: { date: string; sales: number; paid: number; due: number; tax: number; orders: number }[];
  taxRate: number;
  taxInclusive: boolean;
};

// Tax for one order. Prices already include tax, so the tax portion is
// extracted from the charged amount: total x rate / (1 + rate).
// Sales totals are never increased by tax.
export const invoiceTax = (
  inv: { total: number; delivery_fee: number },
  rate: number,
  _inclusive?: boolean
) => {
  if (rate <= 0) return 0;
  const base = Math.max(0, inv.total - inv.delivery_fee);
  const t = base - base / (1 + rate);
  return Math.round(t * 100) / 100;
};

const VOID_STATES = ["cancelled", "canceled", "void", "voided", "refunded"];

export const isVoided = (inv: { status?: string | null; order_status?: string | null }) =>
  VOID_STATES.includes(String(inv.status ?? "").toLowerCase()) ||
  VOID_STATES.includes(String(inv.order_status ?? "").toLowerCase());

export const buildRange = (from?: Date, to?: Date): ReportRange => {
  const start = from ? new Date(from) : new Date(0);
  start.setHours(0, 0, 0, 0);
  const end = to ? new Date(to) : new Date();
  end.setHours(23, 59, 59, 999);
  const localDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return {
    fromIso: start.toISOString(),
    toIso: end.toISOString(),
    fromDate: localDate(start),
    toDate: localDate(end),
  };
};

const PAGE = 1000;

const fetchAllInvoices = async (range: ReportRange): Promise<ReportInvoice[]> => {
  const rows: any[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from("invoices")
      .select(
        "id, number, created_at, subtotal, total, paid_amount, due_amount, delivery_fee, status, order_status, payment_method, customer_name, table_label, source, invoice_items(name, price, qty)"
      )
      .gte("created_at", range.fromIso)
      .lte("created_at", range.toIso)
      .order("created_at", { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }
  // De-duplicate defensively by invoice id so an order can never be counted twice.
  const seen = new Set<string>();
  const out: ReportInvoice[] = [];
  for (const inv of rows) {
    if (seen.has(inv.id)) continue;
    seen.add(inv.id);
    out.push({
      id: inv.id,
      number: Number(inv.number),
      created_at: inv.created_at,
      subtotal: Number(inv.subtotal || 0),
      total: Number(inv.total || 0),
      paid_amount: Number(inv.paid_amount || 0),
      due_amount: Number(inv.due_amount || 0),
      delivery_fee: Number(inv.delivery_fee || 0),
      status: inv.status || "completed",
      order_status: inv.order_status || "Completed",
      payment_method: inv.payment_method,
      customer_name: inv.customer_name ?? null,
      table_label: inv.table_label ?? null,
      source: inv.source || "pos",
      tax: 0,
      items: (inv.invoice_items ?? []).map((it: any) => ({
        name: it.name,
        price: Number(it.price || 0),
        qty: Number(it.qty || 0),
      })),
    });
  }
  return out;
};

const fetchPaymentsForInvoices = async (ids: string[]): Promise<ReportPayment[]> => {
  if (!ids.length) return [];
  const out: ReportPayment[] = [];
  const seen = new Set<string>();
  const CHUNK = 200;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("payments")
      .select("id, invoice_id, method, amount, created_at")
      .in("invoice_id", slice);
    if (error) throw error;
    for (const p of data ?? []) {
      if (seen.has(p.id)) continue; // each payment row counted exactly once
      seen.add(p.id);
      out.push({
        id: p.id,
        invoice_id: p.invoice_id,
        method: p.method as PaymentMethod,
        amount: Number(p.amount || 0),
        created_at: p.created_at,
      });
    }
  }
  return out;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export const fetchReport = async (from?: Date, to?: Date): Promise<ReportData> => {
  const range = buildRange(from, to);
  const [allInvoices, settings] = await Promise.all([
    fetchAllInvoices(range),
    fetchSettings().catch(() => null),
  ]);

  const voided = allInvoices.filter(isVoided);
  const invoices = allInvoices.filter((i) => !isVoided(i));
  const payments = await fetchPaymentsForInvoices(invoices.map((i) => i.id));

  const { data: expRows, error: expErr } = await supabase
    .from("expenses")
    .select("amount")
    .gte("expense_date", range.fromDate)
    .lte("expense_date", range.toDate);
  if (expErr) throw expErr;
  const expenses = (expRows ?? []).reduce((s, e: any) => s + Number(e.amount || 0), 0);

  const grossSales = invoices.reduce((s, i) => s + i.subtotal, 0);
  const deliveryFees = invoices.reduce((s, i) => s + i.delivery_fee, 0);
  const totalSales = invoices.reduce((s, i) => s + i.total, 0);
  // Anything charged below (subtotal + delivery) is a discount.
  const discounts = invoices.reduce(
    (s, i) => s + Math.max(0, round2(i.subtotal + i.delivery_fee - i.total)),
    0
  );

  const taxEnabled = !!settings?.tax_enabled && Number(settings?.tax_rate || 0) > 0;
  const rate = taxEnabled ? Number(settings?.tax_rate || 0) / 100 : 0;
  const taxInclusive = !!settings?.tax_inclusive;
  // Tax is stored per order once, so each order contributes exactly one tax figure.
  for (const inv of invoices) inv.tax = invoiceTax(inv, rate, taxInclusive);
  const tax = invoices.reduce((s, i) => s + i.tax, 0);
  const netSales = round2(totalSales - deliveryFees - tax);

  // Paid / Due come from the invoice records: due always equals total - paid.
  const totalPaid = invoices.reduce((s, i) => s + Math.min(i.paid_amount, i.total), 0);
  const totalDue = invoices.reduce((s, i) => s + Math.max(0, round2(i.total - i.paid_amount)), 0);

  const byMethod: Record<string, number> = {};
  for (const p of payments) {
    if (p.method === "Due") continue; // a due line is not money received
    if (p.amount <= 0) continue;
    byMethod[p.method] = round2((byMethod[p.method] || 0) + p.amount);
  }
  const refunds = payments
    .filter((p) => p.amount < 0)
    .reduce((s, p) => s + Math.abs(p.amount), 0);

  const cash = byMethod["Cash"] || 0;
  const card = byMethod["Card"] || 0;
  const mobile = MOBILE_METHODS.reduce((s, m) => s + (byMethod[m] || 0), 0);
  const other = round2(
    Object.entries(byMethod).reduce(
      (s, [m, v]) =>
        m === "Cash" || m === "Card" || (MOBILE_METHODS as string[]).includes(m) ? s : s + v,
      0
    )
  );

  const itemTotals = new Map<string, { qty: number; revenue: number }>();
  for (const inv of invoices) {
    for (const it of inv.items) {
      const cur = itemTotals.get(it.name) || { qty: 0, revenue: 0 };
      cur.qty += it.qty;
      cur.revenue += it.price * it.qty;
      itemTotals.set(it.name, cur);
    }
  }
  const topItems = [...itemTotals.entries()]
    .map(([name, t]) => ({ name, qty: t.qty, revenue: round2(t.revenue) }))
    .sort((a, b) => b.revenue - a.revenue);

  const dayMap = new Map<
    string,
    { sales: number; paid: number; due: number; tax: number; orders: number }
  >();
  for (const inv of invoices) {
    const d = new Date(inv.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    const cur = dayMap.get(key) || { sales: 0, paid: 0, due: 0, tax: 0, orders: 0 };
    cur.sales += inv.total;
    cur.tax += inv.tax;
    cur.paid += Math.min(inv.paid_amount, inv.total);
    cur.due += Math.max(0, inv.total - inv.paid_amount);
    cur.orders += 1;
    dayMap.set(key, cur);
  }
  const daily = [...dayMap.entries()]
    .map(([date, v]) => ({
      date,
      sales: round2(v.sales),
      paid: round2(v.paid),
      due: round2(v.due),
      tax: round2(v.tax),
      orders: v.orders,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const totals: ReportTotals = {
    orders: invoices.length,
    grossSales: round2(grossSales),
    discounts: round2(discounts),
    deliveryFees: round2(deliveryFees),
    tax: round2(tax),
    netSales,
    totalSales: round2(totalSales),
    totalPaid: round2(totalPaid),
    totalDue: round2(totalDue),
    avgTicket: invoices.length ? round2(totalSales / invoices.length) : 0,
    byMethod,
    cash,
    card,
    mobile,
    other,
    refunds: round2(refunds),
    voidedOrders: voided.length,
    voidedValue: round2(voided.reduce((s, i) => s + i.total, 0)),
    expenses: round2(expenses),
    netProfit: round2(totalSales - expenses),
  };

  return { range, invoices, payments, totals, topItems, daily, taxRate: rate, taxInclusive };
};
