export interface GoalInput {
  targetAmount: number;
  years: number;
  annualReturnRate: number;
  existingCorpus?: number;
}

export interface GoalResult {
  requiredMonthlySip: number;
  totalSipInvested: number;
  projectedExistingCorpus: number;
  projectedTotal: number;
  months: number;
  monthlyRate: number;
  assumptions: string[];
  disclaimer: string;
}

export interface GoalValidationError {
  field: keyof GoalInput | "general";
  message: string;
}

const DISCLAIMER =
  "This is an educational illustration only. The calculated SIP assumes a constant rate of return, ignores taxes and fees, and does not constitute investment advice or a guarantee that the target will be reached.";

export function validateGoalInput(input: GoalInput): GoalValidationError[] {
  const errors: GoalValidationError[] = [];
  if (typeof input.targetAmount !== "number" || !Number.isFinite(input.targetAmount) || input.targetAmount <= 0) {
    errors.push({ field: "targetAmount", message: "Target amount must be a positive number" });
  }
  if (typeof input.years !== "number" || !Number.isFinite(input.years) || input.years <= 0 || input.years > 100) {
    errors.push({ field: "years", message: "Years must be between 0 and 100" });
  }
  if (typeof input.annualReturnRate !== "number" || !Number.isFinite(input.annualReturnRate) || input.annualReturnRate <= -1 || input.annualReturnRate > 1) {
    errors.push({ field: "annualReturnRate", message: "Annual return rate must be between -100% and 100%" });
  }
  if (input.existingCorpus !== undefined) {
    if (typeof input.existingCorpus !== "number" || !Number.isFinite(input.existingCorpus) || input.existingCorpus < 0) {
      errors.push({ field: "existingCorpus", message: "Existing corpus must be a non-negative number" });
    }
  }
  return errors;
}

export function calculateGoalSip(input: GoalInput): GoalResult {
  const errors = validateGoalInput(input);
  if (errors.length > 0) {
    throw new Error(`Invalid Goal input: ${errors.map((e) => e.message).join("; ")}`);
  }
  const existing = input.existingCorpus ?? 0;
  const months = Math.round(input.years * 12);
  const monthlyRate = input.annualReturnRate / 12;
  const projectedExisting =
    Math.abs(monthlyRate) < 1e-12 ? existing : existing * Math.pow(1 + monthlyRate, months);
  const remainingTarget = input.targetAmount - projectedExisting;

  if (remainingTarget <= 0) {
    return {
      requiredMonthlySip: 0,
      totalSipInvested: 0,
      projectedExistingCorpus: round2(projectedExisting),
      projectedTotal: round2(projectedExisting),
      months,
      monthlyRate,
      assumptions: [
        `Constant annual return of ${(input.annualReturnRate * 100).toFixed(2)}% compounded monthly`,
        "Existing corpus assumed to grow at the same rate with no withdrawals",
        "No taxes or expense ratios included",
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
    throw new Error("Calculation produced a non-finite or negative SIP");
  }
  return {
    requiredMonthlySip: round2(requiredMonthly),
    totalSipInvested: round2(requiredMonthly * months),
    projectedExistingCorpus: round2(projectedExisting),
    projectedTotal: round2(projectedExisting + remainingTarget),
    months,
    monthlyRate,
    assumptions: [
      `Constant annual return of ${(input.annualReturnRate * 100).toFixed(2)}% compounded monthly`,
      "SIP contributions assumed at the end of each month",
      "Existing corpus grows at the same assumed rate",
      "No taxes, expense ratios or transaction costs included",
    ],
    disclaimer: DISCLAIMER,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
