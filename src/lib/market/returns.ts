export type MarketReturnPoint = {
  market_step: number;
  pricePaise: number;
};

/** Return the percentage move, or null when either price is invalid. */
export function calculatePercentChange(
  currentPricePaise: number,
  referencePricePaise: number,
): number | null {
  if (
    !Number.isFinite(currentPricePaise) ||
    !Number.isFinite(referencePricePaise) ||
    currentPricePaise <= 0 ||
    referencePricePaise <= 0
  ) {
    return null;
  }

  const change =
    ((currentPricePaise - referencePricePaise) / referencePricePaise) * 100;

  return Number.isFinite(change) ? change : null;
}

/**
 * Compare the current quote with exactly the immediately preceding candle.
 * Do not silently compare with an older candle when history has a gap.
 */
export function calculateLastCandleChange(
  points: readonly MarketReturnPoint[],
  currentStep: number,
  currentPricePaise: number,
  initialPricePaise: number,
): number | null {
  if (!Number.isSafeInteger(currentStep) || currentStep <= 0) {
    return null;
  }

  const previousStep = currentStep - 1;
  let previousPricePaise: number | null = null;

  if (previousStep === 0) {
    previousPricePaise = initialPricePaise;
  } else {
    for (const point of points) {
      if (
        point.market_step === previousStep &&
        Number.isSafeInteger(point.pricePaise) &&
        point.pricePaise > 0
      ) {
        previousPricePaise = point.pricePaise;
        break;
      }
    }
  }

  if (previousPricePaise === null) return null;

  return calculatePercentChange(currentPricePaise, previousPricePaise);
}

/** Return total movement against the scenario's opening price. */
export function calculateSinceStartChange(
  currentPricePaise: number,
  initialPricePaise: number,
): number | null {
  return calculatePercentChange(currentPricePaise, initialPricePaise);
}
