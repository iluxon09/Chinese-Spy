export type ReplayTransaction = {
  side: "BUY" | "SELL";
  symbol: string;
  quantity: number;
  executionPricePaise: number;
  chargesPaise: number;
  marketStep: number;
};

export type ReplayHistoryPoint = {
  symbol: string;
  market_step: number;
  pricePaise: number;
};

export type ReplayPortfolio = {
  transactions: ReplayTransaction[];
  snapshot: {
    portfolioValuePaise: number;
    totalPnlPaise: number;
    returnPercent: number;
  };
};

export type ReplayAttemptMetrics = {
  tradeCount: number;
  sellsAfterEightPercentDecline: number;
  totalChargesPaise: number;
  portfolioValuePaise: number;
  totalPnlPaise: number;
  returnPercent: number;
};

export function countSellsAfterSharpDeclines(
  transactions: readonly ReplayTransaction[],
  histories: Readonly<Record<string, readonly ReplayHistoryPoint[]>>,
  thresholdBps = 800,
): number {
  let count = 0;

  for (const transaction of transactions) {
    if (
      transaction.side !== "SELL" ||
      !transaction.symbol ||
      !Number.isSafeInteger(transaction.marketStep) ||
      transaction.marketStep < 1 ||
      !Number.isSafeInteger(transaction.executionPricePaise) ||
      transaction.executionPricePaise <= 0
    ) continue;

    const priorPoints = (histories[transaction.symbol] ?? []).filter((point) =>
      point.symbol === transaction.symbol &&
      Number.isSafeInteger(point.market_step) &&
      point.market_step >= transaction.marketStep - 3 &&
      point.market_step < transaction.marketStep &&
      Number.isSafeInteger(point.pricePaise) &&
      point.pricePaise > 0
    );

    const priorSteps = new Set(priorPoints.map((point) => point.market_step));
    if (priorSteps.size < 2) continue;

    const priorPeak = Math.max(...priorPoints.map((point) => point.pricePaise));
    const declineBps = Math.round(
      ((priorPeak - transaction.executionPricePaise) / priorPeak) * 10_000,
    );

    if (declineBps >= thresholdBps) count++;
  }

  return count;
}

export function measureReplayAttempt(
  portfolio: ReplayPortfolio,
  histories: Readonly<Record<string, readonly ReplayHistoryPoint[]>>,
): ReplayAttemptMetrics {
  const transactions = portfolio.transactions ?? [];
  return {
    tradeCount: transactions.length,
    sellsAfterEightPercentDecline: countSellsAfterSharpDeclines(transactions, histories),
    totalChargesPaise: transactions.reduce((sum, transaction) => sum + transaction.chargesPaise, 0),
    portfolioValuePaise: portfolio.snapshot.portfolioValuePaise,
    totalPnlPaise: portfolio.snapshot.totalPnlPaise,
    returnPercent: portfolio.snapshot.returnPercent,
  };
}

export function hasIdenticalPricePath(
  first: Readonly<Record<string, readonly ReplayHistoryPoint[]>>,
  second: Readonly<Record<string, readonly ReplayHistoryPoint[]>>,
): boolean {
  const firstSymbols = Object.keys(first).sort();
  const secondSymbols = Object.keys(second).sort();
  if (firstSymbols.length !== secondSymbols.length) return false;

  return firstSymbols.every((symbol, index) => {
    if (symbol !== secondSymbols[index]) return false;
    const a = first[symbol] ?? [];
    const b = second[symbol] ?? [];
    return a.length === b.length && a.every((point, pointIndex) => {
      const other = b[pointIndex];
      return Boolean(other) &&
        point.market_step === other.market_step &&
        point.pricePaise === other.pricePaise;
    });
  });
}
