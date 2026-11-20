import { describe, expect, it } from "vitest";
import {
  countSellsAfterSharpDeclines,
  hasIdenticalPricePath,
  measureReplayAttempt,
} from "../../src/lib/crash-replay/metrics";

const histories = {
  ASTE: [
    { symbol: "ASTE", market_step: 0, pricePaise: 100_000 },
    { symbol: "ASTE", market_step: 1, pricePaise: 96_000 },
    { symbol: "ASTE", market_step: 2, pricePaise: 90_000 },
  ],
};

describe("crash replay comparison metrics", () => {
  it("counts sells after an 8% decline using distinct prior market steps", () => {
    const count = countSellsAfterSharpDeclines([
      {
        side: "SELL",
        symbol: "ASTE",
        quantity: 2,
        executionPricePaise: 91_000,
        chargesPaise: 100,
        marketStep: 2,
      },
      {
        side: "SELL",
        symbol: "ASTE",
        quantity: 1,
        executionPricePaise: 95_000,
        chargesPaise: 100,
        marketStep: 1,
      },
    ], histories);
    expect(count).toBe(1);
  });

  it("does not infer a decline when there are fewer than two earlier observations", () => {
    const count = countSellsAfterSharpDeclines([
      {
        side: "SELL",
        symbol: "ASTE",
        quantity: 1,
        executionPricePaise: 80_000,
        chargesPaise: 100,
        marketStep: 1,
      },
    ], {
      ASTE: [{ symbol: "ASTE", market_step: 0, pricePaise: 100_000 }],
    });
    expect(count).toBe(0);
  });

  it("calculates activity, charges and final portfolio values", () => {
    const result = measureReplayAttempt({
      transactions: [
        {
          side: "SELL",
          symbol: "ASTE",
          quantity: 2,
          executionPricePaise: 90_000,
          chargesPaise: 250,
          marketStep: 2,
        },
      ],
      snapshot: {
        portfolioValuePaise: 1_010_000,
        totalPnlPaise: 10_000,
        returnPercent: 1,
      },
    }, histories);

    expect(result.tradeCount).toBe(1);
    expect(result.sellsAfterEightPercentDecline).toBe(1);
    expect(result.totalChargesPaise).toBe(250);
    expect(result.returnPercent).toBe(1);
  });

  it("verifies both attempts use the same symbol and price path", () => {
    expect(hasIdenticalPricePath(histories, histories)).toBe(true);
    expect(hasIdenticalPricePath(histories, {
      ASTE: [...histories.ASTE, { symbol: "ASTE", market_step: 3, pricePaise: 93_000 }],
    })).toBe(false);
  });
});
