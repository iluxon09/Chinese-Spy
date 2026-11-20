import { describe, expect, it } from "vitest";
import { COMPANIES, DEMO_MARKET_EVENTS } from "../src/lib/market/catalog";
import { advanceMarket, createInitialMarketState } from "../src/lib/market/engine";

const START = "2026-11-20T00:00:00.000Z";

describe("deterministic market engine", () => {
  it("starts with the catalogue's initial prices", () => {
    const state = createInitialMarketState("tilt-demo-v1", COMPANIES);
    expect(state.marketStep).toBe(0);
    expect(state.pricesPaise.ASTE).toBe(10_000);
    expect(Object.keys(state.pricesPaise)).toHaveLength(8);
  });

  it("applies the step-1 event and records timestamped price points", () => {
    const state = createInitialMarketState("tilt-demo-v1", COMPANIES);
    const result = advanceMarket(state, COMPANIES, DEMO_MARKET_EVENTS, START);
    expect(result.state.marketStep).toBe(1);
    expect(result.state.pricesPaise.ASTE).toBe(10_800);
    expect(result.eventsApplied.map((event) => event.id)).toEqual(["evt-001"]);
    expect(result.pricePoints).toHaveLength(8);
    expect(result.pricePoints[0]).toEqual({
      symbol: "ASTE", marketStep: 1, pricePaise: 10_800,
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

  it("applies sector events to every company in that sector", () => {
    const state = createInitialMarketState("tilt-demo-v1", COMPANIES);
    const step1 = advanceMarket(state, COMPANIES, DEMO_MARKET_EVENTS, START);
    const step2 = advanceMarket(step1.state, COMPANIES, DEMO_MARKET_EVENTS, START);
    expect(step2.state.pricesPaise.ZNFC).toBe(11_875); // ₹125.00 reduced by 5%
  });
});
