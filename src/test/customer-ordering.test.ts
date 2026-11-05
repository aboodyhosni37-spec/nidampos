import { describe, expect, it } from "vitest";
import { deliveryFeeForDistrict, BANADIR_DISTRICTS } from "@/lib/storefront";
import { onlineOrderStatuses } from "@/lib/customerOrderWorkflow";
import { computeTotals, DEFAULT_SETTINGS } from "@/lib/systemSettings";

describe("customer ordering rules", () => {
  it("extracts $0.48 inclusive tax from $10 at 5% without increasing sales", () => {
    const totals = computeTotals(10, { type: "none", value: 0 }, { ...DEFAULT_SETTINGS, tax_enabled: true, tax_inclusive: true, tax_rate: 5 });
    expect(totals.tax).toBe(0.48);
    expect(totals.total).toBe(10);
  });
  it("charges $1 for the four core Banadir districts", () => {
    for (const district of ["Xamar Weyne", "Shangani", "Xamar Jajab", "Waberi"]) expect(deliveryFeeForDistrict(district)).toBe(1);
  });
  it("charges $1.50 for the other fourteen Banadir districts", () => {
    const other = BANADIR_DISTRICTS.filter(d => !["Xamar Weyne", "Shangani", "Xamar Jajab", "Waberi"].includes(d));
    expect(other).toHaveLength(14);
    for (const district of other) expect(deliveryFeeForDistrict(district)).toBe(1.5);
  });
  it("offers all requested delivery stages", () => {
    expect(onlineOrderStatuses("DELIVERY")).toEqual(["Pending", "Accepted", "Preparing", "Ready", "Out for delivery", "Completed", "Cancelled"]);
  });
  it("does not offer out-for-delivery for pickup", () => {
    expect(onlineOrderStatuses("PICKUP")).toEqual(["Pending", "Accepted", "Preparing", "Ready", "Completed", "Cancelled"]);
  });
});