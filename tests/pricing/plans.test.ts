import { describe, expect, it } from "vitest";
import {
  getDemoCheckoutPlan,
  getValidatedCohortSize,
  PRICING_PLANS,
} from "../../src/lib/pricing/plans";

describe("TILT pilot-first revenue model and demo checkout", () => {
  it("keeps the free student experience as the entry point", () => {
    expect(PRICING_PLANS[0]).toMatchObject({
      id: "free",
      priceLabel: "₹0",
    });
  });

  it("orders the primary institutional path before later-stage markets", () => {
    expect(PRICING_PLANS.map((plan) => plan.id)).toEqual([
      "free",
      "cohort-pilot",
      "site-licence",
      "broker-fintech",
      "trading-firm",
    ]);
    expect(PRICING_PLANS[2].highlightLabel).toBe("PRIMARY REVENUE PATH");
  });

  it("does not invent fixed prices for paid models", () => {
    const paidPlans = PRICING_PLANS.filter((plan) => plan.id !== "free");
    expect(paidPlans.every((plan) => !/₹\s?\d/.test(plan.priceLabel))).toBe(true);
  });

  it("uses the source's commercial basis for later segments", () => {
    expect(getDemoCheckoutPlan("broker-fintech")?.pricingBasis).toContain(
      "per-activated-user or annual",
    );
    expect(getDemoCheckoutPlan("trading-firm")?.pricingBasis).toContain(
      "per-assessment or per-seat",
    );
  });

  it("validates cohort size without treating it as a per-student price", () => {
    expect(getValidatedCohortSize("1")).toBe(1);
    expect(getValidatedCohortSize("5000")).toBe(5000);
    for (const value of ["", "0", "-1", "1.5", "5001", "abc", " 10 "]) {
      expect(getValidatedCohortSize(value)).toBeNull();
    }
  });

  it("accepts only known demo checkout plan identifiers", () => {
    expect(getDemoCheckoutPlan("cohort-pilot")?.requiresCohortSize).toBe(true);
    expect(getDemoCheckoutPlan("site-licence")?.requiresCohortSize).toBe(true);
    expect(getDemoCheckoutPlan("plus")).toBeNull();
    expect(getDemoCheckoutPlan("partner")).toBeNull();
    expect(getDemoCheckoutPlan("unknown")).toBeNull();
    expect(getDemoCheckoutPlan(undefined)).toBeNull();
  });
});
