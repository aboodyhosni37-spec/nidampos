import { describe, expect, it } from "vitest";
import { evcUssdCode, evcUssdTelLink } from "@/lib/evcUssd";

describe("EVC Plus USSD QR", () => {
  it("uses the exact format with merchant 62271 and the grand total", () => {
    expect(evcUssdCode(5.5)).toBe("*789*62271*5.50#");
    expect(evcUssdCode(12)).toBe("*789*62271*12.00#");
  });
  it("encodes # in the tel link", () => {
    expect(evcUssdTelLink(5.5)).toBe("tel:%2A789%2A62271%2A5.50%23");
    expect(decodeURIComponent(evcUssdTelLink(5.5).slice(4))).toBe("*789*62271*5.50#");
    expect(evcUssdTelLink(5.5)).not.toMatch(/https?:|google/i);
  });
});
