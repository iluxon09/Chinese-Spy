import type { ChargePolicy, MoneyPaise } from "../domain/types";
import { TradingError } from "./errors";

/**
 * PROVISIONAL DEMO POLICY ONLY: 0.10% of order notional, no minimum.
 * This is not represented as the actual Indian brokerage/statutory charge schedule.
 * Replace the configuration after the team agrees on its educational fee assumptions.
 */
export const DEFAULT_CHARGE_POLICY: ChargePolicy = {
  rateBps: 10,
  minimumChargePaise: 0,
};

export function calculateCharges(
  grossAmountPaise: MoneyPaise,
  policy: ChargePolicy = DEFAULT_CHARGE_POLICY,
): MoneyPaise {
  if (!Number.isSafeInteger(grossAmountPaise) || grossAmountPaise < 0) {
    throw new TradingError("INVALID_AMOUNT", "Gross amount must be a non-negative safe integer in paise.");
  }
  if (
    !Number.isSafeInteger(policy.rateBps) ||
    policy.rateBps < 0 ||
    !Number.isSafeInteger(policy.minimumChargePaise) ||
    policy.minimumChargePaise < 0
  ) {
    throw new TradingError("INVALID_CHARGE_POLICY", "Charge policy values must be non-negative safe integers.");
  }

  // BigInt prevents intermediate multiplication from exceeding Number's safe range.
  const numerator = BigInt(grossAmountPaise) * BigInt(policy.rateBps);
  const percentageCharge = Number((numerator + 9_999n) / 10_000n); // round up to 1 paise
  const charge = Math.max(percentageCharge, policy.minimumChargePaise);

  if (!Number.isSafeInteger(charge) || charge > grossAmountPaise) {
    throw new TradingError("INVALID_CHARGE_POLICY", "Calculated charges cannot exceed the order's gross value.");
  }

  return charge;
}
