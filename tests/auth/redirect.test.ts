import { describe, expect, it } from "vitest";
import { getSafeInternalPath } from "../../src/lib/auth/redirect";

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
