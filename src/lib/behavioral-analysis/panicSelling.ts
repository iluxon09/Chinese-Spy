import type { Transaction, PricePoint, BehaviourReport } from './types';

export function detectPanicSelling(
  transactions: Transaction[],
  priceHistory: PricePoint[],
  lessonId = 'lesson-volatility'
): BehaviourReport {
  const sellTxs = transactions.filter((transaction) => transaction.side === 'SELL');

  const LOOKBACK_STEPS = 3;
  const DROP_THRESHOLD_PCT = 8;
  const MIN_TOTAL_TRADES = 3;
  const MIN_EVALUABLE_SELLS = 1;

  if (transactions.length < MIN_TOTAL_TRADES || sellTxs.length === 0) {
    return {
      indicator: 'PANIC_SELLING',
      status: 'INSUFFICIENT_DATA',
      severity: 'LOW',
      evidence: {
        totalTrades: transactions.length,
        sellOrders: sellTxs.length,
        evaluatedSellOrders: 0,
        qualifyingSells: 0,
      },
      explanation:
        'Not enough completed trading activity, including sell orders, to evaluate selling behaviour during market declines.',
      implication:
        'More completed trades, including eligible sell orders, are needed to establish a behavioural baseline.',
      limitations:
        'Requires at least 3 total trades and at least 1 evaluable sell order with sufficient historical price data.',
      lessonId,
    };
  }

  let panicSellCount = 0;
  let evaluatedSellCount = 0;
  let invalidSellCount = 0;
  let maxDropPct = 0;

  for (const sell of sellTxs) {
    // A valid sale must have a positive execution price and quantity,
    // a finite market step, and a usable symbol.
    if (
      !sell.symbol ||
      !Number.isFinite(sell.price) ||
      sell.price <= 0 ||
      !Number.isFinite(sell.quantity) ||
      sell.quantity <= 0 ||
      !Number.isFinite(sell.marketStep)
    ) {
      invalidSellCount++;
      continue;
    }

    // Compare the sale price only with valid observations for the same
    // symbol from the three market steps strictly before the sale.
    const recentPrices = priceHistory.filter(
      (point) =>
        point.symbol === sell.symbol &&
        Number.isFinite(point.marketStep) &&
        point.marketStep >= sell.marketStep - LOOKBACK_STEPS &&
        point.marketStep < sell.marketStep &&
        Number.isFinite(point.price) &&
        point.price > 0
    );

    // Multiple observations in one step do not count as multiple steps.
    const distinctMarketSteps = new Set(
      recentPrices.map((point) => point.marketStep)
    );

    if (distinctMarketSteps.size < 2) {
      continue;
    }

    evaluatedSellCount++;

    const peakPrice = Math.max(...recentPrices.map((point) => point.price));
    const dropPct = Math.max(0, ((peakPrice - sell.price) / peakPrice) * 100);

    // Track the largest decline across every evaluable sale, not only
    // sales that cross the detection threshold.
    maxDropPct = Math.max(maxDropPct, dropPct);

    if (dropPct >= DROP_THRESHOLD_PCT) {
      panicSellCount++;
    }
  }

  if (evaluatedSellCount < MIN_EVALUABLE_SELLS) {
    return {
      indicator: 'PANIC_SELLING',
      status: 'INSUFFICIENT_DATA',
      severity: 'LOW',
      evidence: {
        totalTrades: transactions.length,
        totalSellOrders: sellTxs.length,
        evaluatedSellOrders: evaluatedSellCount,
        invalidSellOrders: invalidSellCount,
        qualifyingSells: panicSellCount,
      },
      explanation:
        'Insufficient valid historical price data to evaluate selling after sharp price declines.',
      implication:
        'More eligible sell orders with valid price observations from earlier market steps are needed.',
      limitations:
        'Requires at least 1 evaluable sell order with valid prices from at least 2 distinct market steps in the 3-step lookback window.',
      lessonId,
    };
  }

  // One qualifying sale is an observable panic-selling-like event;
  // repeated qualifying sales or a larger decline increase severity.
  const detected = panicSellCount >= 1;
  const severity = !detected
    ? 'LOW'
    : panicSellCount >= 2 || maxDropPct >= 15
      ? 'HIGH'
      : 'MODERATE';

  return {
    indicator: 'PANIC_SELLING',
    status: detected ? 'DETECTED' : 'NOT_DETECTED',
    severity,
    evidence: {
      panicSellCount,
      maxDropBeforeExitPct: Number(maxDropPct.toFixed(2)),
      totalTrades: transactions.length,
      totalSellOrders: sellTxs.length,
      evaluatedSellOrders: evaluatedSellCount,
      invalidSellOrders: invalidSellCount,
      dropThresholdPct: DROP_THRESHOLD_PCT,
      lookbackSteps: LOOKBACK_STEPS,
    },
    explanation: detected
      ? `Detected ${panicSellCount} sell order(s) executed after price declines of at least ${DROP_THRESHOLD_PCT}% within the lookback window. The largest observed decline was ${maxDropPct.toFixed(2)}%.`
      : 'The evaluated transactions did not show selling after a sharp short-term price decline.',
    implication: detected
      ? 'Selling immediately after a sharp price decline may turn a temporary paper loss into a realised loss; the pattern may also reflect a planned exit or risk limit.'
      : 'The evaluated transactions do not show reactive selling during short-term price declines under the selected thresholds.',
    limitations:
      'Uses a 3-market-step lookback and an 8% decline threshold. It does not establish the trader’s intent or distinguish emotional exits from planned stop-losses, liquidity needs, or changes in company information.',
    lessonId,
  };
}
