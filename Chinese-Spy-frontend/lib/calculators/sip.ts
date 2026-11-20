export interface SipInput {
  monthlyContribution: number;
  annualReturnRate: number;
  years: number;
}

export interface SipResult {
  totalInvested: number;
  estimatedValue: number;
  estimatedGain: number;
  months: number;
  monthlyRate: number;
  assumptions: string[];
  disclaimer: string;
}

export interface SipValidationError {
  field: keyof SipInput | "general";
  message: string;
}

const DISCLAIMER =
  "This is an educational illustration only. Projected values assume a constant rate of return, ignore taxes, expense ratios and timing of cash-flows, and do not constitute investment advice or a guarantee of future performance.";

export function validateSipInput(input: SipInput): SipValidationError[] {
  const errors: SipValidationError[] = [];
  if (typeof input.monthlyContribution !== "number" || !Number.isFinite(input.monthlyContribution) || input.monthlyContribution <= 0) {
    errors.push({ field: "monthlyContribution", message: "Monthly contribution must be a positive number" });
  }
  if (typeof input.annualReturnRate !== "number" || !Number.isFinite(input.annualReturnRate) || input.annualReturnRate <= -1 || input.annualReturnRate > 1) {
    errors.push({ field: "annualReturnRate", message: "Annual return rate must be between -100% and 100%" });
  }
  if (typeof input.years !== "number" || !Number.isFinite(input.years) || input.years <= 0 || input.years > 100) {
    errors.push({ field: "years", message: "Years must be between 0 and 100" });
  }
  return errors;
}

export function calculateSip(input: SipInput): SipResult {
  const errors = validateSipInput(input);
  if (errors.length > 0) {
    throw new Error(`Invalid SIP input: ${errors.map((e) => e.message).join("; ")}`);
  }
  const months = Math.round(input.years * 12);
  const monthlyRate = input.annualReturnRate / 12;
  const totalInvested = input.monthlyContribution * months;
  let estimatedValue: number;
  if (Math.abs(monthlyRate) < 1e-12) {
    estimatedValue = totalInvested;
  } else {
    estimatedValue = input.monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  }
  if (!Number.isFinite(estimatedValue) || estimatedValue < 0) {
    throw new Error("Calculation produced a non-finite or negative result");
  }
  return {
    totalInvested: round2(totalInvested),
    estimatedValue: round2(estimatedValue),
    estimatedGain: round2(estimatedValue - totalInvested),
    months,
    monthlyRate,
    assumptions: [
      `Constant annual return of ${(input.annualReturnRate * 100).toFixed(2)}% compounded monthly`,
      "Contributions assumed at the end of each month",
      "No taxes, expense ratios or transaction costs included",
      "No withdrawals during the period",
    ],
    disclaimer: DISCLAIMER,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
