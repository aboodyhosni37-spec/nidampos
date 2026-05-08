import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, ShoppingBag } from "lucide-react";
import { subscribeDisplay, type DisplayState } from "@/lib/customerDisplay";

const fmt = (n: number, sym: string) => `${sym}${n.toFixed(2)}`;

const CustomerDisplay = () => {
  const [state, setState] = useState<DisplayState | null>(null);

  useEffect(() => {
    document.title = "Customer Display";
    const unsub = subscribeDisplay(setState);
    return unsub;
  }, []);

  const sym = state?.currencySymbol || "$";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Brand bar */}
      <div className="px-8 py-4 border-b border-border bg-card flex items-center justify-between">
        <div className="text-xl font-bold tracking-wide">
          {state?.businessName || "NIDAM POS"}
        </div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Customer Display
        </div>
      </div>

      {(!state || state.type === "idle") && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
          <ShoppingBag className="h-20 w-20 text-primary/40 mb-6" />
          <div className="text-3xl font-semibold mb-2">Welcome</div>
          <div className="text-muted-foreground">Awaiting your order…</div>
        </div>
      )}

      {state?.type === "cart" && (
        <div className="flex-1 grid grid-rows-[1fr_auto] overflow-hidden">
          <div className="overflow-y-auto p-8 space-y-3">
            {state.items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                <ShoppingBag className="h-16 w-16 opacity-30 mb-4" />
                <div className="text-xl">Your order will appear here</div>
              </div>
            ) : (
              state.items.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border"
                >
                  <div className="min-w-0">
                    <div className="text-lg font-semibold truncate">{it.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {fmt(it.price, sym)} × {it.qty}
                    </div>
                  </div>
                  <div className="text-xl font-bold tabular-nums">
                    {fmt(it.price * it.qty, sym)}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-border bg-card p-8 space-y-2">
            <div className="flex justify-between text-base text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">{fmt(state.subtotal, sym)}</span>
            </div>
            {state.discount > 0 && (
              <div className="flex justify-between text-base text-emerald-500">
                <span>Discount</span>
                <span className="tabular-nums">− {fmt(state.discount, sym)}</span>
              </div>
            )}
            {state.tax > 0 && (
              <div className="flex justify-between text-base text-muted-foreground">
                <span>Tax</span>
                <span className="tabular-nums">{fmt(state.tax, sym)}</span>
              </div>
            )}
            <div className="flex justify-between text-3xl font-bold pt-3 border-t border-border">
              <span>Total</span>
              <span className="tabular-nums text-primary">{fmt(state.total, sym)}</span>
            </div>
          </div>
        </div>
      )}

      {state?.type === "qr" && (
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
          <div className="text-2xl font-semibold mb-2">Scan to Pay</div>
          <div className="text-muted-foreground mb-6">
            {state.merchantNumber ? `Merchant: ${state.merchantNumber} · ` : ""}
            Total <b className="text-foreground">{fmt(state.total, sym)}</b>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-elegant">
            <QRCodeSVG
              value={state.qrPayload || ""}
              size={420}
              level="H"
              includeMargin={false}
            />
          </div>
          <div className="mt-6 text-sm text-muted-foreground max-w-md">
            Open your mobile money app, scan this code, and confirm the payment.
          </div>
        </div>
      )}

      {state?.type === "paid" && (
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
          <CheckCircle2 className="h-32 w-32 text-emerald-500 mb-6 animate-in zoom-in duration-500" />
          <div className="text-6xl font-extrabold text-emerald-500 tracking-wider mb-3">
            PAID
          </div>
          <div className="text-3xl font-semibold mb-1">Thank You!</div>
          <div className="text-muted-foreground">
            {state.paidMethod ? `Paid via ${state.paidMethod} · ` : ""}
            {fmt(state.total, sym)}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDisplay;
