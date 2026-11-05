import { describe, expect, it } from "vitest";
import {
  ALL_PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  paymentMethodLabel,
} from "@/lib/db";

describe("Staff POS payment method display", () => {
  it("shows the six methods in the required order, using full names only", () => {
    expect(ALL_PAYMENT_METHODS.map(paymentMethodLabel)).toEqual([
      "Due",
      "EVC Plus",
      "E-Dahab",
      "Premier Wallet",
      "Cash",
      "Card",
    ]);
  });

  it("keeps stored backend values unchanged while relabelling for display", () => {
    expect(ALL_PAYMENT_METHODS).toEqual([
      "Due",
      "EVC-Plus",
      "E-Dahab",
      "Premier Wallet",
      "Cash",
      "Card",
    ]);
    expect(paymentMethodLabel("EVC-Plus")).toBe("EVC Plus");
    expect(paymentMethodLabel("E-Dahab")).toBe("E-Dahab");
    expect(paymentMethodLabel("Premier Wallet")).toBe("Premier Wallet");
    expect(paymentMethodLabel("Cash")).toBe("Cash");
    expect(paymentMethodLabel("Card")).toBe("Card");
    expect(paymentMethodLabel("Due")).toBe("Due");
  });

  it("never renders short codes or duplicate EVC variants", () => {
    const labels = Object.values(PAYMENT_METHOD_LABELS);
    expect(labels).not.toContain("EVC");
    expect(labels).not.toContain("EDH");
    expect(labels).not.toContain("PRM");
    expect(labels.filter((l) => l.startsWith("EVC"))).toEqual(["EVC Plus"]);
    for (const label of labels) {
      expect(label).not.toMatch(/\b(EDH|PRM)\b/);
    }
  });

  it("falls back to the raw value for unknown methods instead of blanking them out", () => {
    expect(paymentMethodLabel("Bank Transfer")).toBe("Bank Transfer");
    expect(paymentMethodLabel(null)).toBe("");
    expect(paymentMethodLabel(undefined)).toBe("");
  });
});
