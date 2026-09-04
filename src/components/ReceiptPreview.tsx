import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, X, ChefHat, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Order } from "@/lib/orders";
import { loadReceiptSettings } from "@/lib/receiptSettings";

type Props = {
  order: Order;
  onClose: () => void;
  autoPrint?: boolean;
};

type View = "customer" | "kitchen";

/* ------------------------------------------------------------------
   Print job registry — one automatic print job per sale transaction.
   Persisted in sessionStorage so a refresh / re-render never reprints.
------------------------------------------------------------------- */
const AUTO_JOBS_KEY = "nidam_auto_print_jobs_v1";

const autoJobDone = (jobId: string): boolean => {
  try {
    const raw = sessionStorage.getItem(AUTO_JOBS_KEY);
    return raw ? (JSON.parse(raw) as string[]).includes(jobId) : false;
  } catch {
    return false;
  }
};

const markAutoJob = (jobId: string) => {
  try {
    const raw = sessionStorage.getItem(AUTO_JOBS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(jobId)) list.push(jobId);
    // keep the registry small
    sessionStorage.setItem(AUTO_JOBS_KEY, JSON.stringify(list.slice(-200)));
  } catch {
    /* ignore */
  }
};

/** Single dedicated top-level print node (outside every fixed overlay). */
const getPrintRoot = (): HTMLElement => {
  let el = document.getElementById("print-root");
  if (!el) {
    el = document.createElement("div");
    el.id = "print-root";
    document.body.appendChild(el);
  }
  return el;
};

export const ReceiptPreview = ({ order, onClose, autoPrint }: Props) => {
  const settings = loadReceiptSettings();
  const shouldAutoPrint = autoPrint ?? settings.autoPrint;

  const isPrintingRef = useRef(false);
  const autoRanRef = useRef(false);
  const printRoot = useMemo(() => getPrintRoot(), []);

  const [view, setView] = useState<View>("customer");
  const [printView, setPrintView] = useState<View>("customer");
  const [printedCustomer, setPrintedCustomer] = useState(false);
  const [printedKitchen, setPrintedKitchen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const date = new Date(order.createdAt);
  const due = order.dueAmount ?? 0;
  const paid = order.paidAmount ?? order.total;
  const status = due > 0 ? "UNPAID" : "PAID";
  const widthClass = settings.paperSize === "58mm" ? "max-w-[58mm]" : "max-w-[80mm]";

  /** Fires exactly one window.print() per call; concurrent calls are dropped. */
  const runPrint = (which: View): Promise<void> =>
    new Promise((resolve) => {
      if (isPrintingRef.current) return resolve();
      isPrintingRef.current = true;
      setIsPrinting(true);
      setPrintView(which);

      // Let React commit the print-portal content before printing.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            window.print();
          } catch {
            /* ignore */
          }
          if (which === "customer") setPrintedCustomer(true);
          else setPrintedKitchen(true);
          isPrintingRef.current = false;
          setIsPrinting(false);
          resolve();
        });
      });
    });

  const handleManualPrint = async () => {
    await runPrint(view);
  };

  const reprintAll = async () => {
    await runPrint("customer");
    if (settings.enableKitchenPrint) await runPrint("kitchen");
  };

  // Auto-print: exactly ONE job per sale transaction (order id), ever.
  useEffect(() => {
    if (!shouldAutoPrint) return;
    if (autoRanRef.current) return;
    const jobId = `auto:${order.id}`;
    if (autoJobDone(jobId)) return;
    autoRanRef.current = true;
    markAutoJob(jobId);
    runPrint("customer");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);


  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 print:bg-transparent print:backdrop-blur-none print:p-0 print:items-start">
      <div className="bg-card rounded-2xl shadow-elegant max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col print:shadow-none print:rounded-none print:max-h-none print:max-w-none print:bg-white">
        {/* Header (hidden on print) */}
        <div className="flex items-center justify-between p-4 border-b border-border print:hidden">
          <div className="font-semibold flex items-center gap-2">
            Receipt Preview
            <span className="text-xs text-muted-foreground">({settings.paperSize})</span>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full hover:bg-secondary flex items-center justify-center"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* View tabs (only when kitchen is enabled) */}
        {settings.enableKitchenPrint && (
          <div className="flex gap-1 p-2 border-b border-border print:hidden">
            <button
              onClick={() => setView("customer")}
              className={`flex-1 h-9 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                view === "customer"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              <Printer className="h-3.5 w-3.5" />
              Customer {printedCustomer && "✓"}
            </button>
            <button
              onClick={() => setView("kitchen")}
              className={`flex-1 h-9 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                view === "kitchen"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              <ChefHat className="h-3.5 w-3.5" />
              Kitchen {printedKitchen && "✓"}
            </button>
          </div>
        )}

        <div className="overflow-y-auto print:overflow-visible">
          {view === "customer" ? (
            <CustomerReceipt
              order={order}
              settings={settings}
              widthClass={widthClass}
              date={date}
              paid={paid}
              due={due}
              status={status}
            />
          ) : (
            <KitchenReceipt
              order={order}
              settings={settings}
              widthClass={widthClass}
              date={date}
            />
          )}
        </div>

        {/* Footer actions (hidden on print) */}
        <div className="p-4 border-t border-border flex flex-wrap gap-2 print:hidden">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl min-w-[100px]">
            Close
          </Button>
          {settings.enableKitchenPrint && (printedCustomer || printedKitchen) && (
            <Button
              variant="outline"
              onClick={reprintAll}
              disabled={isPrinting}
              className="rounded-xl"
              title="Reprint customer + kitchen"
            >
              <RotateCcw className="h-4 w-4 mr-1.5" /> Reprint all
            </Button>
          )}
          <Button
            onClick={handleManualPrint}
            disabled={isPrinting}
            className="flex-1 rounded-xl bg-gradient-button text-white shadow-soft min-w-[140px]"
          >
            <Printer className="h-4 w-4 mr-2" />
            {isPrinting
              ? "Printing…"
              : (view === "customer" ? printedCustomer : printedKitchen)
              ? "Reprint"
              : "Print"}
          </Button>
        </div>
      </div>
    </div>
  );
};

/* -------- Customer receipt (full info) -------- */
const CustomerReceipt = ({
  order,
  settings,
  widthClass,
  date,
  paid,
  due,
  status,
}: {
  order: Order;
  settings: ReturnType<typeof loadReceiptSettings>;
  widthClass: string;
  date: Date;
  paid: number;
  due: number;
  status: "PAID" | "UNPAID";
}) => (
  <div
    id="receipt"
    className={`receipt mx-auto p-4 font-mono text-[12px] leading-snug text-black bg-white w-full ${widthClass}`}
  >
    <div className="text-center">
      {settings.showLogo && settings.logoUrl ? (
        <img src={settings.logoUrl} alt="logo" className="mx-auto mb-1 max-h-12 object-contain" />
      ) : null}
      <div className="text-base font-bold tracking-wider">{settings.businessName}</div>
      {settings.showAddress && settings.address && (
        <div className="text-[10px]">{settings.address}</div>
      )}
      {settings.showPhone && settings.phone && (
        <div className="text-[10px]">Tel: {settings.phone}</div>
      )}
    </div>

    <div className="my-2 border-t border-dashed border-black" />

    <div className="flex justify-between text-[11px]">
      <span>Order #</span>
      <span className="font-bold">{order.number}</span>
    </div>
    <div className="flex justify-between text-[11px]">
      <span>Date</span>
      <span>{date.toLocaleDateString()}</span>
    </div>
    <div className="flex justify-between text-[11px]">
      <span>Time</span>
      <span>{date.toLocaleTimeString()}</span>
    </div>
    <div className="flex justify-between text-[11px]">
      <span>Table</span>
      <span>{order.table}</span>
    </div>
    {order.customer && (
      <div className="flex justify-between text-[11px]">
        <span>Customer</span>
        <span>{order.customer}</span>
      </div>
    )}

    {settings.showItems && (
      <>
        <div className="my-2 border-t border-dashed border-black" />
        <div className="flex text-[10px] font-bold uppercase">
          <div className="flex-1">Item</div>
          <div className="w-7 text-center">Qty</div>
          <div className="w-14 text-right">Price</div>
        </div>
        <div className="my-1 border-t border-dashed border-black" />
        {order.items.map((it) => {
          const sym = order.currencySymbol || "$";
          const fmt = (n: number) =>
            sym === "$" ? `${sym}${n.toFixed(2)}` : `${sym}${Math.round(n).toLocaleString()}`;
          return (
            <div key={it.id} className="mb-1">
              <div className="flex">
                <div className="flex-1 truncate">{it.name}</div>
                <div className="w-7 text-center">{it.qty}</div>
                <div className="w-14 text-right">{fmt(it.price * it.qty)}</div>
              </div>
              <div className="text-[9px] opacity-70">  @ {fmt(it.price)}</div>
            </div>
          );
        })}
      </>
    )}

    <div className="my-2 border-t border-dashed border-black" />

    {(() => {
      const sym = order.currencySymbol || "$";
      const fmt = (n: number) =>
        sym === "$" ? `${sym}${n.toFixed(2)}` : `${sym}${Math.round(n).toLocaleString()}`;
      const sub = order.subtotal ?? order.total;
      const disc = order.discount ?? 0;
      const tax = order.tax ?? 0;
      return (
        <>
          <div className="flex justify-between text-[11px]">
            <span>Subtotal</span>
            <span>{fmt(sub)}</span>
          </div>
          {disc > 0 && (
            <div className="flex justify-between text-[11px] font-bold">
              <span>Discount Applied</span>
              <span>− {fmt(disc)}</span>
            </div>
          )}
          {tax > 0 && (
            <div className="flex justify-between text-[11px]">
              <span>Tax{order.taxRate ? ` (${order.taxRate}%${order.taxInclusive ? " incl" : ""})` : ""}</span>
              <span>{fmt(tax)}</span>
            </div>
          )}
          {settings.showTotal && (
            <div className="flex justify-between text-base font-bold mt-1">
              <span>TOTAL</span>
              <span>{fmt(order.total)}</span>
            </div>
          )}

          {settings.showPaymentMethod && (
            <>
              <div className="flex justify-between text-[11px] mt-1">
                <span>Payment</span>
                <span className="font-semibold">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Paid</span>
                <span className="font-semibold">{fmt(paid)}</span>
              </div>
              {due > 0 && (
                <div className="flex justify-between text-[11px]">
                  <span>Due</span>
                  <span className="font-semibold">{fmt(due)}</span>
                </div>
              )}
            </>
          )}

          {order.rewardApplied && order.rewardApplied !== "none" && (
            <div className="text-center text-[10px] mt-1 font-bold">
              🎁 Loyalty Reward: {order.rewardApplied === "free_lunch" ? "FREE LUNCH" : "50% OFF"}
            </div>
          )}
        </>
      );
    })()}

    <div className="my-2 border-t border-dashed border-black" />

    <div className="text-center">
      <div className="inline-block px-3 py-0.5 text-[11px] font-bold tracking-wider border-2 border-black">
        {status}
      </div>
    </div>

    {settings.showFooter && (
      <div className="text-center text-[11px] mt-2">
        <div className="font-bold">{settings.footerMessage}</div>
        {settings.showPoweredBy && (
          <div className="text-[9px] mt-2 opacity-70">Powered by Blue Flag</div>
        )}
      </div>
    )}
  </div>
);

/* -------- Kitchen ticket (NO prices, NO payment) -------- */
const KitchenReceipt = ({
  order,
  settings,
  widthClass,
  date,
}: {
  order: Order;
  settings: ReturnType<typeof loadReceiptSettings>;
  widthClass: string;
  date: Date;
}) => (
  <div
    id="receipt"
    className={`receipt mx-auto p-4 font-mono text-black bg-white w-full ${widthClass}`}
  >
    <div className="text-center">
      <div className="inline-flex items-center justify-center gap-1 text-base font-extrabold tracking-wider border-2 border-black px-3 py-1">
        KITCHEN ORDER
      </div>
      <div className="text-[11px] mt-1">{settings.businessName}</div>
    </div>

    <div className="my-2 border-t border-dashed border-black" />

    <div className="flex justify-between text-[13px] font-bold">
      <span>Order #</span>
      <span>{order.number}</span>
    </div>
    <div className="flex justify-between text-[12px]">
      <span>Table</span>
      <span className="font-bold">{order.table}</span>
    </div>
    <div className="flex justify-between text-[11px]">
      <span>Time</span>
      <span>{date.toLocaleTimeString()}</span>
    </div>
    {order.customer && (
      <div className="flex justify-between text-[11px]">
        <span>Customer</span>
        <span>{order.customer}</span>
      </div>
    )}

    <div className="my-2 border-t border-dashed border-black" />

    <div className="flex text-[11px] font-bold uppercase">
      <div className="w-10 text-left">Qty</div>
      <div className="flex-1">Item</div>
    </div>
    <div className="my-1 border-t border-dashed border-black" />

    {order.items.map((it) => (
      <div key={it.id} className="flex items-start py-1 border-b border-dashed border-black/30">
        <div className="w-10 text-left text-[18px] font-extrabold leading-none">{it.qty}×</div>
        <div className="flex-1 text-[14px] font-bold leading-tight">{it.name}</div>
      </div>
    ))}

    {order.notes && (
      <>
        <div className="my-2 border-t border-dashed border-black" />
        <div className="text-[11px] font-bold uppercase">Notes</div>
        <div className="text-[12px]">{order.notes}</div>
      </>
    )}

    <div className="my-2 border-t border-dashed border-black" />

    <div className="text-center text-[10px] opacity-70">
      *** END OF KITCHEN TICKET ***
    </div>
  </div>
);
