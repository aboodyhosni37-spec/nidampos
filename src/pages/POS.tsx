import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Minus,
  Trash2,
  Search,
  CreditCard,
  Banknote,
  Users,
  ShoppingCart,
  Wallet,
  UserPlus,
  AlertTriangle,
  PauseCircle,
  PlayCircle,
  FilePlus,
  Tag,
  Receipt,
  RefreshCw,
  Percent,
  Gift,
  Sparkles,
  Monitor,
  QrCode,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  loadReceiptSettings,
  type ReceiptSettings,
} from "@/lib/receiptSettings";
import {
  publishDisplay,
  openCustomerDisplay,
} from "@/lib/customerDisplay";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { categories as seedCategories, products as seedProducts, tables } from "@/lib/posData";
import { listCategories, listProducts, type DbCategory, type DbProduct } from "@/lib/menu";
import { addOrder, type Order, type OrderItem } from "@/lib/orders";
import {
  addHeldOrder,
  generateOrderId,
  loadHeldOrders,
  removeHeldOrder,
  type HeldOrder,
} from "@/lib/heldOrders";
import { ReceiptPreview } from "@/components/ReceiptPreview";
import { toast } from "@/hooks/use-toast";
import {
  ALL_PAYMENT_METHODS,
  MOBILE_METHODS,
  createCustomer,
  createInvoice,
  listCustomers,
  listUnpaidInvoices,
  payUnpaidInvoice,
  type Customer,
  type PaymentMethod,
  type UnpaidInvoice,
} from "@/lib/db";
import {
  fetchSettings,
  getCachedSettings,
  subscribeSettings,
  computeTotals,
  formatMoney,
  type SystemSettings,
  type DiscountInput,
} from "@/lib/systemSettings";
import { addCustomerSpend, consumeReward, rewardLabel } from "@/lib/loyalty";
import { getSession } from "@/lib/auth";

const HIGH_DEBT_THRESHOLD = 100;
const ADD_DEBOUNCE_MS = 250;

type OrderStatus = "Active" | "Held" | "Completed" | "Cancelled";

const statusStyles: Record<OrderStatus, string> = {
  Active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  Held: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  Completed: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  Cancelled: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
};

const POS = () => {
  const [activeCat, setActiveCat] = useState("all");
  const [search, setSearch] = useState("");
  const [dbCategories, setDbCategories] = useState<DbCategory[]>([]);
  const [dbProducts, setDbProducts] = useState<DbProduct[]>([]);

  // Use DB menu when available; otherwise fall back to seed for first-time users
  const useDb = dbProducts.length > 0;
  const categories = useDb
    ? [{ id: "all", name: "All", emoji: "🍽️" }, ...dbCategories.map((c) => ({ id: c.id, name: c.name, emoji: "🍽️" }))]
    : seedCategories;
  const products = useDb
    ? dbProducts.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        categoryId: p.category_id ?? "all",
        emoji: "🍽️",
        image_url: p.image_url,
      }))
    : seedProducts.map((p) => ({ ...p, image_url: null as string | null }));

  // Active order state
  const [orderId, setOrderId] = useState<string>(() => generateOrderId());
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("Active");
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [table, setTable] = useState(tables[0]);
  const [customerName, setCustomerName] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("Cash");
  const [splitDue, setSplitDue] = useState(false);
  const [dueAmount, setDueAmount] = useState<string>("");
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Held orders
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(() => loadHeldOrders());
  const [heldOpen, setHeldOpen] = useState(false);

  // Confirm dialogs
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [pendingResume, setPendingResume] = useState<HeldOrder | null>(null);

  // Customers (loaded for Due flow)
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");

  // Debounce add-to-cart to prevent duplicate clicks
  const lastAddRef = useRef<{ id: string; t: number }>({ id: "", t: 0 });

  // Left panel mode: products grid vs due-orders list
  const [leftMode, setLeftMode] = useState<"menu" | "due">("menu");

  // Due orders inside POS
  const [unpaid, setUnpaid] = useState<UnpaidInvoice[]>([]);
  const [unpaidLoading, setUnpaidLoading] = useState(false);
  const [payOrder, setPayOrder] = useState<UnpaidInvoice | null>(null);
  const [payMethodInline, setPayMethodInline] = useState<Exclude<PaymentMethod, "Due" | "Split">>("EVC-Plus");
  const [payingInline, setPayingInline] = useState(false);

  // System settings (currency + tax)
  const [sys, setSys] = useState<SystemSettings>(() => getCachedSettings());

  // Discount + reward usage on the active order
  const session = getSession();
  const canDiscount = !!session?.permissions?.apply_discount || session?.role === "admin";
  const [discountType, setDiscountType] = useState<"none" | "percent" | "fixed">("none");
  const [discountValue, setDiscountValue] = useState<string>("");
  const [discountOpen, setDiscountOpen] = useState(false);
  const [appliedReward, setAppliedReward] = useState<"none" | "half_off" | "free_lunch">("none");

  // Receipt / printer / dual-screen settings (local)
  const [receiptCfg, setReceiptCfg] = useState<ReceiptSettings>(() => loadReceiptSettings());
  useEffect(() => {
    const onStorage = () => setReceiptCfg(loadReceiptSettings());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // QR payment dialog
  const [qrOpen, setQrOpen] = useState(false);

  const refreshUnpaid = async () => {
    setUnpaidLoading(true);
    try {
      const rows = await listUnpaidInvoices();
      setUnpaid(rows);
    } catch (e: any) {
      toast({ title: "Failed to load due orders", description: e.message, variant: "destructive" });
    } finally {
      setUnpaidLoading(false);
    }
  };

  useEffect(() => {
    listCustomers().then(setCustomers).catch(() => {});
    listCategories().then(setDbCategories).catch(() => {});
    listProducts().then(setDbProducts).catch(() => {});
    refreshUnpaid();
    fetchSettings().then(setSys).catch(() => {});
    const unsub = subscribeSettings(setSys);

    const channel = supabase
      .channel("pos-invoices")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invoices" },
        () => refreshUnpaid()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      unsub();
    };
  }, []);

  // Expose cart presence for layout's exit-confirm dialog
  useEffect(() => {
    (window as any).__posHasCart = cart.length > 0;
    return () => {
      (window as any).__posHasCart = false;
    };
  }, [cart.length]);

  const inlinePayNow = async () => {
    if (!payOrder) return;
    const due = Number(payOrder.due_amount) || Number(payOrder.total) || 0;
    if (due <= 0) {
      toast({ title: "Nothing to pay" });
      setPayOrder(null);
      return;
    }
    setPayingInline(true);
    try {
      await payUnpaidInvoice({
        invoice_id: payOrder.id,
        amount: due,
        method: payMethodInline,
        customer_id: payOrder.customer_id ?? undefined,
      });
      toast({
        title: "Payment received",
        description: `Order #${payOrder.number} marked PAID via ${payMethodInline}.`,
      });
      setPayOrder(null);
      refreshUnpaid();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setPayingInline(false);
    }
  };

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const inCat = activeCat === "all" || p.categoryId === activeCat;
      const inSearch = p.name.toLowerCase().includes(search.toLowerCase());
      return inCat && inSearch;
    });
  }, [activeCat, search]);

  const resetActiveOrder = (newId?: string) => {
    setOrderId(newId ?? generateOrderId());
    setOrderStatus("Active");
    setCart([]);
    setSplitDue(false);
    setDueAmount("");
    setSelectedCustomerId("");
    setCustomerName("");
    setPayment("Cash");
    setDiscountType("none");
    setDiscountValue("");
    setAppliedReward("none");
  };

  const addItem = (productId: string) => {
    const now = Date.now();
    if (
      lastAddRef.current.id === productId &&
      now - lastAddRef.current.t < ADD_DEBOUNCE_MS
    ) {
      return; // debounce duplicate clicks
    }
    lastAddRef.current = { id: productId, t: now };

    const p = products.find((x) => x.id === productId);
    if (!p) return;
    if (orderStatus !== "Active") {
      toast({
        title: "No active order",
        description: "Start a new order to add items.",
        variant: "destructive",
      });
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.id === p.id);
      if (existing)
        return prev.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { id: p.id, name: p.name, price: p.price, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) =>
    setCart((prev) =>
      prev.map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i)).filter((i) => i.qty > 0)
    );
  const removeItem = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));

  const handleClearCart = () => {
    if (cart.length === 0) {
      toast({ title: "Cart already empty" });
      return;
    }
    setConfirmClear(true);
  };

  const handleNewOrder = () => {
    if (cart.length > 0) {
      setConfirmNew(true);
    } else {
      resetActiveOrder();
      toast({ title: "New order started" });
    }
  };

  const handleHoldOrder = () => {
    if (cart.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Add items before holding an order.",
        variant: "destructive",
      });
      return;
    }
    const held: HeldOrder = {
      id: crypto.randomUUID(),
      shortId: orderId,
      items: cart,
      table,
      customerName: customerName || undefined,
      heldAt: new Date().toISOString(),
    };
    addHeldOrder(held);
    setHeldOrders(loadHeldOrders());
    resetActiveOrder();
    toast({ title: "Order held", description: `${held.shortId} saved to Held Orders` });
  };

  const requestResume = (h: HeldOrder) => {
    if (cart.length > 0) {
      setPendingResume(h);
    } else {
      doResume(h);
    }
  };

  const doResume = (h: HeldOrder) => {
    setOrderId(h.shortId);
    setOrderStatus("Active");
    setCart(h.items);
    setTable(h.table);
    setCustomerName(h.customerName || "");
    setSplitDue(false);
    setDueAmount("");
    setSelectedCustomerId("");
    setPayment("Cash");
    removeHeldOrder(h.id);
    setHeldOrders(loadHeldOrders());
    setHeldOpen(false);
    setPendingResume(null);
    toast({ title: "Order resumed", description: h.shortId });
  };

  const deleteHeld = (h: HeldOrder) => {
    removeHeldOrder(h.id);
    setHeldOrders(loadHeldOrders());
    toast({ title: "Held order removed", description: h.shortId });
  };

  const rawSubtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  // Build effective discount = manual discount + reward (whichever applies).
  const effectiveDiscount: DiscountInput = useMemo(() => {
    // Reward overrides manual when chosen.
    if (appliedReward === "free_lunch") return { type: "percent", value: 100 };
    if (appliedReward === "half_off") return { type: "percent", value: 50 };
    const v = parseFloat(discountValue) || 0;
    if (discountType === "none" || v <= 0) return { type: "none", value: 0 };
    return { type: discountType, value: v };
  }, [discountType, discountValue, appliedReward]);

  const totals = useMemo(
    () => computeTotals(rawSubtotal, effectiveDiscount, sys),
    [rawSubtotal, effectiveDiscount, sys]
  );
  const total = totals.total;

  // Real-time sync to customer display (only when dual screen enabled & not in QR/paid mode)
  useEffect(() => {
    if (!receiptCfg.enableDualScreen) return;
    if (qrOpen) return; // QR mode publishes its own state
    publishDisplay({
      type: cart.length === 0 ? "idle" : "cart",
      items: cart.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      total,
      currencySymbol: sys.currency_symbol || "$",
      businessName: receiptCfg.businessName,
    });
  }, [cart, totals.subtotal, totals.discount, totals.tax, total, sys.currency_symbol, receiptCfg.enableDualScreen, receiptCfg.businessName, qrOpen]);

  const qrPayload = useMemo(
    () =>
      `PAY TO: ${receiptCfg.merchantNumber || "N/A"}, AMOUNT: ${total.toFixed(2)}, ORDER: ${orderId}`,
    [receiptCfg.merchantNumber, total, orderId]
  );

  const openQrPayment = () => {
    if (cart.length === 0) {
      toast({ title: "Cart is empty", description: "Add items before requesting payment." });
      return;
    }
    if (!receiptCfg.merchantNumber) {
      toast({
        title: "Merchant number missing",
        description: "Set it in Settings → Printer & Receipt before using QR payments.",
        variant: "destructive",
      });
      return;
    }
    setQrOpen(true);
    if (receiptCfg.enableDualScreen) {
      publishDisplay({
        type: "qr",
        items: cart.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        total,
        currencySymbol: sys.currency_symbol || "$",
        businessName: receiptCfg.businessName,
        qrPayload,
        merchantNumber: receiptCfg.merchantNumber,
        orderId,
      });
    }
  };


  const isMobileMethod = MOBILE_METHODS.includes(payment);
  const isFullDue = payment === "Due";
  const showSplitToggle = isMobileMethod && !isFullDue;
  const parsedDue = Math.max(0, Math.min(total, parseFloat(dueAmount) || 0));
  const effectiveDue = isFullDue ? total : showSplitToggle && splitDue ? parsedDue : 0;
  const effectivePaid = total - effectiveDue;
  // Customer is OPTIONAL for due (walk-in customers allowed). Only required if cashier wants to track named credit.
  const requiresCustomer = false;

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const rewardAvailable = (selectedCustomer?.reward_status as any) || "none";

  const handleCreateCustomer = async () => {
    if (!newName.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    try {
      const c = await createCustomer({
        name: newName,
        phone: newPhone,
        address: newAddress,
      });
      setCustomers((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedCustomerId(c.id);
      setCustomerName(c.name);
      setNewCustomerOpen(false);
      setNewName("");
      setNewPhone("");
      setNewAddress("");
      toast({ title: "Customer added", description: c.name });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      toast({ title: "Cart is empty", description: "Add items before placing an order." });
      return;
    }
    if (requiresCustomer && !selectedCustomerId) {
      toast({
        title: "Customer required",
        description: "Select or create a customer for the due amount.",
        variant: "destructive",
      });
      return;
    }
    if (showSplitToggle && splitDue && (parsedDue <= 0 || parsedDue >= total)) {
      toast({
        title: "Invalid split",
        description: "Due amount must be greater than 0 and less than the total.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payments: { method: PaymentMethod; amount: number }[] = [];
      if (effectivePaid > 0) {
        const paidMethod: PaymentMethod = isFullDue ? "Cash" : payment;
        payments.push({ method: paidMethod, amount: +effectivePaid.toFixed(2) });
      }
      if (effectiveDue > 0) {
        payments.push({ method: "Due", amount: +effectiveDue.toFixed(2) });
      }
      const summaryMethod: PaymentMethod =
        payments.length > 1 ? "Split" : payments[0].method;

      const created = await createInvoice({
        table_label: table,
        customer_id: selectedCustomerId || null,
        customer_name: selectedCustomer?.name || customerName || null,
        items: cart.map((i) => ({
          product_id: i.id,
          name: i.name,
          price: i.price,
          qty: i.qty,
        })),
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        total,
        payment_method: summaryMethod,
        payments,
      });

      const order: Order = {
        id: created.id,
        number: created.number,
        items: cart,
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        taxRate: sys.tax_enabled ? sys.tax_rate : 0,
        taxInclusive: sys.tax_inclusive,
        currencySymbol: sys.currency_symbol,
        total,
        table,
        customer: selectedCustomer?.name || customerName || undefined,
        paymentMethod: summaryMethod === "Split" ? "Split" : summaryMethod,
        paidAmount: effectivePaid,
        dueAmount: effectiveDue,
        createdAt: new Date().toISOString(),
        status: "completed",
        orderStatus: (created.order_status as any) || (effectiveDue > 0 ? "Unpaid" : "Pending"),
        rewardApplied: appliedReward,
      };
      addOrder(order);
      setCompletedOrder(order);
      setQrOpen(false);

      // Push PAID screen to customer display
      if (receiptCfg.enableDualScreen && effectiveDue <= 0) {
        publishDisplay({
          type: "paid",
          items: cart.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          total,
          currencySymbol: sys.currency_symbol || "$",
          businessName: receiptCfg.businessName,
          paidMethod: order.paymentMethod,
        });
        // Return display to idle after a few seconds
        setTimeout(() => {
          publishDisplay({
            type: "idle",
            items: [],
            subtotal: 0,
            discount: 0,
            tax: 0,
            total: 0,
            currencySymbol: sys.currency_symbol || "$",
            businessName: receiptCfg.businessName,
          });
        }, 5000);
      }

      // Loyalty: add spend & consume reward (only when fully paid now).
      if (selectedCustomerId && effectivePaid > 0) {
        try {
          await addCustomerSpend(selectedCustomerId, effectivePaid);
        } catch {}
      }
      if (selectedCustomerId && appliedReward !== "none") {
        try {
          await consumeReward(selectedCustomerId);
        } catch {}
      }

      if (effectiveDue > 0 || selectedCustomerId) {
        listCustomers().then(setCustomers).catch(() => {});
      }

      // Auto-clear cart and start a new active order
      resetActiveOrder();
      toast({
        title: "Order placed!",
        description: `Order #${created.number} · ${formatMoney(total, sys)}`,
      });
    } catch (e: any) {
      toast({
        title: "Failed to place order",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Active Order Header */}
      <Card className="rounded-2xl border-border p-3 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Active Order
            </span>
            <span className="font-mono font-bold text-sm">{orderId}</span>
          </div>
          <Badge variant="outline" className={cn("border", statusStyles[orderStatus])}>
            {orderStatus}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {cart.length} item{cart.length !== 1 ? "s" : ""} · {formatMoney(total, sys)}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {receiptCfg.enableDualScreen && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openCustomerDisplay()}
              className="rounded-lg"
              title="Open customer-facing display in a new window"
            >
              <Monitor className="h-4 w-4 mr-1.5" /> Customer Display
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleHoldOrder}
            className="rounded-lg"
          >
            <PauseCircle className="h-4 w-4 mr-1.5" /> Hold
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHeldOpen(true)}
            className="rounded-lg relative"
          >
            <PlayCircle className="h-4 w-4 mr-1.5" /> Held
            {heldOrders.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {heldOrders.length}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewOrder}
            className="rounded-lg"
          >
            <FilePlus className="h-4 w-4 mr-1.5" /> New
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_400px] gap-4 h-[calc(100vh-12rem)] min-h-[560px]">
        {/* Categories */}
        <Card className="rounded-2xl p-3 border-border overflow-y-auto lg:flex flex-col gap-2 hidden">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1">
            Categories
          </div>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all text-left",
                activeCat === c.id
                  ? "bg-gradient-button text-white shadow-soft"
                  : "hover:bg-secondary text-foreground"
              )}
            >
              <span className="text-xl">{c.emoji}</span>
              {c.name}
            </button>
          ))}
        </Card>

        {/* Mobile category chips */}
        <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all",
                activeCat === c.id
                  ? "bg-gradient-button text-white shadow-soft"
                  : "bg-card border border-border"
              )}
            >
              <span>{c.emoji}</span>
              {c.name}
            </button>
          ))}
        </div>

        {/* Products / Due Orders */}
        <div className="flex flex-col gap-3 min-h-0">
          {/* Quick-tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLeftMode("menu")}
              className={cn(
                "flex-1 sm:flex-none px-4 h-10 rounded-xl text-sm font-semibold transition-all inline-flex items-center justify-center gap-1.5",
                leftMode === "menu"
                  ? "bg-gradient-button text-white shadow-soft"
                  : "bg-secondary hover:bg-secondary/80 text-foreground"
              )}
            >
              <ShoppingCart className="h-4 w-4" /> Active Order
            </button>
            <button
              onClick={() => setLeftMode("due")}
              className={cn(
                "flex-1 sm:flex-none px-4 h-10 rounded-xl text-sm font-semibold transition-all inline-flex items-center justify-center gap-1.5 relative",
                leftMode === "due"
                  ? "bg-gradient-button text-white shadow-soft"
                  : "bg-secondary hover:bg-secondary/80 text-foreground"
              )}
            >
              <Receipt className="h-4 w-4" /> Due Orders
              {unpaid.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {unpaid.length}
                </span>
              )}
            </button>
            {leftMode === "due" && (
              <Button
                size="icon"
                variant="outline"
                onClick={refreshUnpaid}
                disabled={unpaidLoading}
                className="rounded-xl h-10 w-10 ml-auto"
                title="Refresh"
              >
                <RefreshCw className={cn("h-4 w-4", unpaidLoading && "animate-spin")} />
              </Button>
            )}
          </div>

          {leftMode === "menu" ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products…"
                  className="pl-10 h-12 rounded-xl"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex-1 overflow-y-auto pr-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filtered.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addItem(p.id)}
                      className="group rounded-2xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-elegant hover:border-primary/40 active:animate-press"
                    >
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-20 object-cover rounded-lg mb-2" />
                      ) : (
                        <div className="text-4xl mb-2">{p.emoji}</div>
                      )}
                      <div className="font-semibold text-sm leading-tight line-clamp-2">{p.name}</div>
                      <div className="mt-2 font-bold text-primary">{formatMoney(p.price, sys)}</div>
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <div className="col-span-full text-center py-16 text-muted-foreground">
                      No items match your search.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <Card className="flex-1 rounded-2xl border-border overflow-hidden flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="font-semibold text-sm flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-rose-500" /> Unpaid / Due Orders
                </div>
                <span className="text-xs text-muted-foreground">
                  {unpaid.length} order{unpaid.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {unpaid.length === 0 && !unpaidLoading && (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-12">
                    <Receipt className="h-10 w-10 opacity-30 mb-2" />
                    <div className="text-sm">No unpaid orders 🎉</div>
                  </div>
                )}
                {unpaid.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setPayOrder(u);
                      setPayMethodInline("EVC-Plus");
                    }}
                    className="w-full text-left rounded-xl border border-border bg-card hover:border-rose-500/40 hover:shadow-soft transition-all p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm">#{u.number}</span>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 border border-rose-500/30">
                            UNPAID
                          </span>
                          {u.table_label && (
                            <span className="text-xs text-muted-foreground">{u.table_label}</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {u.customer_name || "Walk-in"} · {new Date(u.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold tabular-nums">
                          {formatMoney(Number(u.due_amount || u.total), sys)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">due</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Cart */}
        <Card className={cn(
          "rounded-2xl border-2 flex flex-col overflow-hidden transition-colors min-h-0",
          orderStatus === "Active" ? "border-primary/40" : "border-border"
        )}>
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <ShoppingCart className="h-4 w-4" />
              <span>Order</span>
              <span className="text-xs font-mono text-muted-foreground">{orderId}</span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={handleClearCart}
                className="text-xs text-muted-foreground hover:text-destructive font-medium"
              >
                Clear
              </button>
            )}
          </div>

          {/* Table */}
          <div className="p-4 border-b border-border space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Users className="h-3 w-3" /> Table
              </label>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {tables.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTable(t)}
                    className={cn(
                      "h-9 min-w-[3rem] px-3 rounded-lg text-xs font-bold transition-all",
                      table === t
                        ? "bg-gradient-button text-white shadow-soft"
                        : "bg-secondary hover:bg-secondary/80"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Items - scrollable */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-10">
                <ShoppingCart className="h-10 w-10 opacity-30 mb-2" />
                <div className="text-sm">Cart is empty</div>
                <div className="text-xs">Tap a product to add it</div>
              </div>
            ) : (
              cart.map((it) => (
                <div key={it.id} className="bg-secondary/50 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{it.name}</div>
                      <div className="text-xs text-muted-foreground">{formatMoney(it.price, sys)}</div>
                    </div>
                    <button
                      onClick={() => removeItem(it.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1 bg-card rounded-lg border border-border">
                      <button
                        onClick={() => updateQty(it.id, -1)}
                        className="h-8 w-8 flex items-center justify-center hover:text-primary"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-7 text-center text-sm font-bold">{it.qty}</span>
                      <button
                        onClick={() => updateQty(it.id, 1)}
                        className="h-8 w-8 flex items-center justify-center hover:text-primary"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="font-bold text-sm">{formatMoney(it.price * it.qty, sys)}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Payment - fixed bottom of cart. Bounded so the cart-items area always remains scrollable. */}
          <div className="border-t border-border bg-card shrink-0 basis-auto max-h-[55%] overflow-y-auto p-4 space-y-3">
            {/* Quick customer picker (for loyalty + due tracking) */}
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Users className="h-3 w-3" /> Customer (optional)
              </div>
              <div className="flex gap-2">
                <Select
                  value={selectedCustomerId || "__walkin__"}
                  onValueChange={(v) => setSelectedCustomerId(v === "__walkin__" ? "" : v)}
                >
                  <SelectTrigger className="flex-1 rounded-lg h-9">
                    <SelectValue placeholder="Walk-in customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__walkin__">Walk-in customer</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.reward_status && c.reward_status !== "none" ? "  🎁" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setNewCustomerOpen(true)}
                  className="rounded-lg h-9 w-9 shrink-0"
                  title="Add customer"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Payment Method
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {ALL_PAYMENT_METHODS.map((m) => (
                  <PayBtn
                    key={m}
                    active={payment === m}
                    onClick={() => {
                      setPayment(m);
                      if (m === "Due") {
                        setSplitDue(false);
                        setDueAmount("");
                      }
                      if (!MOBILE_METHODS.includes(m) && m !== "Due") {
                        setSplitDue(false);
                        setDueAmount("");
                      }
                    }}
                    icon={methodIcon(m)}
                    label={m}
                  />
                ))}
              </div>
            </div>

            {showSplitToggle && (
              <div className="rounded-xl border border-border p-3 space-y-2 bg-secondary/30">
                <label className="flex items-center justify-between text-sm font-medium cursor-pointer">
                  <span>Split with Due</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={splitDue}
                    onChange={(e) => setSplitDue(e.target.checked)}
                  />
                </label>
                {splitDue && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Amount on credit (Due)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={total}
                      step="0.01"
                      placeholder="0.00"
                      value={dueAmount}
                      onChange={(e) => setDueAmount(e.target.value)}
                      className="rounded-lg h-9 text-sm"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Paid via {payment}: <b>${effectivePaid.toFixed(2)}</b></span>
                      <span>On Due: <b>${effectiveDue.toFixed(2)}</b></span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {effectiveDue > 0 && (
              <>
              <div className="rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-2 text-[11px] font-medium">
                Walk-in customer is OK. Optionally select a customer to track this credit by name.
              </div>
              <div className="rounded-xl border border-border p-3 space-y-2 bg-secondary/30">
                <Label className="text-xs text-muted-foreground">Customer (for credit)</Label>
                <div className="flex gap-2">
                  <Select
                    value={selectedCustomerId}
                    onValueChange={(v) => setSelectedCustomerId(v)}
                  >
                    <SelectTrigger className="flex-1 rounded-lg h-9">
                      <SelectValue placeholder="Select customer…" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          No customers yet
                        </div>
                      )}
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {c.due_balance > 0 ? ` · $${c.due_balance.toFixed(2)} due` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setNewCustomerOpen(true)}
                    className="rounded-lg h-9 w-9 shrink-0"
                    title="Add customer"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
                {selectedCustomer && selectedCustomer.due_balance >= HIGH_DEBT_THRESHOLD && (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 p-2 text-xs">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>
                      High outstanding debt: <b>${selectedCustomer.due_balance.toFixed(2)}</b>
                    </span>
                  </div>
                )}
                {selectedCustomer && selectedCustomer.due_balance > 0 && selectedCustomer.due_balance < HIGH_DEBT_THRESHOLD && (
                  <div className="text-xs text-muted-foreground">
                    Existing balance: <b>${selectedCustomer.due_balance.toFixed(2)}</b>
                  </div>
                )}
              </div>
              </>
            )}

            {/* Customer Loyalty (when a customer is selected) */}
            {selectedCustomer && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-500">
                    <Sparkles className="h-3.5 w-3.5" /> Loyalty
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {selectedCustomer.loyalty_points || 0} pts
                  </span>
                </div>
                <div className="text-sm">
                  <div className="font-semibold truncate">{selectedCustomer.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Total spent: <b>{formatMoney(Number(selectedCustomer.total_spent || 0), sys)}</b>
                  </div>
                </div>
                {rewardAvailable !== "none" ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs">
                      <div className="font-semibold text-emerald-500">
                        Reward unlocked: {rewardLabel(rewardAvailable)}
                      </div>
                    </div>
                    {appliedReward === "none" ? (
                      <Button
                        size="sm"
                        onClick={() => setAppliedReward(rewardAvailable as any)}
                        className="rounded-lg bg-gradient-button text-white h-8"
                      >
                        <Gift className="h-3.5 w-3.5 mr-1" /> Apply Reward
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAppliedReward("none")}
                        className="rounded-lg h-8"
                      >
                        Remove Reward
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground">
                    No reward yet. $100 = 50% off · $200 = Free Lunch.
                  </div>
                )}
              </div>
            )}

            {/* Discount controls */}
            {canDiscount && (
              <div className="rounded-xl border border-border p-3 space-y-2 bg-secondary/30">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Percent className="h-3.5 w-3.5" /> Discount
                  </div>
                  {discountType !== "none" && (
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountType("none");
                        setDiscountValue("");
                      }}
                      className="text-[11px] text-muted-foreground hover:text-destructive font-medium"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["none", "percent", "fixed"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setDiscountType(t)}
                      disabled={appliedReward !== "none"}
                      className={cn(
                        "h-9 rounded-lg text-xs font-semibold transition-all border",
                        discountType === t
                          ? "bg-gradient-button text-white border-transparent shadow-soft"
                          : "bg-card border-border hover:border-primary/40",
                        appliedReward !== "none" && "opacity-40 cursor-not-allowed"
                      )}
                    >
                      {t === "none" ? "None" : t === "percent" ? "Percent (%)" : "Fixed"}
                    </button>
                  ))}
                </div>
                {discountType !== "none" && (
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={discountType === "percent" ? 100 : totals.subtotal}
                    step="0.01"
                    placeholder={discountType === "percent" ? "0–100" : "0.00"}
                    value={discountValue}
                    onChange={(e) =>
                      setDiscountValue(e.target.value.replace(/^-/, ""))
                    }
                    className="rounded-lg h-9 text-sm"
                    disabled={appliedReward !== "none"}
                  />
                )}
                {appliedReward !== "none" && (
                  <div className="text-[11px] text-emerald-500">
                    Reward active — manual discount disabled.
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatMoney(totals.subtotal, sys)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-sm text-emerald-500">
                <span className="flex items-center gap-1">
                  <Percent className="h-3 w-3" /> Discount
                  {appliedReward !== "none" && (
                    <span className="text-[10px] uppercase font-bold">· Reward</span>
                  )}
                </span>
                <span className="font-semibold">− {formatMoney(totals.discount, sys)}</span>
              </div>
            )}
            {sys.tax_enabled && totals.tax > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  Tax {sys.tax_inclusive ? "(incl.)" : ""} {sys.tax_rate}%
                </span>
                <span>{formatMoney(totals.tax, sys)}</span>
              </div>
            )}
            {effectiveDue > 0 && (
              <div className="flex justify-between text-sm text-amber-600">
                <span>On Credit (Due)</span>
                <span className="font-semibold">{formatMoney(effectiveDue, sys)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
              <span>Total</span>
              <span>{formatMoney(total, sys)}</span>
            </div>

            <Button
              onClick={placeOrder}
              disabled={cart.length === 0 || submitting}
              className="w-full h-12 rounded-xl bg-gradient-button text-white font-semibold shadow-soft hover:shadow-elegant hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {submitting ? "Processing…" : "Place Order"}
            </Button>
          </div>
        </Card>
      </div>

      {completedOrder && (
        <ReceiptPreview
          order={completedOrder}
          autoPrint
          onClose={() => setCompletedOrder(null)}
        />
      )}

      {/* Held Orders dialog */}
      <Dialog open={heldOpen} onOpenChange={setHeldOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Held Orders</DialogTitle>
            <DialogDescription>
              Resume a saved order. Resuming will load it as the active order.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {heldOrders.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                No held orders.
              </div>
            ) : (
              heldOrders.map((h) => {
                const sub = h.items.reduce((s, i) => s + i.price * i.qty, 0);
                return (
                  <div
                    key={h.id}
                    className="rounded-xl border border-border p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm">{h.shortId}</span>
                        <Badge variant="outline" className={cn("border", statusStyles.Held)}>
                          Held
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {h.table} · {h.items.length} items
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ${sub.toFixed(2)} · {new Date(h.heldAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" onClick={() => requestResume(h)} className="rounded-lg">
                        Resume
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => deleteHeld(h)}
                        className="rounded-lg h-8 w-8"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* New customer dialog */}
      <Dialog open={newCustomerOpen} onOpenChange={setNewCustomerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add new customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Address (optional)</Label>
              <Input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCustomerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCustomer} className="bg-gradient-button text-white">
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm clear cart */}
      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear current order?</AlertDialogTitle>
            <AlertDialogDescription>
              All items in <span className="font-mono font-semibold">{orderId}</span> will be
              removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetActiveOrder();
                toast({ title: "Cart cleared" });
              }}
            >
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm new order (cart not empty) */}
      <AlertDialog open={confirmNew} onOpenChange={setConfirmNew}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start a new order?</AlertDialogTitle>
            <AlertDialogDescription>
              The current order has unsaved items. You can hold it to resume later, or discard it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmNew(false);
                handleHoldOrder();
              }}
            >
              Hold & New
            </Button>
            <AlertDialogAction
              onClick={() => {
                resetActiveOrder();
                toast({ title: "New order started" });
              }}
            >
              Discard & New
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm resume (cart not empty) */}
      <AlertDialog
        open={!!pendingResume}
        onOpenChange={(o) => !o && setPendingResume(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch to held order?</AlertDialogTitle>
            <AlertDialogDescription>
              Your current order has items. Hold it first to avoid losing data, or discard and
              resume <span className="font-mono font-semibold">{pendingResume?.shortId}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                const target = pendingResume;
                if (!target) return;
                // Hold current, then resume
                const held: HeldOrder = {
                  id: crypto.randomUUID(),
                  shortId: orderId,
                  items: cart,
                  table,
                  customerName: customerName || undefined,
                  heldAt: new Date().toISOString(),
                };
                addHeldOrder(held);
                doResume(target);
              }}
            >
              Hold & Resume
            </Button>
            <AlertDialogAction
              onClick={() => pendingResume && doResume(pendingResume)}
            >
              Discard & Resume
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Inline Pay-Now dialog (Due Orders tab) */}
      <Dialog open={!!payOrder} onOpenChange={(o) => !o && setPayOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pay Now · Order #{payOrder?.number}</DialogTitle>
            <DialogDescription>
              Settle the unpaid balance without leaving POS.
            </DialogDescription>
          </DialogHeader>
          {payOrder && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-secondary">
                <div>
                  <div className="text-xs text-muted-foreground">Amount due</div>
                  <div className="text-2xl font-bold tabular-nums">
                    ${Number(payOrder.due_amount || payOrder.total).toFixed(2)}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {payOrder.customer_name || "Walk-in"} · {payOrder.table_label || "—"}
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full bg-rose-500/15 text-rose-600">
                  UNPAID
                </span>
              </div>
              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["EVC-Plus", "Premier Wallet", "E-Dahab", "Cash", "Card"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayMethodInline(m)}
                      className={cn(
                        "h-11 rounded-xl border text-sm font-semibold transition-all",
                        payMethodInline === m
                          ? "bg-gradient-button text-white border-transparent shadow-soft"
                          : "bg-card border-border hover:border-primary/40"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setPayOrder(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={inlinePayNow}
              disabled={payingInline}
              className="rounded-xl bg-gradient-button text-white"
            >
              {payingInline ? "Processing…" : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const methodIcon = (m: PaymentMethod) => {
  if (m === "Cash") return <Banknote className="h-4 w-4" />;
  if (m === "Card") return <CreditCard className="h-4 w-4" />;
  if (m === "Due") return <Wallet className="h-4 w-4" />;
  return <span className="text-[10px] font-bold">{m === "EVC-Plus" ? "EVC" : m === "Premier Wallet" ? "PRM" : "EDH"}</span>;
};

const PayBtn = ({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-semibold transition-all min-h-[60px] justify-center text-center px-1",
      active
        ? "bg-gradient-button text-white shadow-soft"
        : "bg-secondary hover:bg-secondary/80 text-foreground"
    )}
  >
    <span className="h-5 flex items-center justify-center">{icon}</span>
    <span className="leading-tight">{label}</span>
  </button>
);

export default POS;
