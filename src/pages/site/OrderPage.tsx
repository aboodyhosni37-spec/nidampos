import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import { tables } from "@/lib/posData";
import { useCustomerCart } from "@/lib/customerCart";
import {
  BANADIR_DISTRICTS,
  computeOrderTotals,
  DEFAULT_STORE_SETTINGS,
  deliveryFeeForDistrict,
  fetchStoreSettings,
  placeCustomerOrder,
  type OrderType,
  type PlacedOrder,
  type StoreSettings,
} from "@/lib/storefront";
import { fetchSettings, formatMoney } from "@/lib/systemSettings";
import { cn } from "@/lib/utils";

const newRef = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const getCheckoutRef = () => {
  try {
    const existing = sessionStorage.getItem("lamahamar_checkout_ref");
    if (existing) return JSON.parse(existing) as { ref: string; token: string };
  } catch {}
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const value = { ref: newRef(), token: Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("") };
  sessionStorage.setItem("lamahamar_checkout_ref", JSON.stringify(value));
  return value;
};

const OrderPage = () => {
  const navigate = useNavigate();
  const { lines, increment, decrement, remove, clear, lineAvailability } = useCustomerCart();
  const blocked = lines.filter(l => !lineAvailability(l.product_id).available);
  const [store, setStore] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>("DELIVERY");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [table, setTable] = useState(tables[0]);
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  // One checkout = one order: this reference is created once and reused for
  // every retry of the same checkout, so refreshes or repeated clicks can
  // never create a second order.
  const clientRef = useRef(getCheckoutRef());
  const inFlight = useRef(false);

  useEffect(() => {
    fetchSettings().then(() => setSettingsLoaded(true)).catch(() => {});
    fetchStoreSettings()
      .then((s) => {
        setStore(s);
        if (!s.delivery_enabled) setOrderType("PICKUP");
      })
      .catch(() => {});
  }, []);

  // Delivery fee is fixed by the selected Banadir district — never editable.
  const deliveryFee =
    orderType === "DELIVERY" ? deliveryFeeForDistrict(district) : 0;
  const totals = useMemo(() => computeOrderTotals(lines, deliveryFee), [lines, deliveryFee, settingsLoaded]);

  const submit = async () => {
    if (inFlight.current || submitting) return;
    if (lines.length === 0) return;
    if (blocked.length) return toast.error(`${blocked[0].name}: ${lineAvailability(blocked[0].product_id).message}`);
    if (!name.trim()) return toast.error("Please enter your name.");
    if (!phone.trim()) return toast.error("Please enter your phone number.");
    if (orderType === "DELIVERY" && !district)
      return toast.error("Please select your delivery district in Banadir.");
    if (orderType === "DELIVERY" && !address.trim())
      return toast.error("Please enter your delivery address.");

    inFlight.current = true;
    setSubmitting(true);
    try {
      const res = await placeCustomerOrder({
        order_type: orderType,
        customer_name: name,
        phone,
        district,
        address,
        notes,
        table_label: orderType === "DINE-IN" ? table : undefined,
        items: lines,
        delivery_fee: deliveryFee,
        client_ref: clientRef.current.ref,
        tracking_token: clientRef.current.token,
      });
      setPlaced(res);
      clear();
      localStorage.setItem("lamahamar_last_order_tracking", clientRef.current.token);
      sessionStorage.removeItem("lamahamar_checkout_ref");
      navigate(`/order-status#track=${clientRef.current.token}`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not send your order. Please try again."
      );
    } finally {
      setSubmitting(false);
      inFlight.current = false;
    }
  };

  if (placed) {
    return (
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-20 text-center">
        <span className="mx-auto h-16 w-16 rounded-lg bg-secondary text-primary flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <h1 className="mt-6 text-3xl font-serif">Order received</h1>
        <p className="mt-3 text-muted-foreground">
          Your order number is{" "}
          <span className="font-bold text-foreground">#{placed.number}</span>. Our team has
          it now and will confirm with you shortly.
        </p>
        <div className="mt-6 rounded-lg border border-border bg-card p-5 text-left space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount to pay</span>
            <span className="font-bold tabular-nums">{formatMoney(placed.total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment</span>
            <span className="font-semibold">On delivery / at the cafe</span>
          </div>
        </div>
        <Link
          to="/menu"
          className="mt-8 inline-flex items-center gap-2 h-12 px-6 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
        >
          Order something else <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-20 text-center">
        <span className="mx-auto h-16 w-16 rounded-lg bg-secondary text-primary flex items-center justify-center">
          <ShoppingBag className="h-8 w-8" />
        </span>
        <h1 className="mt-6 text-3xl font-serif">Your order is empty</h1>
        <p className="mt-3 text-muted-foreground">
          Add a few items from the menu and they will show up here.
        </p>
        <Link
          to="/menu"
          className="mt-8 inline-flex items-center gap-2 h-12 px-6 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
        >
          Browse the menu <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
      <h1 className="text-3xl sm:text-4xl font-serif">Your order</h1>
      <p className="mt-2 text-muted-foreground">
        Check your items and choose pickup, delivery or dine-in.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px] items-start">
        {/* ITEMS + DETAILS */}
        <div className="space-y-6">
          <section className="overflow-hidden border-b border-border">
            <header className="h-14 px-5 border-b border-border flex items-center justify-between">
              <h2 className="font-bold">Items</h2>
              <Button
                type="button"
                variant="ghost"
                onClick={clear}
                className="text-xs font-semibold text-muted-foreground hover:text-destructive"
              >
                Clear all
              </Button>
            </header>
            <ul className="divide-y divide-border">
              {lines.map((l) => (
                <li key={l.product_id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_5.5rem_auto] sm:px-5">
                  <div className="min-w-0 col-span-2 sm:col-span-1">
                    <p className="font-semibold leading-snug break-words">{l.name}</p>
                    <p className="text-sm text-muted-foreground tabular-nums">{formatMoney(l.price)} each</p>
                    {!lineAvailability(l.product_id).available && <p role="status" className="text-xs text-destructive">{lineAvailability(l.product_id).message}</p>}
                  </div>
                  <div className="flex items-center rounded-full border border-border">
                    <Button type="button" variant="ghost" size="icon" aria-label={`Decrease ${l.name}`} onClick={() => decrement(l.product_id)} className="h-9 w-9 rounded-full">
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-bold tabular-nums">{l.qty}</span>
                    <Button type="button" variant="ghost" size="icon" disabled={!lineAvailability(l.product_id).available} aria-label={`Increase ${l.name}`} onClick={() => increment(l.product_id)} className="h-9 w-9 rounded-full">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-end gap-1 sm:contents">
                    <span className="text-right font-bold tabular-nums">{formatMoney(l.price * l.qty)}</span>
                    <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${l.name}`} onClick={() => remove(l.product_id)} className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-5 py-5">
            <h2 className="font-bold">How would you like it?</h2>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { key: "DELIVERY" as OrderType, label: "Delivery", icon: Bike, hint: "To your address" },
                  { key: "PICKUP" as OrderType, label: "Pickup", icon: ShoppingBag, hint: "At the cafe" },
                  { key: "DINE-IN" as OrderType, label: "Dine-in", icon: UtensilsCrossed, hint: "At a table" },
                ]
              ).map((o) => {
                const disabled = o.key === "DELIVERY" && !store.delivery_enabled;
                return (
                  <button
                    key={o.key}
                    type="button"
                    disabled={disabled}
                    aria-pressed={orderType === o.key}
                    onClick={() => setOrderType(o.key)}
                    className={cn(
                      "relative flex min-h-[92px] flex-col items-start rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      orderType === o.key
                        ? "border-foreground bg-foreground text-background shadow-sm"
                        : "border-border bg-background text-foreground hover:border-foreground/40",
                      disabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {orderType === o.key && <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-amber-400" aria-hidden />}
                    <o.icon className="h-5 w-5" />
                    <p className="mt-2 font-semibold text-sm">{o.label}</p>
                    <p className={cn("text-xs", orderType === o.key ? "text-background/70" : "text-muted-foreground")}>
                      {disabled ? "Unavailable" : o.hint}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Full name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-12 px-3.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  placeholder="Your name"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Phone number</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  className="w-full h-12 px-3.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  placeholder="+252 …"
                />
              </label>
              {orderType === "DELIVERY" ? (
                <>
                  <label className="space-y-1.5 sm:col-span-2">
                    <span className="text-sm font-medium">Delivery district (Banadir, Mogadishu)</span>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full h-12 px-3.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring/40"
                    >
                      <option value="">Select your district…</option>
                      {BANADIR_DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d} — {formatMoney(deliveryFeeForDistrict(d))}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1.5 sm:col-span-2">
                    <span className="text-sm font-medium">Delivery address</span>
                    <input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full h-12 px-3.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring/40"
                      placeholder="Street, neighborhood, landmark"
                    />
                  </label>
                </>
              ) : orderType === "DINE-IN" ? (
                <label className="space-y-1.5 sm:col-span-2">
                  <span className="text-sm font-medium">Table</span>
                  <select
                    value={table}
                    onChange={(e) => setTable(e.target.value)}
                    className="w-full h-12 px-3.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  >
                    {tables.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium">Notes (optional)</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full p-3.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring/40 resize-none"
                  placeholder="Anything we should know?"
                />
              </label>
            </div>
          </section>
        </div>

        {/* SUMMARY */}
        <aside className="space-y-4 rounded-lg border border-border bg-secondary/40 p-5 sm:p-6 lg:sticky lg:top-24">
          <h2 className="font-bold">Summary</h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-semibold tabular-nums">{formatMoney(totals.subtotal)}</dd>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Discount</dt>
                <dd className="font-semibold tabular-nums">
                  −{formatMoney(totals.discount)}
                </dd>
              </div>
            )}
            {totals.tax > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tax</dt>
                <dd className="font-semibold tabular-nums">{formatMoney(totals.tax)}</dd>
              </div>
            )}
            {orderType === "DELIVERY" && (
              <>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Delivery district</dt>
                  <dd className="font-semibold">{district || "Not selected"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Delivery fee</dt>
                  <dd className="font-semibold tabular-nums">
                    {district ? formatMoney(totals.deliveryFee) : "—"}
                  </dd>
                </div>
              </>
            )}
          </dl>
          <div className="border-t border-border pt-4 flex items-end justify-between">
            <span className="font-bold">Total</span>
            <span className="text-2xl font-extrabold tabular-nums">
              {formatMoney(totals.total)}
            </span>
          </div>
          <Button
            type="button"
            onClick={submit}
            disabled={submitting || !settingsLoaded || blocked.length > 0}
            className="w-full min-h-[52px] rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors disabled:opacity-70 inline-flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sending your order…
              </>
            ) : (
              <>
                Place order <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
          {blocked.length > 0 && <p role="alert" className="text-sm text-destructive">Remove unavailable items before placing your order. Your saved orders are unchanged.</p>}
          <p className="text-xs text-muted-foreground text-center">
            You pay on delivery or at the cafe. Nothing is charged online.
          </p>
        </aside>
      </div>
    </div>
  );
};

export default OrderPage;
