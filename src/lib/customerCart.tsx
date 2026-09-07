// Customer-website cart. Completely separate from the Staff POS cart.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CustomerCartLine, DbProduct } from "./storefront";

const KEY = "lamahamar_customer_cart_v1";

type Ctx = {
  lines: CustomerCartLine[];
  count: number;
  subtotal: number;
  add: (p: DbProduct, qty?: number) => void;
  increment: (id: string) => void;
  decrement: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<Ctx | null>(null);

const read = (): CustomerCartLine[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const CustomerCartProvider = ({ children }: { children: React.ReactNode }) => {
  const [lines, setLines] = useState<CustomerCartLine[]>(() => read());

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {}
  }, [lines]);

  const add = useCallback((p: DbProduct, qty = 1) => {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.product_id === p.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + qty };
        return next;
      }
      return [
        ...prev,
        { product_id: p.id, name: p.name, price: Number(p.price), qty },
      ];
    });
  }, []);

  const increment = useCallback((id: string) => {
    setLines((prev) =>
      prev.map((l) => (l.product_id === id ? { ...l, qty: l.qty + 1 } : l))
    );
  }, []);

  const decrement = useCallback((id: string) => {
    setLines((prev) =>
      prev
        .map((l) => (l.product_id === id ? { ...l, qty: l.qty - 1 } : l))
        .filter((l) => l.qty > 0)
    );
  }, []);

  const remove = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.product_id !== id));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<Ctx>(
    () => ({
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      subtotal: lines.reduce((s, l) => s + l.price * l.qty, 0),
      add,
      increment,
      decrement,
      remove,
      clear,
    }),
    [lines, add, increment, decrement, remove, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCustomerCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCustomerCart must be used inside CustomerCartProvider");
  return ctx;
};
