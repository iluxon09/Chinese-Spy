import { describe, it, expect } from 'vitest';
import { calculateSip, validateSipInput } from '../sip.js';

describe('validateSipInput', () => {
  it('accepts valid inputs', () => {
    const errors = validateSipInput({
      monthlyContribution: 5000,
      annualReturnRate: 0.12,
      years: 10,
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects zero or negative contribution', () => {
    expect(validateSipInput({ monthlyContribution: 0, annualReturnRate: 0.1, years: 5 })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'monthlyContribution' }),
      ]),
    );
    expect(validateSipInput({ monthlyContribution: -100, annualReturnRate: 0.1, years: 5 })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'monthlyContribution' }),
      ]),
    );
  });

  it('rejects return rate <= -100 %', () => {
    expect(validateSipInput({ monthlyContribution: 1000, annualReturnRate: -1, years: 5 })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'annualReturnRate' }),
      ]),
    );
  });

  it('rejects years <= 0 or > 100', () => {
    expect(validateSipInput({ monthlyContribution: 1000, annualReturnRate: 0.1, years: 0 })).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'years' })]),
    );
    expect(validateSipInput({ monthlyContribution: 1000, annualReturnRate: 0.1, years: 101 })).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'years' })]),
    );
  });

  it('rejects NaN / non-finite', () => {
    expect(validateSipInput({ monthlyContribution: NaN, annualReturnRate: 0.1, years: 5 })).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'monthlyContribution' })]),
    );
  });
});

describe('calculateSip', () => {
  it('throws on invalid input', () => {
    expect(() =>
      calculateSip({ monthlyContribution: -1, annualReturnRate: 0.1, years: 5 }),
    ).toThrow(/Invalid SIP input/);
  });

  it('handles zero return rate (simple sum)', () => {
    const result = calculateSip({
      monthlyContribution: 1000,
      annualReturnRate: 0,
      years: 2,
    });
    expect(result.months).toBe(24);
    expect(result.totalInvested).toBe(24_000);
    expect(result.estimatedValue).toBe(24_000);
    expect(result.estimatedGain).toBe(0);
  });

  it('computes positive gain for positive return', () => {
    const result = calculateSip({
      monthlyContribution: 10_000,
      annualReturnRate: 0.12,
      years: 10,
    });
    // FV of annuity: 10000 * ((1.01)^120 - 1) / 0.01 ≈ 2,300,387
    expect(result.months).toBe(120);
    expect(result.totalInvested).toBe(1_200_000);
    expect(result.estimatedValue).toBeGreaterThan(result.totalInvested);
    expect(result.estimatedGain).toBeGreaterThan(0);
    // Known reference value (approx)
    expect(result.estimatedValue).toBeCloseTo(2_300_387.3, -1);
  });

  it('includes assumptions and disclaimer', () => {
    const result = calculateSip({
      monthlyContribution: 5000,
      annualReturnRate: 0.1,
      years: 5,
    });
    expect(result.assumptions.length).toBeGreaterThan(0);
    expect(result.disclaimer).toMatch(/educational/i);
  });

  it('rounds monetary values to 2 decimal places', () => {
    const result = calculateSip({
      monthlyContribution: 3333.33,
      annualReturnRate: 0.08,
      years: 3,
    });
    expect(result.totalInvested).toBe(Math.round(result.totalInvested * 100) / 100);
    expect(result.estimatedValue).toBe(Math.round(result.estimatedValue * 100) / 100);
  });
});
