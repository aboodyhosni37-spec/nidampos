export type ReceiptSettings = {
  // Printer
  printerName: string;
  paperSize: "58mm" | "80mm";
  autoPrint: boolean;

  // Kitchen
  enableKitchenPrint: boolean;

  // Header
  showLogo: boolean;
  logoUrl: string;
  businessName: string;
  showAddress: boolean;
  address: string;
  showPhone: boolean;
  phone: string;

  // Body
  showItems: boolean;
  showPaymentMethod: boolean;
  showTotal: boolean;

  // Footer
  showFooter: boolean;
  footerMessage: string;
  showPoweredBy: boolean;
};

const KEY = "nidam_receipt_settings_v1";

export const DEFAULT_RECEIPT_SETTINGS: ReceiptSettings = {
  printerName: "Default Printer",
  paperSize: "80mm",
  autoPrint: true,

  enableKitchenPrint: false,

  showLogo: false,
  logoUrl: "",
  businessName: "NIDAM POS",
  showAddress: true,
  address: "123 Gourmet Street, Foodville",
  showPhone: true,
  phone: "+1 (555) 123-4567",

  showItems: true,
  showPaymentMethod: true,
  showTotal: true,

  showFooter: true,
  footerMessage: "Thank you! Please come again",
  showPoweredBy: true,
};

export const loadReceiptSettings = (): ReceiptSettings => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_RECEIPT_SETTINGS };
    return { ...DEFAULT_RECEIPT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_RECEIPT_SETTINGS };
  }
};

export const saveReceiptSettings = (s: ReceiptSettings) => {
  localStorage.setItem(KEY, JSON.stringify(s));
};
