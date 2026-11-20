import { describe, expect, it } from "vitest";
import {
  getDemoCheckoutPlan,
  getDemoTotalRupees,
  PRICING_PLANS,
} from "../../src/lib/pricing/plans";

describe("proposed TILT pricing and demo checkout", () => {
  it("keeps the free tier available", () => {
    expect(PRICING_PLANS.find((plan) => plan.id === "free")?.price).toBe("₹0");
  });

  it("matches proposed annual and one-off prices", () => {
    expect(getDemoTotalRupees("plus")).toBe(999);
    expect(getDemoTotalRupees("report")).toBe(199);
    expect(getDemoCheckoutPlan("college")?.unitPriceRupees).toBe(150);
  });

  it("computes a college estimate without issuing any payment", () => {
    expect(getDemoTotalRupees("college", 400)).toBe(60_000);
    expect(getDemoTotalRupees("college", 1)).toBe(150);
  });

  it("rejects invalid student counts", () => {
    for (const count of [0, -1, 1.5, 5001, Number.NaN]) {
      expect(() => getDemoTotalRupees("college", count)).toThrow(RangeError);
    }
  });

  it("does not accept arbitrary checkout plan identifiers", () => {
    expect(getDemoCheckoutPlan(undefined)).toBeNull();
    expect(getDemoCheckoutPlan("partner")).toBeNull();
    expect(getDemoCheckoutPlan("unknown")).toBeNull();
  });
});
