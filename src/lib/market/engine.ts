import type { Company, MarketEvent, MoneyPaise, PricePoint } from "../domain/types";

export interface MarketState {
  scenarioId: string;
  marketStep: number;
  pricesPaise: Record<string, MoneyPaise>;
}

export interface MarketAdvanceResult {
  state: MarketState;
  eventsApplied: MarketEvent[];
  pricePoints: PricePoint[];
}

function applyBasisPointChange(pricePaise: number, effectBps: number): number {
  if (!Number.isSafeInteger(pricePaise) || pricePaise <= 0) {
    throw new Error("Every market price must be a positive integer number of paise.");
  }
  if (!Number.isSafeInteger(effectBps) || effectBps <= -10_000) {
    throw new Error("Event effectBps must be an integer greater than -10000.");
  }

  // Round to the nearest paise, using integer arithmetic for reproducibility.
  const multiplier = 10_000n + BigInt(effectBps);
  const result = (BigInt(pricePaise) * multiplier + 5_000n) / 10_000n;
  const nextPrice = Number(result);
  if (!Number.isSafeInteger(nextPrice) || nextPrice <= 0) {
    throw new Error("Market event produced an invalid price.");
  }
  return nextPrice;
}

/**
 * Advances a market by exactly one step. No random values or wall-clock reads are used.
 * timestamp is derived from scenarioStartIso + step * intervalMs.
 */
export function advanceMarket(
  current: MarketState,
  companies: readonly Company[],
  allEvents: readonly MarketEvent[],
  scenarioStartIso: string,
  intervalMs = 60 * 60 * 1_000,
): MarketAdvanceResult {
  if (!Number.isSafeInteger(current.marketStep) || current.marketStep < 0) {
    throw new Error("marketStep must be a non-negative integer.");
  }
  if (!Number.isSafeInteger(intervalMs) || intervalMs <= 0) {
    throw new Error("intervalMs must be a positive integer.");
  }

  const startMs = Date.parse(scenarioStartIso);
  if (!Number.isFinite(startMs)) throw new Error("scenarioStartIso must be a valid ISO timestamp.");

  const nextStep = current.marketStep + 1;
  if (!Number.isSafeInteger(nextStep)) throw new Error("marketStep exceeds the supported integer range.");
  const nextPrices = { ...current.pricesPaise };
  const eventsApplied = allEvents
    .filter((event) => event.scenarioId === current.scenarioId && event.marketStep === nextStep)
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const event of eventsApplied) {
    const affectedCompanies = companies.filter((company) =>
      (event.symbol !== undefined && company.symbol === event.symbol) ||
      (event.sector !== undefined && company.sector === event.sector),
    );

    for (const company of affectedCompanies) {
      const oldPrice = nextPrices[company.symbol];
      if (oldPrice === undefined) throw new Error(`Missing current price for ${company.symbol}.`);
      nextPrices[company.symbol] = applyBasisPointChange(oldPrice, event.effectBps);
    }
  }

  const timestampMs = startMs + nextStep * intervalMs;
  if (!Number.isSafeInteger(timestampMs) || !Number.isFinite(new Date(timestampMs).getTime())) {
    throw new Error("Simulated timestamp exceeds the supported date range.");
  }
  const timestamp = new Date(timestampMs).toISOString();
  const pricePoints: PricePoint[] = companies.map((company) => {
    const pricePaise = nextPrices[company.symbol];
    if (pricePaise === undefined) throw new Error(`Missing current price for ${company.symbol}.`);
    return { symbol: company.symbol, marketStep: nextStep, pricePaise, timestamp };
  });

  return {
    state: { ...current, marketStep: nextStep, pricesPaise: nextPrices },
    eventsApplied,
    pricePoints,
  };
}

export function createInitialMarketState(
  scenarioId: string,
  companies: readonly Company[],
): MarketState {
  return {
    scenarioId,
    marketStep: 0,
    pricesPaise: Object.fromEntries(companies.map((company) => [company.symbol, company.initialPricePaise])),
  };
}
