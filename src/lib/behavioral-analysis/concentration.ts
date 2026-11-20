import type { Holding, BehaviourReport } from './types';

export function detectConcentration(
  holdings: Holding[],
  lessonId = 'lesson-diversification'
): BehaviourReport {
  const SINGLE_STOCK_LIMIT_PCT = 40;
  const SINGLE_SECTOR_LIMIT_PCT = 60;
  const HIGH_STOCK_LIMIT_PCT = 65;
  const HIGH_SECTOR_LIMIT_PCT = 80;

  let invalidHoldingCount = 0;
  let holdingsWithoutSector = 0;
  let totalPortfolioValue = 0;
  let sectorCoveredValue = 0;

  const stockTotals = new Map<string, number>();
  const sectorTotals = new Map<string, number>();
  const stockLabels = new Map<string, string>();
  const sectorLabels = new Map<string, string>();

  for (const holding of holdings) {
    // Zero-quantity holdings are closed positions and do not contribute
    // to current portfolio concentration.
    if (Number.isFinite(holding.quantity) && holding.quantity === 0) {
      continue;
    }

    if (
      !Number.isFinite(holding.quantity) ||
      holding.quantity < 0 ||
      !Number.isFinite(holding.currentPrice) ||
      holding.currentPrice <= 0 ||
      typeof holding.symbol !== 'string' ||
      holding.symbol.trim().length === 0
    ) {
      invalidHoldingCount++;
      continue;
    }

    const positionValue = holding.quantity * holding.currentPrice;

    if (!Number.isFinite(positionValue) || positionValue <= 0) {
      invalidHoldingCount++;
      continue;
    }

    totalPortfolioValue += positionValue;

    const normalizedSymbol = holding.symbol.trim().toUpperCase();
    stockTotals.set(
      normalizedSymbol,
      (stockTotals.get(normalizedSymbol) ?? 0) + positionValue
    );
    stockLabels.set(normalizedSymbol, holding.symbol.trim());

    const sector =
      typeof holding.sector === 'string' ? holding.sector.trim() : '';

    if (sector.length === 0) {
      holdingsWithoutSector++;
    } else {
      const normalizedSector = sector.toUpperCase();
      sectorTotals.set(
        normalizedSector,
        (sectorTotals.get(normalizedSector) ?? 0) + positionValue
      );
      sectorLabels.set(normalizedSector, sector);
      sectorCoveredValue += positionValue;
    }
  }

  if (
    totalPortfolioValue <= 0 ||
    !Number.isFinite(totalPortfolioValue) ||
    stockTotals.size === 0
  ) {
    return {
      indicator: 'CONCENTRATION',
      status: 'INSUFFICIENT_DATA',
      severity: 'LOW',
      evidence: {
        activePositions: 0,
        invalidHoldings: invalidHoldingCount,
        holdingsWithoutSector,
      },
      explanation:
        'No valid active holdings with a measurable market value were available to evaluate portfolio concentration.',
      implication:
        'Valid open holdings with positive quantities and current prices are needed to measure portfolio exposure.',
      limitations:
        'Evaluates current long positions only; excludes closed positions and does not include uninvested cash or short positions.',
      lessonId,
    };
  }

  let topStockSymbol = '';
  let topStockValue = 0;

  for (const [symbol, value] of stockTotals.entries()) {
    if (value > topStockValue) {
      topStockValue = value;
      topStockSymbol = symbol;
    }
  }

  let topSector = '';
  let topSectorValue = 0;

  for (const [sector, value] of sectorTotals.entries()) {
    if (value > topSectorValue) {
      topSectorValue = value;
      topSector = sector;
    }
  }

  // Keep full precision for threshold comparisons. Round only for reporting.
  const topStockWeightPct = (topStockValue / totalPortfolioValue) * 100;
  const topSectorWeightPct = (topSectorValue / totalPortfolioValue) * 100;
  const sectorCoveragePct =
    (sectorCoveredValue / totalPortfolioValue) * 100;

  const stockConcentrated = topStockWeightPct >= SINGLE_STOCK_LIMIT_PCT;
  const sectorConcentrated = topSectorWeightPct >= SINGLE_SECTOR_LIMIT_PCT;
  // Invalid holding rows make the portfolio denominator incomplete, so a
  // concentration result cannot be confirmed reliably in that case.
  const detected =
    invalidHoldingCount === 0 && (stockConcentrated || sectorConcentrated);

  // If any active holding has invalid data or an unknown sector, a negative
  // result cannot establish that the entire portfolio is diversified.
  const dataIncomplete =
    invalidHoldingCount > 0 || holdingsWithoutSector > 0;

  const status = detected
    ? 'DETECTED'
    : dataIncomplete
      ? 'INSUFFICIENT_DATA'
      : 'NOT_DETECTED';

  const severity = !detected
    ? 'LOW'
    : topStockWeightPct >= HIGH_STOCK_LIMIT_PCT ||
        topSectorWeightPct >= HIGH_SECTOR_LIMIT_PCT
      ? 'HIGH'
      : 'MODERATE';

  const roundedStockWeightPct = Number(topStockWeightPct.toFixed(2));
  const roundedSectorWeightPct = Number(topSectorWeightPct.toFixed(2));
  const roundedSectorCoveragePct = Number(sectorCoveragePct.toFixed(2));

  return {
    indicator: 'CONCENTRATION',
    status,
    severity,
    evidence: {
      topStockSymbol: stockLabels.get(topStockSymbol) ?? topStockSymbol,
      topStockWeightPct: roundedStockWeightPct,
      topSector: topSector
        ? sectorLabels.get(topSector) ?? topSector
        : 'UNAVAILABLE',
      topSectorWeightPct: roundedSectorWeightPct,
      sectorCoveragePct: roundedSectorCoveragePct,
      totalPortfolioValue: Number(totalPortfolioValue.toFixed(2)),
      activePositions: stockTotals.size,
      invalidHoldings: invalidHoldingCount,
      holdingsWithoutSector,
      singleStockLimitPct: SINGLE_STOCK_LIMIT_PCT,
      singleSectorLimitPct: SINGLE_SECTOR_LIMIT_PCT,
    },
    explanation: detected
      ? `Concentration detected: ${roundedStockWeightPct}% of invested value is in ${stockLabels.get(topStockSymbol) ?? topStockSymbol}${topSector ? `, and ${roundedSectorWeightPct}% is in the ${sectorLabels.get(topSector) ?? topSector} sector` : ''}.`
      : status === 'INSUFFICIENT_DATA'
        ? 'The available holdings show no threshold breach, but incomplete holding or sector data prevents a reliable portfolio-wide conclusion.'
        : `No concentration threshold was breached. The largest stock allocation is ${roundedStockWeightPct}% and the largest sector allocation is ${roundedSectorWeightPct}%.`,
    implication: detected
      ? 'A large allocation to one company or sector can make the portfolio more vulnerable to company-specific or industry-wide downturns.'
      : status === 'INSUFFICIENT_DATA'
        ? 'Complete holding and sector information is needed before diversification can be assessed reliably.'
        : 'The measured stock and sector allocations remain below the selected concentration thresholds.',
    limitations:
      'Measures current invested long-position value only; excludes uninvested cash and short positions. Sector concentration is assessed using holdings with known sector labels. Thresholds are configurable heuristics and do not measure correlations between assets.',
    lessonId,
  };
}

