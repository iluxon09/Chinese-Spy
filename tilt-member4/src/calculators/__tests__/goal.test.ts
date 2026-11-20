import { describe, it, expect } from 'vitest';
import { calculateGoalSip, validateGoalInput } from '../goal.js';

describe('validateGoalInput', () => {
  it('accepts valid inputs', () => {
    const errors = validateGoalInput({
      targetAmount: 5_000_000,
      years: 15,
      annualReturnRate: 0.1,
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects non-positive target', () => {
    expect(validateGoalInput({ targetAmount: 0, years: 10, annualReturnRate: 0.1 })).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'targetAmount' })]),
    );
  });

  it('rejects negative existing corpus', () => {
    expect(
      validateGoalInput({
        targetAmount: 1_000_000,
        years: 10,
        annualReturnRate: 0.1,
        existingCorpus: -100,
      }),
    ).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'existingCorpus' })]));
  });
});

describe('calculateGoalSip', () => {
  it('throws on invalid input', () => {
    expect(() =>
      calculateGoalSip({ targetAmount: -1, years: 10, annualReturnRate: 0.1 }),
    ).toThrow(/Invalid Goal input/);
  });

  it('returns zero SIP when existing corpus already covers target', () => {
    const result = calculateGoalSip({
      targetAmount: 100_000,
      years: 5,
      annualReturnRate: 0.1,
      existingCorpus: 200_000,
    });
    expect(result.requiredMonthlySip).toBe(0);
    expect(result.projectedExistingCorpus).toBeGreaterThan(100_000);
  });

  it('handles zero return rate', () => {
    const result = calculateGoalSip({
      targetAmount: 120_000,
      years: 2,
      annualReturnRate: 0,
    });
    // 24 months → 120000 / 24 = 5000
    expect(result.requiredMonthlySip).toBe(5000);
    expect(result.totalSipInvested).toBe(120_000);
  });

  it('computes a sensible monthly SIP for a typical goal', () => {
    const result = calculateGoalSip({
      targetAmount: 1_000_000,
      years: 10,
      annualReturnRate: 0.12,
    });
    expect(result.requiredMonthlySip).toBeGreaterThan(0);
    expect(result.requiredMonthlySip).toBeLessThan(1_000_000 / 12); // less than lump-sum monthly
    // Cross-check: feeding the SIP back into calculateSip should approximate the target
    // (we import calculateSip only for the cross-check idea; keep test self-contained)
    expect(result.projectedTotal).toBeCloseTo(1_000_000, -2);
  });

  it('accounts for existing corpus correctly', () => {
    const without = calculateGoalSip({
      targetAmount: 2_000_000,
      years: 10,
      annualReturnRate: 0.1,
    });
    const withExisting = calculateGoalSip({
      targetAmount: 2_000_000,
      years: 10,
      annualReturnRate: 0.1,
      existingCorpus: 300_000,
    });
    expect(withExisting.requiredMonthlySip).toBeLessThan(without.requiredMonthlySip);
  });

  it('includes disclaimer', () => {
    const result = calculateGoalSip({
      targetAmount: 500_000,
      years: 5,
      annualReturnRate: 0.08,
    });
    expect(result.disclaimer).toMatch(/educational/i);
  });
});
