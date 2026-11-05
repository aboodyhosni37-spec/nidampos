import { describe, expect, it } from "vitest";
import {
  EVC_USSD_MERCHANT,
  evcUssdAmount,
  evcUssdCode,
  evcUssdTelLink,
} from "@/lib/evcUssd";

/** The amount part of a code, i.e. what sits between the 3rd `*` and the `#`. */
function amountOf(code: string): string {
  return code.slice(0, -1).split("*").pop() ?? "";
}

describe("EVC Plus USSD QR", () => {
  it("uses the exact format with merchant 62271 and the grand total", () => {
    expect(evcUssdCode(5.5)).toBe("*789*62271*5.50#");
    expect(evcUssdCode(12)).toBe("*789*62271*12.00#");
    expect(evcUssdCode(1.5)).toBe("*789*62271*1.50#");
    expect(EVC_USSD_MERCHANT).toBe("62271");
  });

  it("writes the amount with a decimal point, never an asterisk", () => {
    for (const total of [1.5, 5.5, 0.05, 12, 100.99, 7]) {
      const code = evcUssdCode(total);
      const amount = amountOf(code);
      expect(amount).toMatch(/^\d+\.\d{2}$/);
      expect(amount).not.toContain("*");
      expect(code).not.toMatch(/\d\*\d/);
      expect(code.endsWith("#")).toBe(true);
    }
    expect(evcUssdAmount(1.5)).toBe("1.50");
    expect(evcUssdAmount(1.005)).toBe("1.01");
  });

  it("does not alter the order amount", () => {
    expect(evcUssdAmount(0)).toBe("0.00");
    expect(evcUssdAmount(-5)).toBe("0.00");
    expect(evcUssdAmount(9999.99)).toBe("9999.99");
  });

  it("escapes the decimal point so dialers keep it instead of showing *", () => {
    const link = evcUssdTelLink(1.5);
    expect(link).toBe("tel:%2A789%2A62271%2A1%2E50%23");
    expect(link).not.toContain(".50");
    expect(decodeURIComponent(link.slice(4))).toBe("*789*62271*1.50#");
  });

  it("encodes # in the tel link and never a web address", () => {
    expect(evcUssdTelLink(5.5)).toBe("tel:%2A789%2A62271%2A5%2E50%23");
    expect(decodeURIComponent(evcUssdTelLink(5.5).slice(4))).toBe("*789*62271*5.50#");
    expect(evcUssdTelLink(5.5)).not.toMatch(/https?:|google/i);
  });
});
