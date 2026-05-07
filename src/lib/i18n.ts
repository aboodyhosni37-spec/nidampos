// Lightweight i18n system. Language is stored in localStorage and broadcast
// to subscribers so the entire UI updates instantly when changed.

export type Language = "en" | "so" | "ar";

export const LANGUAGES: { code: Language; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "so", label: "Somali", native: "Soomaali" },
  { code: "ar", label: "Arabic", native: "العربية" },
];

const KEY = "nidam_language";
const listeners = new Set<(l: Language) => void>();

export const getLanguage = (): Language => {
  try {
    const v = localStorage.getItem(KEY) as Language | null;
    if (v && ["en", "so", "ar"].includes(v)) return v;
  } catch {}
  return "en";
};

export const setLanguage = (l: Language) => {
  try {
    localStorage.setItem(KEY, l);
  } catch {}
  document.documentElement.setAttribute("lang", l);
  document.documentElement.setAttribute("dir", l === "ar" ? "rtl" : "ltr");
  listeners.forEach((cb) => cb(l));
};

export const subscribeLanguage = (cb: (l: Language) => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

type Dict = Record<string, { en: string; so: string; ar: string }>;

const D: Dict = {
  // Common
  save: { en: "Save", so: "Kaydi", ar: "حفظ" },
  cancel: { en: "Cancel", so: "Jooji", ar: "إلغاء" },
  delete: { en: "Delete", so: "Tirtir", ar: "حذف" },
  yes: { en: "Yes", so: "Haa", ar: "نعم" },
  no: { en: "No", so: "Maya", ar: "لا" },
  reset: { en: "Reset", so: "Dib u deji", ar: "إعادة تعيين" },
  print: { en: "Print", so: "Daabac", ar: "طباعة" },
  close: { en: "Close", so: "Xidh", ar: "إغلاق" },

  // Nav
  dashboard: { en: "Dashboard", so: "Dashboardka", ar: "لوحة القيادة" },
  pos: { en: "POS", so: "POS", ar: "نقطة البيع" },
  orders: { en: "Orders", so: "Dalabyada", ar: "الطلبات" },
  customers: { en: "Customers", so: "Macaamiisha", ar: "العملاء" },
  inventory: { en: "Inventory", so: "Bakhaarka", ar: "المخزون" },
  reports: { en: "Reports", so: "Warbixinno", ar: "التقارير" },
  expenses: { en: "Expenses", so: "Kharashyada", ar: "المصاريف" },
  staff: { en: "Staff", so: "Shaqaalaha", ar: "الموظفون" },
  settings: { en: "Settings", so: "Dejinta", ar: "الإعدادات" },

  // POS
  placeOrder: { en: "Place Order", so: "Dir Dalabka", ar: "إرسال الطلب" },
  total: { en: "Total", so: "Wadarta", ar: "المجموع" },
  subtotal: { en: "Subtotal", so: "Wadar-hoosaad", ar: "الإجمالي الفرعي" },
  tax: { en: "Tax", so: "Cashuur", ar: "الضريبة" },
  discount: { en: "Discount", so: "Qiimo-dhimis", ar: "خصم" },
  cart: { en: "Cart", so: "Gaariga", ar: "السلة" },

  // Receipt
  paid: { en: "Paid", so: "La Bixiyay", ar: "مدفوع" },
  unpaid: { en: "Unpaid", so: "Aan La Bixin", ar: "غير مدفوع" },
  due: { en: "Due", so: "Deyn", ar: "مستحق" },
  payment: { en: "Payment", so: "Bixinta", ar: "الدفع" },
  sendMoneyTo: { en: "Send Money to", so: "U dir lacagta", ar: "أرسل الأموال إلى" },

  // Settings
  resetOrders: { en: "Reset Orders", so: "Dib u deji Dalabyada", ar: "إعادة تعيين الطلبات" },
  resetOrdersConfirm: {
    en: "Are you sure you want to reset all orders? This will permanently delete all orders, items, payments and due transactions.",
    so: "Ma hubtaa inaad rabto inaad dib u dejiso dhammaan dalabyada? Tani waxay tirtiri doontaa dhammaan dalabyada, alaabta, lacag-bixinta iyo deynta.",
    ar: "هل أنت متأكد من رغبتك في إعادة تعيين جميع الطلبات؟ سيؤدي ذلك إلى حذف جميع الطلبات والعناصر والمدفوعات والديون نهائيًا.",
  },
  language: { en: "Language", so: "Luqadda", ar: "اللغة" },
  selectLanguage: { en: "Select Language", so: "Dooro Luqadda", ar: "اختر اللغة" },
  merchantNumber: { en: "Merchants Number", so: "Lambarka Ganacsadaha", ar: "رقم التاجر" },
  merchantHelp: {
    en: "Send payment to merchant (e.g., Hormuud EVC)",
    so: "U dir lacagta ganacsadaha (tusaale Hormuud EVC)",
    ar: "أرسل الدفع إلى التاجر (مثل Hormuud EVC)",
  },
};

export const t = (key: keyof typeof D, lang: Language = getLanguage()): string => {
  const e = D[key];
  if (!e) return String(key);
  return e[lang] || e.en;
};

// Initialize on import (set <html lang/dir>)
if (typeof document !== "undefined") {
  const init = getLanguage();
  document.documentElement.setAttribute("lang", init);
  document.documentElement.setAttribute("dir", init === "ar" ? "rtl" : "ltr");
}

import { useEffect, useState } from "react";
export const useLanguage = () => {
  const [lang, setLang] = useState<Language>(getLanguage());
  useEffect(() => {
    const unsub = subscribeLanguage(setLang);
    return () => { unsub; };
  }, []);
  return { lang, t: (k: keyof typeof D) => t(k, lang), setLanguage };
};
