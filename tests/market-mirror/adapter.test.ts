import { describe, expect, it } from "vitest";
import {
  adaptHoldings,
  adaptPriceHistory,
  adaptTransactions,
  analyzePortfolioBehaviour,
  INDICATOR_LESSONS,
} from "../../src/lib/market-mirror";

const transactions = [{
  id: "tx-1",
  sessionId: "session-1",
  symbol: "ASTE",
  side: "BUY" as const,
  quantity: 10,
  executionPricePaise: 12_345,
  grossAmountPaise: 123_450,
  chargesPaise: 100,
  cashDeltaPaise: -123_550,
  realisedPnlPaise: 0,
  marketStep: 3,
  timestamp: "2026-11-20T10:00:00.000Z",
}];

const holdings = [{
  symbol: "ASTE",
  quantity: 10,
  currentPricePaise: 13_000,
  averagePurchasePricePaise: 12_355,
  totalCostPaise: 123_550,
  marketValuePaise: 130_000,
  unrealisedPnlPaise: 6_450,
}];

describe("Market Mirror live API adapter", () => {
  it("converts transaction execution prices and charges from paise to rupees", () => {
    const [transaction] = adaptTransactions(transactions);
    expect(transaction.price).toBe(123.45);
    expect(transaction.charges).toBe(1);
    expect(transaction.marketStep).toBe(3);
  });

  it("adds the live company sector to each holding", () => {
    const [holding] = adaptHoldings(holdings, [
      { symbol: "ASTE", sector: "Energy" },
    ]);
    expect(holding.currentPrice).toBe(130);
    expect(holding.averagePrice).toBe(123.55);
    expect(holding.sector).toBe("Energy");
  });

  it("converts price-history observations from paise to rupees", () => {
    const [point] = adaptPriceHistory({
      ASTE: [{
        symbol: "ASTE",
        market_step: 2,
        pricePaise: 12_000,
        timestamp: "2026-11-20T09:00:00.000Z",
      }],
    });
    expect(point.price).toBe(120);
    expect(point.marketStep).toBe(2);
  });

  it("maps detector recommendations to Member 4's stable Academy lesson IDs", () => {
    const reports = analyzePortfolioBehaviour({
      transactions: [],
      holdings: [],
      companies: [],
      histories: {},
      currentMarketStep: 0,
    });
    expect(reports).toHaveLength(4);
    expect(reports.map((report) => report.lessonId)).toEqual([
      INDICATOR_LESSONS.PANIC_SELLING,
      INDICATOR_LESSONS.FOMO,
      INDICATOR_LESSONS.OVERTRADING,
      INDICATOR_LESSONS.CONCENTRATION,
    ]);
    expect(reports.every((report) => report.status === "INSUFFICIENT_DATA")).toBe(true);
  });

  it("passes the elapsed market-step count, including step zero", () => {
    const reports = analyzePortfolioBehaviour({
      transactions,
      holdings,
      companies: [{ symbol: "ASTE", sector: "Energy" }],
      histories: {},
      currentMarketStep: 4,
    });
    const overtrading = reports.find((report) => report.indicator === "OVERTRADING");
    expect(overtrading?.evidence.totalMarketSteps).toBe(5);
  });
});
