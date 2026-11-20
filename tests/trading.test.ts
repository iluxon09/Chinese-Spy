import { beforeEach, describe, expect, it } from "vitest";
import type { PortfolioState } from "../src/lib/domain/types";
import { calculateCharges, DEFAULT_CHARGE_POLICY } from "../src/lib/trading/charges";
import { TradingError } from "../src/lib/trading/errors";
import { calculatePortfolioSnapshot, placeMarketOrder } from "../src/lib/trading/engine";

const prices = { ASTE: 10_000 };
let initialState: PortfolioState;

beforeEach(() => {
  initialState = {
    session: {
      id: "session-1",
      userId: "user-1",
      scenarioId: "tilt-demo-v1",
      startingCapitalPaise: 100_000_000,
      cashBalancePaise: 100_000_000,
      marketStep: 0,
    },
    holdings: {},
    transactions: [],
  };
});

function buy(quantity: number, state = initialState) {
  return placeMarketOrder(state, {
    id: `buy-${quantity}`,
    symbol: "ASTE",
    side: "BUY",
    quantity,
    timestamp: "2026-11-20T00:00:00.000Z",
  }, prices, DEFAULT_CHARGE_POLICY);
}

describe("trading engine", () => {
  it("rounds a fractional-paise fee up to the next paise", () => {
    expect(calculateCharges(1, { rateBps: 1, minimumChargePaise: 0 })).toBe(1);
    expect(calculateCharges(10_000, { rateBps: 10, minimumChargePaise: 0 })).toBe(10);
  });
  it("buys shares, deducts charges and records a transaction", () => {
    const next = buy(10);
    expect(next.session.cashBalancePaise).toBe(99_899_900);
    expect(next.holdings.ASTE).toEqual({ symbol: "ASTE", quantity: 10, totalCostPaise: 100_100 });
    expect(next.transactions[0]).toMatchObject({
      side: "BUY", grossAmountPaise: 100_000, chargesPaise: 100, cashDeltaPaise: -100_100,
    });
  });

  it("sells shares and realises net P&L after charges", () => {
    const bought = buy(10);
    const sold = placeMarketOrder(bought, {
      id: "sell-4", symbol: "ASTE", side: "SELL", quantity: 4,
      timestamp: "2026-11-20T01:00:00.000Z",
    }, { ASTE: 12_000 });

    expect(sold.session.cashBalancePaise).toBe(99_947_852);
    expect(sold.holdings.ASTE).toEqual({ symbol: "ASTE", quantity: 6, totalCostPaise: 60_060 });
    expect(sold.transactions[1].realisedPnlPaise).toBe(7_912);
  });

  it("keeps the unallocated cost-basis remainder with shares after a partial sale", () => {
    const bought = placeMarketOrder(initialState, {
      id: "buy-three", symbol: "ASTE", side: "BUY", quantity: 3,
      timestamp: "2026-11-20T00:00:00.000Z",
    }, prices, { rateBps: 0, minimumChargePaise: 2 });
    const sold = placeMarketOrder(bought, {
      id: "sell-one", symbol: "ASTE", side: "SELL", quantity: 1,
      timestamp: "2026-11-20T01:00:00.000Z",
    }, { ASTE: 10_000 }, { rateBps: 0, minimumChargePaise: 0 });

    expect(sold.holdings.ASTE.quantity).toBe(2);
    expect(sold.holdings.ASTE.totalCostPaise).toBe(20_002);
    expect(sold.transactions[1].realisedPnlPaise).toBe(0);
  });

  it("releases the exact remaining cost basis when the full position is sold", () => {
    const bought = buy(10);
    const sold = placeMarketOrder(bought, {
      id: "sell-all", symbol: "ASTE", side: "SELL", quantity: 10,
      timestamp: "2026-11-20T01:00:00.000Z",
    }, { ASTE: 12_000 });

    expect(sold.holdings.ASTE).toBeUndefined();
    expect(sold.transactions[1].realisedPnlPaise).toBe(19_780);
  });

  it("does not mutate the original state", () => {
    const originalCash = initialState.session.cashBalancePaise;
    const next = buy(10);
    expect(initialState.session.cashBalancePaise).toBe(originalCash);
    expect(initialState.holdings).toEqual({});
    expect(next).not.toBe(initialState);
  });

  it("rejects unknown symbols without changing the input", () => {
    expect(() => placeMarketOrder(initialState, {
      id: "bad", symbol: "NOPE", side: "BUY", quantity: 1,
      timestamp: "2026-11-20T00:00:00.000Z",
    }, prices)).toThrowError(TradingError);
    expect(initialState.holdings).toEqual({});
  });

  it("rejects zero, negative and fractional quantities", () => {
    for (const quantity of [0, -1, 1.5]) {
      expect(() => placeMarketOrder(initialState, {
        id: "bad-qty", symbol: "ASTE", side: "BUY", quantity,
        timestamp: "2026-11-20T00:00:00.000Z",
      }, prices)).toThrowError(TradingError);
    }
  });

  it("rejects buys when available cash is insufficient", () => {
    const poorState = {
      ...initialState,
      session: { ...initialState.session, cashBalancePaise: 100 },
    };
    expect(() => buy(10, poorState)).toThrowError(/Insufficient cash/);
    expect(poorState.session.cashBalancePaise).toBe(100);
    expect(poorState.holdings).toEqual({});
  });

  it("rejects sells when holdings are insufficient", () => {
    expect(() => placeMarketOrder(initialState, {
      id: "sell-too-many", symbol: "ASTE", side: "SELL", quantity: 1,
      timestamp: "2026-11-20T00:00:00.000Z",
    }, prices)).toThrowError(/do not own enough shares/);
  });

  it("calculates portfolio value, realised and unrealised P&L", () => {
    const bought = buy(10);
    const snapshot = calculatePortfolioSnapshot(bought, { ASTE: 12_000 }, { ASTE: "Energy" });
    expect(snapshot.cashBalancePaise).toBe(99_899_900);
    expect(snapshot.investedAmountPaise).toBe(100_100);
    expect(snapshot.holdingsValuePaise).toBe(120_000);
    expect(snapshot.portfolioValuePaise).toBe(100_019_900);
    expect(snapshot.unrealisedPnlPaise).toBe(19_900);
    expect(snapshot.totalPnlPaise).toBe(19_900);
    expect(snapshot.returnPercent).toBeCloseTo(0.0199);
    expect(snapshot.sectorAllocation).toEqual([{ sector: "Energy", marketValuePaise: 120_000, weightBps: 10_000 }]);
  });
});
