// Cross-window sync for the cashier ↔ customer display screens.
// Uses BroadcastChannel (with localStorage fallback) so that any change in
// the cashier POS instantly reflects on the customer-facing screen.

export type DisplayItem = { id: string; name: string; price: number; qty: number };

export type DisplayState = {
  type: "cart" | "qr" | "paid" | "idle";
  items: DisplayItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currencySymbol: string;
  businessName: string;
  // QR-specific
  qrPayload?: string;
  merchantNumber?: string;
  orderId?: string;
  // Paid screen
  paidMethod?: string;
  ts: number;
};

const CHANNEL = "nidam-pos-display";
const STORAGE_KEY = "nidam_pos_display_state";

let bc: BroadcastChannel | null = null;
const getBC = () => {
  if (typeof window === "undefined") return null;
  if (!bc && "BroadcastChannel" in window) {
    try {
      bc = new BroadcastChannel(CHANNEL);
    } catch {
      bc = null;
    }
  }
  return bc;
};

export const publishDisplay = (state: Omit<DisplayState, "ts">) => {
  const payload: DisplayState = { ...state, ts: Date.now() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {}
  const ch = getBC();
  if (ch) ch.postMessage(payload);
};

export const subscribeDisplay = (cb: (s: DisplayState) => void) => {
  const ch = getBC();
  const onMsg = (e: MessageEvent<DisplayState>) => cb(e.data);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try { cb(JSON.parse(e.newValue)); } catch {}
    }
  };
  ch?.addEventListener("message", onMsg);
  window.addEventListener("storage", onStorage);
  // initial state
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) cb(JSON.parse(raw));
  } catch {}
  return () => {
    ch?.removeEventListener("message", onMsg);
    window.removeEventListener("storage", onStorage);
  };
};

export const openCustomerDisplay = () => {
  const w = window.open(
    "/customer-display",
    "nidam_customer_display",
    "width=1024,height=768,menubar=no,toolbar=no,location=no"
  );
  return w;
};
