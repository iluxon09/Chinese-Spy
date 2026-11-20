import { describe, expect, it } from "vitest";
import { COMPANIES, DEMO_MARKET_EVENTS } from "../src/lib/market/catalog";
import {
  advanceMarket,
  baselineMarketMoveBps,
  createInitialMarketState,
} from "../src/lib/market/engine";

const START = "2026-11-20T00:00:00.000Z";

describe("deterministic market engine", () => {
  it("starts with the catalogue's initial prices", () => {
    const state = createInitialMarketState("tilt-demo-v1", COMPANIES);
    expect(state.marketStep).toBe(0);
    expect(state.pricesPaise.ASTE).toBe(10_000);
    expect(Object.keys(state.pricesPaise)).toHaveLength(8);
  });

  it("moves every company on a candle even when there is no scheduled news", () => {
    const state = createInitialMarketState("tilt-demo-v1", COMPANIES);
    const result = advanceMarket(state, COMPANIES, [], START);

    expect(result.state.marketStep).toBe(1);
    expect(result.pricePoints).toHaveLength(COMPANIES.length);
    for (const company of COMPANIES) {
      expect(result.state.pricesPaise[company.symbol]).not.toBe(state.pricesPaise[company.symbol]);
      expect(result.state.pricesPaise[company.symbol]).toBeGreaterThan(0);
    }
  });

  it("applies the baseline move and step-1 news event", () => {
    const state = createInitialMarketState("tilt-demo-v1", COMPANIES);
    const result = advanceMarket(state, COMPANIES, DEMO_MARKET_EVENTS, START);

    expect(result.state.marketStep).toBe(1);
    expect(result.state.pricesPaise.ASTE).toBe(10_713);
    expect(result.eventsApplied.map((event) => event.id)).toEqual(["evt-001"]);
    expect(result.pricePoints).toHaveLength(8);
    expect(result.pricePoints[0]).toEqual({
      symbol: "ASTE", marketStep: 1, pricePaise: 10_713,
      timestamp: "2026-11-20T01:00:00.000Z",
    });
  });

  it("replaying the same scenario produces identical prices and events", () => {
    const first = createInitialMarketState("tilt-demo-v1", COMPANIES);
    const second = createInitialMarketState("tilt-demo-v1", COMPANIES);

    const firstStep1 = advanceMarket(first, COMPANIES, DEMO_MARKET_EVENTS, START);
    const secondStep1 = advanceMarket(second, COMPANIES, DEMO_MARKET_EVENTS, START);
    const firstStep2 = advanceMarket(firstStep1.state, COMPANIES, DEMO_MARKET_EVENTS, START);
    const secondStep2 = advanceMarket(secondStep1.state, COMPANIES, DEMO_MARKET_EVENTS, START);

    expect(firstStep2.state).toEqual(secondStep2.state);
    expect(firstStep2.eventsApplied).toEqual(secondStep2.eventsApplied);
    expect(firstStep2.pricePoints).toEqual(secondStep2.pricePoints);
  });

  it("continues fluctuating after scheduled news ends, with both upward and downward moves", () => {
    for (const company of COMPANIES) {
      const movements = Array.from({ length: 30 }, (_, index) =>
        baselineMarketMoveBps("tilt-demo-v1", index + 1, company.symbol, company.sector),
      );
      expect(movements.some((movement) => movement > 0)).toBe(true);
      expect(movements.some((movement) => movement < 0)).toBe(true);
    }

    let state = createInitialMarketState("tilt-demo-v1", COMPANIES);
    for (let step = 1; step <= 30; step += 1) {
      const result = advanceMarket(state, COMPANIES, [], START);
      expect(result.state.marketStep).toBe(step);
      for (const price of Object.values(result.state.pricesPaise)) {
        expect(Number.isSafeInteger(price)).toBe(true);
        expect(price).toBeGreaterThan(0);
      }
      state = result.state;
    }
  });

  it("applies sector news as an extra shock after the baseline move", () => {
    const state = createInitialMarketState("tilt-demo-v1", COMPANIES);
    const step1 = advanceMarket(state, COMPANIES, DEMO_MARKET_EVENTS, START);
    const step2 = advanceMarket(step1.state, COMPANIES, DEMO_MARKET_EVENTS, START);
    expect(step2.state.pricesPaise.ZNFC).toBe(11_961);
  });
});
