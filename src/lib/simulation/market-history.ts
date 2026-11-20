export type MarketHistoryRow = {
  symbol: string;
  market_step: number;
  price_paise: number | string;
  recorded_at: string;
};

export type PriceHistoryPoint = {
  symbol: string;
  market_step: number;
  pricePaise: number;
  timestamp: string;
};

export type AdvancedPricePoint = {
  symbol: string;
  marketStep: number;
  pricePaise: number;
  timestamp: string;
};

/** Convert the database history response into the keyed client-side shape. */
export function groupMarketHistoryRows(
  rows: readonly MarketHistoryRow[],
): Record<string, PriceHistoryPoint[]> {
  const histories: Record<string, PriceHistoryPoint[]> = {};

  for (const row of rows) {
    (histories[row.symbol] ??= []).push({
      symbol: row.symbol,
      market_step: row.market_step,
      pricePaise: Number(row.price_paise),
      timestamp: row.recorded_at,
    });
  }

  for (const points of Object.values(histories)) {
    points.sort((a, b) => a.market_step - b.market_step);
  }

  return histories;
}

/** Append one committed market step without duplicating an already-seen step. */
export function appendMarketPricePoints(
  histories: Record<string, PriceHistoryPoint[]>,
  pricePoints: readonly AdvancedPricePoint[],
): Record<string, PriceHistoryPoint[]> {
  if (pricePoints.length === 0) return histories;

  const next = { ...histories };

  for (const point of pricePoints) {
    const existing = next[point.symbol] ?? [];
    const byStep = new Map(existing.map((item) => [item.market_step, item]));
    byStep.set(point.marketStep, {
      symbol: point.symbol,
      market_step: point.marketStep,
      pricePaise: Number(point.pricePaise),
      timestamp: point.timestamp,
    });
    next[point.symbol] = [...byStep.values()].sort(
      (a, b) => a.market_step - b.market_step,
    );
  }

  return next;
}
