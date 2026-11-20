import type { Transaction, PricePoint, BehaviourReport } from './types';

export function detectFomo(
  transactions: Transaction[],
  priceHistory: PricePoint[],
  lessonId = 'lesson-fomo'
): BehaviourReport {
  const buyTxs = transactions.filter((t) => t.side === 'BUY');

  const LOOKBACK_STEPS = 3;
  const SURGE_THRESHOLD_PCT = 10;
  const MIN_TOTAL_TRADES = 3;
  const MIN_EVALUABLE_BUYS = 2;
  const MIN_QUALIFYING_BUYS = 2;

  // Keep the original minimum-activity requirement.
  if (transactions.length < MIN_TOTAL_TRADES || buyTxs.length === 0) {
    return {
      indicator: 'FOMO',
      status: 'INSUFFICIENT_DATA',
      severity: 'LOW',
      evidence: {
        totalTrades: transactions.length,
        buyOrders: buyTxs.length,
        evaluatedBuyOrders: 0,
        qualifyingBuys: 0,
      },
      explanation:
        'Not enough completed trading activity to evaluate buying behaviour after price rallies.',
      implication:
        'More completed trades, including eligible buy orders, are needed to establish a behavioural baseline.',
      limitations:
        'Requires at least 3 total trades and at least 2 evaluable buy orders with sufficient historical price data.',
      lessonId,
    };
  }

  let fomoBuyCount = 0;
  let evaluatedBuyCount = 0;
  let invalidBuyCount = 0;
  let maxRallyPct = 0;

  for (const buy of buyTxs) {
    // A buy needs a valid execution price and market step.
    if (
      !Number.isFinite(buy.price) ||
      buy.price <= 0 ||
      !Number.isFinite(buy.marketStep)
    ) {
      invalidBuyCount++;
      continue;
    }

    // Only use valid observations for this symbol, within the lookback
    // window, and strictly before the buy's market step.
    const recentPrices = priceHistory
      .filter(
        (point) =>
          point.symbol === buy.symbol &&
          Number.isFinite(point.marketStep) &&
          point.marketStep >= buy.marketStep - LOOKBACK_STEPS &&
          point.marketStep < buy.marketStep &&
          Number.isFinite(point.price) &&
          point.price > 0
      )
      .sort((a, b) => a.marketStep - b.marketStep);

    // Require observations from at least two distinct earlier market steps.
    const distinctMarketSteps = new Set(
      recentPrices.map((point) => point.marketStep)
    );

    if (distinctMarketSteps.size < 2) {
      continue;
    }

    evaluatedBuyCount++;

    const troughPrice = Math.min(
      ...recentPrices.map((point) => point.price)
    );

    const rallyPct = ((buy.price - troughPrice) / troughPrice) * 100;

    // Track the largest observed rally for evidence, even when it is below
    // the threshold used to count a qualifying FOMO-like entry.
    maxRallyPct = Math.max(maxRallyPct, rallyPct);

    if (rallyPct >= SURGE_THRESHOLD_PCT) {
      fomoBuyCount++;
    }
  }

  // Missing or invalid observations must not be interpreted as proof that
  // no FOMO-like pattern exists.
  if (evaluatedBuyCount < MIN_EVALUABLE_BUYS) {
    return {
      indicator: 'FOMO',
      status: 'INSUFFICIENT_DATA',
      severity: 'LOW',
      evidence: {
        totalTrades: transactions.length,
        totalBuyOrders: buyTxs.length,
        evaluatedBuyOrders: evaluatedBuyCount,
        invalidBuyOrders: invalidBuyCount,
        qualifyingBuys: fomoBuyCount,
      },
      explanation:
        'Insufficient valid historical price data to evaluate repeated buying after sharp price rises.',
      implication:
        'More eligible buy orders with valid price observations from earlier market steps are needed.',
      limitations:
        'Requires at least 2 evaluable buy orders, each with valid prices from at least 2 distinct market steps in the 3-step lookback window.',
      lessonId,
    };
  }

  // Require repeated qualifying entries rather than treating one purchase
  // after a rally as sufficient evidence of a repeated behavioural pattern.
  const detected = fomoBuyCount >= MIN_QUALIFYING_BUYS;

  // Severity is LOW whenever the pattern is not detected.
  const severity = !detected
    ? 'LOW'
    : fomoBuyCount >= 3 || maxRallyPct >= 18
      ? 'HIGH'
      : 'MODERATE';

  return {
    indicator: 'FOMO',
    status: detected ? 'DETECTED' : 'NOT_DETECTED',
    severity,
    evidence: {
      fomoBuyCount,
      maxRallyBeforeEntryPct: Number(maxRallyPct.toFixed(2)),
      totalTrades: transactions.length,
      totalBuyOrders: buyTxs.length,
      evaluatedBuyOrders: evaluatedBuyCount,
      invalidBuyOrders: invalidBuyCount,
      surgeThresholdPct: SURGE_THRESHOLD_PCT,
      lookbackSteps: LOOKBACK_STEPS,
    },
    explanation: detected
      ? `Detected ${fomoBuyCount} buy orders following price rises of at least ${SURGE_THRESHOLD_PCT}% within the lookback window. The largest observed rise was ${maxRallyPct.toFixed(2)}%.`
      : 'The evaluated transactions did not show repeated buying after sharp price rises.',
    implication: detected
      ? 'Repeatedly buying after sharp price rises may increase exposure to entering near short-term price peaks.'
      : 'The evaluated transactions do not show a repeated price-chasing pattern under the selected thresholds.',
    limitations:
      'Uses a 3-market-step lookback, a 10% rise threshold, and requires at least 2 qualifying buy orders. It does not establish the trader’s intent or account for news catalysts, planned momentum strategies, or other reasons for buying.',
    lessonId,
  };
}
