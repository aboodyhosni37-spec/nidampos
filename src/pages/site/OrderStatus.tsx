import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/systemSettings";

type TrackedOrder = { number: number; total: number; paid_amount: number; due_amount: number; order_type: string; order_status: string; created_at: string; items: { name: string; qty: number; price: number }[] };
export default function OrderStatus() {
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [token] = useState(() => {
    const fromLink = new URLSearchParams(window.location.hash.slice(1)).get("track");
    if (fromLink) { localStorage.setItem("lamahamar_last_order_tracking", fromLink); return fromLink; }
    return localStorage.getItem("lamahamar_last_order_tracking") || "";
  });
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!token) { setError("No order tracking link found."); setLoading(false); return; }
      const { data, error: failed } = await supabase.functions.invoke("customer-orders", { body: { action: "status", tracking_token: token } });
      if (!alive) return;
      if (failed) setError("Unable to find this order. Please check your tracking link or try again.");
      else { setOrder(data); setError(""); }
      setLoading(false);
    };
    load();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") load(); }, 15000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [token, retry]);
  return <div className="mx-auto max-w-2xl px-5 py-14 sm:px-8">
    <div className="mb-8 flex items-start justify-between gap-4"><div><p className="mb-2 text-sm text-muted-foreground">Your order</p><h1 className="font-serif text-4xl">{order ? `Order #${order.number}` : "Order status"}</h1></div><Button size="icon" variant="outline" aria-label="Refresh order status" onClick={() => { setLoading(true); setRetry(retry + 1); }}><RefreshCw /></Button></div>
    {loading && !order && <Loader2 className="my-12 h-6 w-6 animate-spin" />}
    {error && <p role="alert" className="my-8 text-muted-foreground">{error}</p>}
    {order && <><div className="flex items-center gap-3 border-y border-border py-6">{order.order_status === "Completed" ? <CheckCircle2 /> : <Clock />}<div><p className="font-semibold">{order.order_status === "Pending" ? "Awaiting confirmation" : order.order_status}</p><p className="mt-1 text-sm text-muted-foreground">{order.order_type === "PICKUP" ? "Pickup at the cafe" : order.order_type === "DELIVERY" ? "Delivery" : "Dine-in"} · {new Date(order.created_at).toLocaleString()}</p></div></div><ul className="divide-y divide-border">{order.items.map((item, i) => <li key={i} className="flex justify-between gap-6 py-5"><span className="min-w-0 break-words">{item.qty} × {item.name}</span><span className="shrink-0 tabular-nums">{formatMoney(item.price * item.qty)}</span></li>)}</ul><dl className="space-y-3 border-t border-border pt-6"><div className="flex justify-between font-semibold"><dt>Total</dt><dd>{formatMoney(order.total)}</dd></div><div className="flex justify-between text-sm"><dt>Amount paid</dt><dd>{formatMoney(order.paid_amount)}</dd></div><div className="flex justify-between text-sm"><dt>Amount to pay</dt><dd>{formatMoney(order.due_amount)}</dd></div></dl></>}
    <Button asChild variant="outline" className="mt-10 h-12 rounded-full px-6"><Link to="/menu">Back to the menu</Link></Button>
  </div>;
}