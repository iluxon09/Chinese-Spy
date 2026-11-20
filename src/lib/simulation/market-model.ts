import { createHash } from "node:crypto";

export type MarketMovementInput = {
  scenarioId: string;
  marketStep: number;
  sector: string;
  symbol: string;
  driftBps: number;
  marketVolatilityBps: number;
  sectorVolatilityBps: number;
  companyVolatilityBps: number;
  companyVolatilityMultiplierBps: number;
  shockProbabilityBps: number;
  shockMaxBps: number;
};

function assertIntegerRange(value: number, min: number, max: number, label: string) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new RangeError(`${label} must be an integer from ${min} to ${max}.`);
  }
}

/**
 * Return a stable bucket in [0, bucketCount). This mirrors the SQL migration's
 * first-eight-hex-digit MD5 bucket so tests can verify the database model.
 */
export function marketHashBucket(seed: string, bucketCount: number): number {
  assertIntegerRange(bucketCount, 1, 1_000_001, "bucketCount");
  const hexPrefix = createHash("md5").update(seed).digest("hex").slice(0, 8);
  return Number.parseInt(hexPrefix, 16) % bucketCount;
}

/**
 * Deterministic five-minute price movement in basis points.
 * Market, sector and company terms create realistic correlation while the
 * infrequent market-wide shock can move all companies in the same direction.
 */
export function calculateMarketMovementBps(input: MarketMovementInput): number {
  if (!input.scenarioId || !input.symbol || !input.sector) {
    throw new TypeError("scenarioId, symbol and sector are required.");
  }

  assertIntegerRange(input.marketStep, 1, Number.MAX_SAFE_INTEGER, "marketStep");
  assertIntegerRange(input.driftBps, -100, 100, "driftBps");
  assertIntegerRange(input.marketVolatilityBps, 0, 500, "marketVolatilityBps");
  assertIntegerRange(input.sectorVolatilityBps, 0, 500, "sectorVolatilityBps");
  assertIntegerRange(input.companyVolatilityBps, 0, 1000, "companyVolatilityBps");
  assertIntegerRange(input.companyVolatilityMultiplierBps, 3000, 30000, "companyVolatilityMultiplierBps");
  assertIntegerRange(input.shockProbabilityBps, 0, 10000, "shockProbabilityBps");
  assertIntegerRange(input.shockMaxBps, 0, 2000, "shockMaxBps");

  const prefix = `${input.scenarioId}:${input.marketStep}:`;
  let marketMove = input.driftBps;

  if (input.marketVolatilityBps > 0) {
    marketMove += marketHashBucket(
      `${prefix}market:all`,
      2 * input.marketVolatilityBps + 1,
    ) - input.marketVolatilityBps;
  }

  let shockMove = 0;
  if (
    input.shockProbabilityBps > 0 &&
    input.shockMaxBps > 0 &&
    marketHashBucket(`${prefix}market-shock-probability:all`, 10000) < input.shockProbabilityBps
  ) {
    const magnitude = 1 + marketHashBucket(
      `${prefix}market-shock-size:all`,
      input.shockMaxBps,
    );
    shockMove = marketHashBucket(`${prefix}market-shock-direction:all`, 2) === 0
      ? -magnitude
      : magnitude;
  }

  const sectorMove = input.sectorVolatilityBps > 0
    ? marketHashBucket(
      `${prefix}sector:${input.sector}`,
      2 * input.sectorVolatilityBps + 1,
    ) - input.sectorVolatilityBps
    : 0;

  const companyVolatilityBps = Math.round(
    input.companyVolatilityBps * input.companyVolatilityMultiplierBps / 10000,
  );
  const companyMove = companyVolatilityBps > 0
    ? marketHashBucket(
      `${prefix}company:${input.symbol}`,
      2 * companyVolatilityBps + 1,
    ) - companyVolatilityBps
    : 0;

  return Math.max(
    -2500,
    Math.min(2500, marketMove + sectorMove + companyMove + shockMove),
  );
}
