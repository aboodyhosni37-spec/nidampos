import type { OrderItem } from "./orders";

export type HeldOrder = {
  id: string;
  shortId: string;
  items: OrderItem[];
  table: string;
  customerName?: string;
  heldAt: string;
};

const KEY = "nidam_pos_held_orders";

export const loadHeldOrders = (): HeldOrder[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};

export const saveHeldOrders = (orders: HeldOrder[]) => {
  localStorage.setItem(KEY, JSON.stringify(orders));
};

export const addHeldOrder = (order: HeldOrder) => {
  const all = loadHeldOrders();
  all.unshift(order);
  saveHeldOrders(all);
};

export const removeHeldOrder = (id: string) => {
  const all = loadHeldOrders().filter((o) => o.id !== id);
  saveHeldOrders(all);
};

export const generateOrderId = () => {
  // Short, readable: ORD-XXXXX
  const r = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `ORD-${r}`;
};
