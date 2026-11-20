/**
 * Goal-based SIP Calculator
 * Given a target corpus, horizon and assumed return, estimate the monthly SIP required.
 * Pure functions — educational only.
 */

export interface GoalInput {
  /** Target amount in INR (must be > 0) */
  targetAmount: number;
  /** Time horizon in years (must be > 0) */
  years: number;
  /** Expected annual return as a decimal, e.g. 0.10 for 10 % */
  annualReturnRate: number;
  /** Optional existing corpus that will also grow (default 0) */
  existingCorpus?: number;
}

export interface GoalResult {
  /** Required monthly contribution */
  requiredMonthlySip: number;
  /** Total amount that will be contributed via SIPs */
  totalSipInvested: number;
  /** Projected value of existing corpus at the horizon */
  projectedExistingCorpus: number;
  /** Sum of projected existing + SIP contributions’ future value (should ≈ target) */
  projectedTotal: number;
  months: number;
  monthlyRate: number;
  assumptions: string[];
  disclaimer: string;
}

export interface GoalValidationError {
  field: keyof GoalInput | 'general';
  message: string;
}

const DISCLAIMER =
  'This is an educational illustration only. The calculated SIP assumes a constant rate of return, ignores taxes and fees, and does not constitute investment advice or a guarantee that the target will be reached.';

export function validateGoalInput(input: GoalInput): GoalValidationError[] {
  const errors: GoalValidationError[] = [];

  if (typeof input.targetAmount !== 'number' || Number.isNaN(input.targetAmount)) {
    errors.push({ field: 'targetAmount', message: 'Target amount must be a number' });
  } else if (input.targetAmount <= 0) {
    errors.push({ field: 'targetAmount', message: 'Target amount must be greater than zero' });
  } else if (!Number.isFinite(input.targetAmount)) {
    errors.push({ field: 'targetAmount', message: 'Target amount must be finite' });
  }

  if (typeof input.years !== 'number' || Number.isNaN(input.years)) {
    errors.push({ field: 'years', message: 'Years must be a number' });
  } else if (input.years <= 0) {
    errors.push({ field: 'years', message: 'Time horizon must be greater than zero years' });
  } else if (input.years > 100) {
    errors.push({ field: 'years', message: 'Time horizon above 100 years is not supported' });
  } else if (!Number.isFinite(input.years)) {
    errors.push({ field: 'years', message: 'Years must be finite' });
  }

  if (typeof input.annualReturnRate !== 'number' || Number.isNaN(input.annualReturnRate)) {
    errors.push({ field: 'annualReturnRate', message: 'Annual return rate must be a number' });
  } else if (input.annualReturnRate <= -1) {
    errors.push({ field: 'annualReturnRate', message: 'Annual return rate must be greater than -100 %' });
  } else if (input.annualReturnRate > 1) {
    errors.push({ field: 'annualReturnRate', message: 'Annual return rate above 100 % is not supported in this educational calculator' });
  } else if (!Number.isFinite(input.annualReturnRate)) {
    errors.push({ field: 'annualReturnRate', message: 'Annual return rate must be finite' });
  }

  if (input.existingCorpus !== undefined) {
    if (typeof input.existingCorpus !== 'number' || Number.isNaN(input.existingCorpus)) {
      errors.push({ field: 'existingCorpus', message: 'Existing corpus must be a number' });
    } else if (input.existingCorpus < 0) {
      errors.push({ field: 'existingCorpus', message: 'Existing corpus cannot be negative' });
    } else if (!Number.isFinite(input.existingCorpus)) {
      errors.push({ field: 'existingCorpus', message: 'Existing corpus must be finite' });
    }
  }

  return errors;
}

/**
 * Required monthly payment for an ordinary annuity to reach a future value:
 * P = FV × r / [((1 + r)^n − 1)]   when r ≠ 0
 * P = FV / n                       when r = 0
 *
 * We first subtract the future value of any existing corpus from the target.
 */
export function calculateGoalSip(input: GoalInput): GoalResult {
  const errors = validateGoalInput(input);
  if (errors.length > 0) {
    throw new Error(`Invalid Goal input: ${errors.map((e) => e.message).join('; ')}`);
  }

  const existing = input.existingCorpus ?? 0;
  const months = Math.round(input.years * 12);
  const monthlyRate = input.annualReturnRate / 12;

  // Future value of existing corpus
  const projectedExisting =
    Math.abs(monthlyRate) < 1e-12
      ? existing
      : existing * Math.pow(1 + monthlyRate, months);

  const remainingTarget = input.targetAmount - projectedExisting;

  if (remainingTarget <= 0) {
    // Existing corpus alone is already enough (or more)
    return {
      requiredMonthlySip: 0,
      totalSipInvested: 0,
      projectedExistingCorpus: round2(projectedExisting),
      projectedTotal: round2(projectedExisting),
      months,
      monthlyRate,
      assumptions: [
        `Constant annual return of ${(input.annualReturnRate * 100).toFixed(2)} % compounded monthly`,
        'Existing corpus assumed to grow at the same rate with no withdrawals',
        'No taxes or expense ratios included',
      ],
      disclaimer: DISCLAIMER,
    };
  }

  let requiredMonthly: number;
  if (Math.abs(monthlyRate) < 1e-12) {
    requiredMonthly = remainingTarget / months;
  } else {
    const factor = (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
    requiredMonthly = remainingTarget / factor;
  }

  if (!Number.isFinite(requiredMonthly) || requiredMonthly < 0) {
    throw new Error('Calculation produced a non-finite or negative SIP; check inputs');
  }

  const totalSipInvested = requiredMonthly * months;
  const projectedTotal = projectedExisting + remainingTarget; // by construction ≈ target

  return {
    requiredMonthlySip: round2(requiredMonthly),
    totalSipInvested: round2(totalSipInvested),
    projectedExistingCorpus: round2(projectedExisting),
    projectedTotal: round2(projectedTotal),
    months,
    monthlyRate,
    assumptions: [
      `Constant annual return of ${(input.annualReturnRate * 100).toFixed(2)} % compounded monthly`,
      'SIP contributions assumed at the end of each month',
      'Existing corpus grows at the same assumed rate',
      'No taxes, expense ratios or transaction costs included',
    ],
    disclaimer: DISCLAIMER,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
