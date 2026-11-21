import { describe, expect, it } from "vitest";
import {
  calculateLastCandleChange,
  calculatePercentChange,
  calculateSinceStartChange,
} from "../../src/lib/market/returns";

describe("market return calculations", () => {
  it("calculates positive, negative and flat percentage moves", () => {
    expect(calculatePercentChange(10_500, 10_000)).toBe(5);
    expect(calculatePercentChange(9_500, 10_000)).toBe(-5);
    expect(calculatePercentChange(10_000, 10_000)).toBe(0);
  });

  it("rejects zero, negative and non-finite prices", () => {
    expect(calculatePercentChange(0, 10_000)).toBeNull();
    expect(calculatePercentChange(10_000, 0)).toBeNull();
    expect(calculatePercentChange(-1, 10_000)).toBeNull();
    expect(calculatePercentChange(Number.NaN, 10_000)).toBeNull();
    expect(calculatePercentChange(10_000, Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("calculates the change against the exact prior candle, not the latest array item", () => {
    expect(
      calculateLastCandleChange(
        [
          { market_step: 3, pricePaise: 11_000 },
          { market_step: 2, pricePaise: 10_000 },
          { market_step: 4, pricePaise: 10_500 },
        ],
        4,
        10_500,
        9_000,
      ),
    ).toBe(5);
  });

  it("returns null instead of comparing against a non-adjacent candle", () => {
    expect(
      calculateLastCandleChange(
        [{ market_step: 2, pricePaise: 10_000 }],
        4,
        10_500,
        9_000,
      ),
    ).toBeNull();
  });

  it("uses the opening price for the first candle", () => {
    expect(calculateLastCandleChange([], 1, 10_500, 10_000)).toBe(5);
  });

  it("does not report a last-candle return before the first market advance", () => {
    expect(calculateLastCandleChange([], 0, 10_000, 10_000)).toBeNull();
  });

  it("calculates since-start percentage independently of candle history", () => {
    expect(calculateSinceStartChange(11_250, 10_000)).toBe(12.5);
    expect(calculateSinceStartChange(9_000, 10_000)).toBe(-10);
  });
});
