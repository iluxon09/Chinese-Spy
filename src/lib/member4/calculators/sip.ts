/**
 * SIP (Systematic Investment Plan) Calculator
 * Pure functions — no side effects, fully tested.
 * Educational only; returns are not guaranteed.
 */

export interface SipInput {
  /** Monthly contribution in INR (must be > 0) */
  monthlyContribution: number;
  /** Expected annual return as a decimal, e.g. 0.12 for 12 % (must be > -1 and typically < 0.5) */
  annualReturnRate: number;
  /** Investment horizon in years (must be > 0) */
  years: number;
}

export interface SipResult {
  /** Total amount contributed = monthly × 12 × years */
  totalInvested: number;
  /** Estimated future value under the constant-rate assumption */
  estimatedValue: number;
  /** estimatedValue − totalInvested */
  estimatedGain: number;
  /** Effective number of monthly periods used */
  months: number;
  /** Monthly rate derived from annual rate */
  monthlyRate: number;
  assumptions: string[];
  disclaimer: string;
}

export interface ValidationError {
  field: keyof SipInput | 'general';
  message: string;
}

const DISCLAIMER =
  'This is an educational illustration only. Projected values assume a constant rate of return, ignore taxes, expense ratios and timing of cash-flows, and do not constitute investment advice or a guarantee of future performance.';

/**
 * Validate SIP inputs. Returns an array of errors (empty = valid).
 */
export function validateSipInput(input: SipInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof input.monthlyContribution !== 'number' || Number.isNaN(input.monthlyContribution)) {
    errors.push({ field: 'monthlyContribution', message: 'Monthly contribution must be a number' });
  } else if (input.monthlyContribution <= 0) {
    errors.push({ field: 'monthlyContribution', message: 'Monthly contribution must be greater than zero' });
  } else if (!Number.isFinite(input.monthlyContribution)) {
    errors.push({ field: 'monthlyContribution', message: 'Monthly contribution must be finite' });
  }

  if (typeof input.annualReturnRate !== 'number' || Number.isNaN(input.annualReturnRate)) {
    errors.push({ field: 'annualReturnRate', message: 'Annual return rate must be a number' });
  } else if (input.annualReturnRate <= -1) {
    errors.push({ field: 'annualReturnRate', message: 'Annual return rate must be greater than -100 %' });
  } else if (input.annualReturnRate > 1) {
    // > 100 % annual is unrealistic for the educational tool; still allow up to 100 %
    errors.push({ field: 'annualReturnRate', message: 'Annual return rate above 100 % is not supported in this educational calculator' });
  } else if (!Number.isFinite(input.annualReturnRate)) {
    errors.push({ field: 'annualReturnRate', message: 'Annual return rate must be finite' });
  }

  if (typeof input.years !== 'number' || Number.isNaN(input.years)) {
    errors.push({ field: 'years', message: 'Years must be a number' });
  } else if (input.years <= 0) {
    errors.push({ field: 'years', message: 'Investment horizon must be greater than zero years' });
  } else if (input.years > 100) {
    errors.push({ field: 'years', message: 'Investment horizon above 100 years is not supported' });
  } else if (!Number.isFinite(input.years)) {
    errors.push({ field: 'years', message: 'Years must be finite' });
  }

  return errors;
}

/**
 * Future value of an ordinary annuity (end-of-period contributions):
 * FV = P × [((1 + r)^n − 1) / r]   when r ≠ 0
 * FV = P × n                       when r = 0
 *
 * where P = monthly contribution, r = monthly rate, n = number of months.
 */
export function calculateSip(input: SipInput): SipResult {
  const errors = validateSipInput(input);
  if (errors.length > 0) {
    throw new Error(`Invalid SIP input: ${errors.map((e) => e.message).join('; ')}`);
  }

  const months = Math.round(input.years * 12);
  const monthlyRate = input.annualReturnRate / 12;
  const totalInvested = input.monthlyContribution * months;

  let estimatedValue: number;
  if (Math.abs(monthlyRate) < 1e-12) {
    // Zero or near-zero rate
    estimatedValue = totalInvested;
  } else {
    estimatedValue =
      input.monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  }

  // Guard against floating-point nonsense
  if (!Number.isFinite(estimatedValue) || estimatedValue < 0) {
    throw new Error('Calculation produced a non-finite or negative result; check inputs');
  }

  const estimatedGain = estimatedValue - totalInvested;

  return {
    totalInvested: round2(totalInvested),
    estimatedValue: round2(estimatedValue),
    estimatedGain: round2(estimatedGain),
    months,
    monthlyRate,
    assumptions: [
      `Constant annual return of ${(input.annualReturnRate * 100).toFixed(2)} % compounded monthly`,
      'Contributions assumed at the end of each month',
      'No taxes, expense ratios or transaction costs included',
      'No withdrawals during the period',
    ],
    disclaimer: DISCLAIMER,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
