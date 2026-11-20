import { describe, expect, it } from "vitest";
import {
  calculateMarketMovementBps,
  marketHashBucket,
  type MarketMovementInput,
} from "../../src/lib/simulation/market-model";

const base: MarketMovementInput = {
  scenarioId: "tilt-demo-v1",
  marketStep: 1,
  sector: "Energy",
  symbol: "ASTE",
  driftBps: 0,
  marketVolatilityBps: 12,
  sectorVolatilityBps: 8,
  companyVolatilityBps: 24,
  companyVolatilityMultiplierBps: 10500,
  shockProbabilityBps: 40,
  shockMaxBps: 110,
};

describe("deterministic intraday market model", () => {
  it("returns stable hash buckets in the requested range", () => {
    for (const count of [1, 2, 101, 10000]) {
      const first = marketHashBucket("tilt-demo-v1:7:market:all", count);
      expect(first).toBe(marketHashBucket("tilt-demo-v1:7:market:all", count));
      expect(first).toBeGreaterThanOrEqual(0);
      expect(first).toBeLessThan(count);
    }
  });

  it("repeats the same movement for the same scenario, step and symbol", () => {
    const first = calculateMarketMovementBps(base);
    const second = calculateMarketMovementBps({ ...base });
    expect(second).toBe(first);
  });

  it("produces both positive and negative five-minute moves over a simulated session", () => {
    const moves = Array.from({ length: 78 }, (_, index) =>
      calculateMarketMovementBps({ ...base, marketStep: index + 1 }),
    );

    expect(moves.some((move) => move > 0)).toBe(true);
    expect(moves.some((move) => move < 0)).toBe(true);
    expect(moves.every((move) => Math.abs(move) <= 2500)).toBe(true);
  });

  it("applies a deterministic market-wide shock when the configured probability is certain", () => {
    const noShock = calculateMarketMovementBps({
      ...base,
      shockProbabilityBps: 0,
      shockMaxBps: 0,
    });
    const certainShock = calculateMarketMovementBps({
      ...base,
      shockProbabilityBps: 10000,
      shockMaxBps: 110,
    });

    expect(certainShock).not.toBe(noShock);
  });

  it("allows a scripted replay to disable all background movement", () => {
    expect(calculateMarketMovementBps({
      ...base,
      driftBps: 0,
      marketVolatilityBps: 0,
      sectorVolatilityBps: 0,
      companyVolatilityBps: 0,
      shockProbabilityBps: 0,
      shockMaxBps: 0,
    })).toBe(0);
  });

  it("rejects invalid market configuration instead of creating undefined prices", () => {
    expect(() => calculateMarketMovementBps({
      ...base,
      shockProbabilityBps: 10001,
    })).toThrow(RangeError);
    expect(() => marketHashBucket("seed", 0)).toThrow(RangeError);
  });
});
