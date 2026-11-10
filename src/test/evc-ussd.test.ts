import { describe, expect, it } from "vitest";
import { EVC_USSD_MERCHANT, evcUssdAmount, evcUssdCode, evcUssdTelLink } from "@/lib/evcUssd";

describe("EVC Plus USSD code", () => {
  it("replaces the decimal point with an asterisk", () => {
    expect(evcUssdCode(3.75)).toBe("*789*62271*3*75#");
    expect(evcUssdCode(5.5)).toBe("*789*62271*5*50#");
    expect(evcUssdCode(10.25)).toBe("*789*62271*10*25#");
    expect(evcUssdAmount(0.05)).toBe("0*05");
  });

  it("keeps whole amounts unchanged", () => {
    expect(evcUssdCode(5)).toBe("*789*62271*5#");
    expect(evcUssdCode(12)).toBe("*789*62271*12#");
  });

  it("keeps merchant 62271 and does not alter the amount value", () => {
    expect(EVC_USSD_MERCHANT).toBe("62271");
    const total = 3.75;
    evcUssdCode(total);
    expect(total).toBe(3.75);
    expect(evcUssdAmount(-5)).toBe("0");
  });

  it("encodes the tel link without a web address", () => {
    const link = evcUssdTelLink(3.75);
    expect(link).toBe("tel:%2A789%2A62271%2A3%2A75%23");
    expect(decodeURIComponent(link.slice(4))).toBe("*789*62271*3*75#");
    expect(link).not.toMatch(/https?:|google/i);
  });
});
