// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ALL_PAYMENT_METHODS, paymentMethodLabel } from "@/lib/db";
import { PayBtn, methodIcon } from "@/pages/POS";

describe("POS payment method buttons", () => {
  it("renders the six options with full names, icons and no short codes", () => {
    render(
      <div>
        {ALL_PAYMENT_METHODS.map((m) => (
          <PayBtn
            key={m}
            active={false}
            onClick={() => {}}
            icon={methodIcon(m)}
            label={paymentMethodLabel(m)}
          />
        ))}
      </div>
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(6);
    expect(buttons.map((b) => b.textContent?.trim())).toEqual([
      "Due",
      "EVC Plus",
      "E-Dahab",
      "Premier Wallet",
      "Cash",
      "Card",
    ]);

    // every option keeps a real icon (svg), not a text abbreviation
    for (const b of buttons) {
      expect(b.querySelector("svg")).not.toBeNull();
    }

    const all = document.body.textContent ?? "";
    expect(all).not.toMatch(/\bEDH\b/);
    expect(all).not.toMatch(/\bPRM\b/);
    expect(all).not.toMatch(/\bEVC\b(?! Plus)/);
    expect(all).not.toContain("EVC-Plus");
  });
});
