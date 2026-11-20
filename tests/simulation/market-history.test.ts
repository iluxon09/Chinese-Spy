import { describe, expect, it } from "vitest";
import {
  appendMarketPricePoints,
  groupMarketHistoryRows,
} from "../../src/lib/simulation/market-history";

describe("simulation market history adapters", () => {
  it("groups database history rows by symbol and sorts market steps", () => {
    const histories = groupMarketHistoryRows([
      { symbol: "ASTE", market_step: 2, price_paise: "11000", recorded_at: "t2" },
      { symbol: "NVMT", market_step: 1, price_paise: 20000, recorded_at: "t1" },
      { symbol: "ASTE", market_step: 1, price_paise: 10000, recorded_at: "t1" },
    ]);

    expect(histories.ASTE.map((point) => point.market_step)).toEqual([1, 2]);
    expect(histories.ASTE[1]?.pricePaise).toBe(11000);
    expect(histories.NVMT).toHaveLength(1);
  });

  it("appends market points and replaces duplicate steps idempotently", () => {
    const initial = groupMarketHistoryRows([
      { symbol: "ASTE", market_step: 1, price_paise: 10000, recorded_at: "t1" },
    ]);

    const updated = appendMarketPricePoints(initial, [
      { symbol: "ASTE", marketStep: 2, pricePaise: 11000, timestamp: "t2" },
      { symbol: "ASTE", marketStep: 2, pricePaise: 11200, timestamp: "t2-replayed" },
      { symbol: "NVMT", marketStep: 2, pricePaise: 20500, timestamp: "t2" },
    ]);

    expect(updated.ASTE).toHaveLength(2);
    expect(updated.ASTE[1]?.pricePaise).toBe(11200);
    expect(updated.NVMT).toHaveLength(1);
    expect(initial.ASTE).toHaveLength(1);
  });
});
