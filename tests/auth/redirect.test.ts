import { describe, expect, it } from "vitest";
import {
  getSafeInternalPath,
  isPublicPricingPath,
} from "../../src/lib/auth/redirect";

describe("safe post-authentication redirects", () => {
  it("keeps a valid internal path and query", () => {
    expect(getSafeInternalPath("/portfolio?tab=history")).toBe("/portfolio?tab=history");
  });

  it("rejects external and protocol-relative destinations", () => {
    expect(getSafeInternalPath("https://evil.example")).toBe("/");
    expect(getSafeInternalPath("//evil.example/path")).toBe("/");
  });

  it("rejects backslash-based origin confusion", () => {
    expect(getSafeInternalPath("/\\\\evil.example")).toBe("/");
  });

  it("falls back to the dashboard for empty or malformed values", () => {
    expect(getSafeInternalPath(null)).toBe("/");
    expect(getSafeInternalPath("")).toBe("/");
  });
});

describe("public pricing-route allowlist", () => {
  it("allows only the pricing page and its nested checkout routes", () => {
    expect(isPublicPricingPath("/pricing")).toBe(true);
    expect(isPublicPricingPath("/pricing/")).toBe(true);
    expect(isPublicPricingPath("/pricing/demo-checkout")).toBe(true);
    expect(isPublicPricingPath("/pricing/demo-checkout/")).toBe(true);
  });

  it("does not accidentally make similarly named or workspace routes public", () => {
    expect(isPublicPricingPath("/pricingx")).toBe(false);
    expect(isPublicPricingPath("/pricing-preview")).toBe(false);
    expect(isPublicPricingPath("/trading")).toBe(false);
    expect(isPublicPricingPath("/portfolio")).toBe(false);
    expect(isPublicPricingPath("/login")).toBe(false);
  });
});
