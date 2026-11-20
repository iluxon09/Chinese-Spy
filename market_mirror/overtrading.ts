import { Transaction, BehaviourReport } from './types';

export function detectOvertrading(
  transactions: Transaction[],
  totalMarketSteps: number,
  lessonId = 'lesson-overtrading'
): BehaviourReport {
  const MIN_TOTAL_TRADES = 3;
  const MAX_TRADES_PER_STEP = 1.5;
  const MAX_TRADES_IN_SINGLE_STEP = 3;
  const MAX_FEE_DRAG_PCT = 2.0;

  let invalidTransactionCount = 0;
  let totalVolume = 0;
  let totalCharges = 0;
  const tradesByMarketStep = new Map<number, number>();

  // Validate rows before using them in frequency, volume, or fee calculations.
  const validTransactions: Transaction[] = [];

  for (const transaction of transactions) {
    const valid =
      transaction !== null &&
      typeof transaction === 'object' &&
      typeof transaction.id === 'string' &&
      typeof transaction.symbol === 'string' &&
      transaction.symbol.trim().length > 0 &&
      (transaction.side === 'BUY' || transaction.side === 'SELL') &&
      Number.isFinite(transaction.quantity) &&
      transaction.quantity > 0 &&
      Number.isFinite(transaction.price) &&
      transaction.price > 0 &&
      Number.isFinite(transaction.charges) &&
      transaction.charges >= 0 &&
      Number.isFinite(transaction.marketStep);

    if (!valid) {
      invalidTransactionCount++;
      continue;
    }

    const tradeValue = transaction.quantity * transaction.price;
    if (!Number.isFinite(tradeValue) || tradeValue <= 0) {
      invalidTransactionCount++;
      continue;
    }

    validTransactions.push(transaction);
    totalVolume += tradeValue;
    totalCharges += transaction.charges;

    tradesByMarketStep.set(
      transaction.marketStep,
      (tradesByMarketStep.get(transaction.marketStep) ?? 0) + 1
    );
  }

  const validMarketStepCount =
    Number.isFinite(totalMarketSteps) && totalMarketSteps > 0;

  const activeTradingSteps = tradesByMarketStep.size;
  const maxTradesInSingleStep = Math.max(
    0,
    ...tradesByMarketStep.values()
  );

  const tradesPerStep = validMarketStepCount
    ? validTransactions.length / totalMarketSteps
    : 0;

  const feeDragPct =
    totalVolume > 0 && Number.isFinite(totalVolume) && Number.isFinite(totalCharges)
      ? (totalCharges / totalVolume) * 100
      : 0;

  const roundedTradesPerStep = Number(tradesPerStep.toFixed(2));
  const roundedFeeDragPct = Number(feeDragPct.toFixed(2));

  // A minimum activity baseline and a valid market-step denominator are
  // required before the indicator can make a reliable assessment.
  if (
    validTransactions.length < MIN_TOTAL_TRADES ||
    !validMarketStepCount ||
    !Number.isFinite(totalVolume) ||
    !Number.isFinite(totalCharges)
  ) {
    return {
      indicator: 'OVERTRADING',
      status: 'INSUFFICIENT_DATA',
      severity: 'LOW',
      evidence: {
        totalTrades: transactions.length,
        validTrades: validTransactions.length,
        invalidTrades: invalidTransactionCount,
        totalMarketSteps: Number.isFinite(totalMarketSteps) ? totalMarketSteps : 0,
        activeTradingSteps,
        maxTradesInSingleStep,
      },
      explanation:
        'Insufficient valid trading activity or market-step information is available to evaluate trading frequency and transaction-cost impact.',
      implication:
        'More valid completed trades and a valid market-step count are needed to establish a trading-activity baseline.',
      limitations:
        'Requires at least 3 valid completed trades and a positive finite market-step count. Invalid transactions are excluded from calculations.',
      lessonId,
    };
  }

  const highAverageFrequency = tradesPerStep >= MAX_TRADES_PER_STEP;
  const clusteredTrading = maxTradesInSingleStep >= MAX_TRADES_IN_SINGLE_STEP;

  // If any transaction row is invalid, the fee numerator or volume denominator
  // may be incomplete. Do not use fee drag alone to claim overtrading.
  const feeDataComplete = invalidTransactionCount === 0;
  const highFeeDrag =
    feeDataComplete && feeDragPct >= MAX_FEE_DRAG_PCT;

  const detected =
    highAverageFrequency || clusteredTrading || highFeeDrag;

  const highSeverity =
    (highAverageFrequency && highFeeDrag) ||
    tradesPerStep >= 2.5 ||
    maxTradesInSingleStep >= 5 ||
    (feeDataComplete && feeDragPct >= 4);

  const severity = !detected
    ? 'LOW'
    : highSeverity
      ? 'HIGH'
      : 'MODERATE';

  const status = detected
    ? 'DETECTED'
    : invalidTransactionCount > 0
      ? 'INSUFFICIENT_DATA'
      : 'NOT_DETECTED';

  return {
    indicator: 'OVERTRADING',
    status,
    severity,
    evidence: {
      totalTrades: transactions.length,
      validTrades: validTransactions.length,
      invalidTrades: invalidTransactionCount,
      totalMarketSteps,
      activeTradingSteps,
      tradesPerStep: roundedTradesPerStep,
      maxTradesInSingleStep,
      totalVolume: Number(totalVolume.toFixed(2)),
      totalCharges: Number(totalCharges.toFixed(2)),
      feeDragPct: roundedFeeDragPct,
      maxTradesPerStepThreshold: MAX_TRADES_PER_STEP,
      clusteredTradesThreshold: MAX_TRADES_IN_SINGLE_STEP,
      feeDragThresholdPct: MAX_FEE_DRAG_PCT,
    },
    explanation: detected
      ? `Trading activity crossed at least one selected threshold: ${roundedTradesPerStep} trades per market step, up to ${maxTradesInSingleStep} trades in one step, and ${roundedFeeDragPct}% fee drag${feeDataComplete ? '' : ' (fee drag is not used for detection because some transaction rows are invalid)'}.`
      : status === 'INSUFFICIENT_DATA'
        ? 'The valid transactions did not cross the selected thresholds, but invalid transaction rows prevent a complete assessment.'
        : `Trading activity remained below the selected thresholds: ${roundedTradesPerStep} trades per market step, a maximum of ${maxTradesInSingleStep} trades in one step, and ${roundedFeeDragPct}% fee drag.`,
    implication: detected
      ? 'Frequent or clustered trading can increase transaction costs and make it harder to maintain a consistent investment strategy.'
      : status === 'INSUFFICIENT_DATA'
        ? 'A complete and valid transaction history is needed before trading frequency and fee impact can be assessed reliably.'
        : 'The measured trading frequency and transaction-cost impact remain below the selected overtrading thresholds.',
    limitations:
      'Uses average trades per supplied market step, the maximum trades in any one step, and transaction charges as a percentage of traded value. Thresholds are configurable heuristics; the indicator does not distinguish unnecessary trading from intentional short-term strategies.',
    lessonId,
  };
}
