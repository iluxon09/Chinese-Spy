import { describe, test, expect } from 'vitest';
import { analyzeBehaviour, detectFomo, detectPanicSelling, detectOvertrading, detectConcentration } from './index';
import type { Transaction, Holding, PricePoint } from './types';

describe('Market Mirror - Complete Behavioural Engine', () => {
  test('detects all four indicators for a risky trading profile', () => {
    const prices: PricePoint[] = [
      { symbol: 'TECHX', marketStep: 1, price: 1000 },
      { symbol: 'TECHX', marketStep: 2, price: 980 },
      { symbol: 'TECHX', marketStep: 3, price: 950 },
      { symbol: 'AERO', marketStep: 1, price: 500 },
      { symbol: 'AERO', marketStep: 2, price: 520 },
      { symbol: 'AERO', marketStep: 3, price: 550 },
      { symbol: 'AERO', marketStep: 4, price: 600 },
    ];
    const txs: Transaction[] = [
      { id: '1', symbol: 'TECHX', side: 'BUY', quantity: 10, price: 1000, charges: 250, marketStep: 1 },
      { id: '2', symbol: 'TECHX', side: 'SELL', quantity: 10, price: 880, charges: 250, marketStep: 4 },
      { id: '3', symbol: 'AERO', side: 'BUY', quantity: 10, price: 600, charges: 250, marketStep: 4 },
      { id: '4', symbol: 'AERO', side: 'BUY', quantity: 10, price: 650, charges: 250, marketStep: 5 },
      { id: '5', symbol: 'FINB', side: 'BUY', quantity: 5, price: 400, charges: 150, marketStep: 5 },
    ];
    const holdings: Holding[] = [
      { symbol: 'AERO', sector: 'Industrials', quantity: 20, averagePrice: 625, currentPrice: 650 },
      { symbol: 'FINB', sector: 'Finance', quantity: 5, averagePrice: 400, currentPrice: 400 },
    ];

    const reports = analyzeBehaviour(txs, holdings, prices, 5);
    expect(reports).toHaveLength(4);
    expect(reports.map((r) => r.indicator)).toEqual([
      'PANIC_SELLING', 'FOMO', 'OVERTRADING', 'CONCENTRATION',
    ]);
    expect(reports.every((r) => r.status === 'DETECTED')).toBe(true);
    expect(reports.every((r) => r.severity !== 'LOW')).toBe(true);
    expect(reports.find((r) => r.indicator === 'FOMO')?.evidence.fomoBuyCount).toBe(2);
    expect(reports.find((r) => r.indicator === 'PANIC_SELLING')?.evidence.panicSellCount).toBe(1);
  });

  test('returns NOT_DETECTED for an evaluable, diversified trading profile', () => {
    const prices: PricePoint[] = [
      { symbol: 'TECHX', marketStep: 1, price: 1000 },
      { symbol: 'TECHX', marketStep: 2, price: 1005 },
      { symbol: 'TECHX', marketStep: 3, price: 1008 },
      { symbol: 'TECHX', marketStep: 4, price: 1010 },
      { symbol: 'TECHX', marketStep: 5, price: 1015 },
      { symbol: 'FINB', marketStep: 2, price: 500 },
      { symbol: 'FINB', marketStep: 3, price: 501 },
      { symbol: 'FINB', marketStep: 4, price: 503 },
    ];
    const txs: Transaction[] = [
      { id: '1', symbol: 'TECHX', side: 'BUY', quantity: 5, price: 1010, charges: 10, marketStep: 4 },
      { id: '2', symbol: 'FINB', side: 'BUY', quantity: 10, price: 505, charges: 10, marketStep: 5 },
      { id: '3', symbol: 'TECHX', side: 'SELL', quantity: 1, price: 1020, charges: 10, marketStep: 6 },
      { id: '4', symbol: 'HLTH', side: 'BUY', quantity: 6, price: 800, charges: 10, marketStep: 7 },
    ];
    const holdings: Holding[] = [
      { symbol: 'TECHX', sector: 'Technology', quantity: 4, averagePrice: 1010, currentPrice: 1020 },
      { symbol: 'FINB', sector: 'Finance', quantity: 10, averagePrice: 505, currentPrice: 510 },
      { symbol: 'HLTH', sector: 'Healthcare', quantity: 6, averagePrice: 800, currentPrice: 810 },
    ];

    const reports = analyzeBehaviour(txs, holdings, prices, 8);
    expect(reports).toHaveLength(4);
    expect(reports.every((r) => r.status === 'NOT_DETECTED')).toBe(true);
    expect(reports.every((r) => r.severity === 'LOW')).toBe(true);
    expect(reports.find((r) => r.indicator === 'FOMO')?.evidence.evaluatedBuyOrders).toBe(2);
    expect(reports.find((r) => r.indicator === 'PANIC_SELLING')?.evidence.evaluatedSellOrders).toBe(1);
  });

  test('returns INSUFFICIENT_DATA for empty inputs', () => {
    const reports = analyzeBehaviour([], [], [], 0);
    expect(reports).toHaveLength(4);
    expect(reports.every((r) => r.status === 'INSUFFICIENT_DATA')).toBe(true);
  });

  test('FOMO requires two evaluable buys and two qualifying rallies', () => {
    const prices: PricePoint[] = [
      { symbol: 'AERO', marketStep: 1, price: 100 },
      { symbol: 'AERO', marketStep: 2, price: 105 },
      { symbol: 'AERO', marketStep: 3, price: 110 },
      { symbol: 'AERO', marketStep: 4, price: 120 },
    ];
    const txs: Transaction[] = [
      { id: '1', symbol: 'AERO', side: 'BUY', quantity: 1, price: 120, charges: 1, marketStep: 4 },
      { id: '2', symbol: 'AERO', side: 'BUY', quantity: 1, price: 125, charges: 1, marketStep: 5 },
      { id: '3', symbol: 'AERO', side: 'SELL', quantity: 1, price: 125, charges: 1, marketStep: 5 },
    ];
    expect(detectFomo(txs, prices).status).toBe('DETECTED');
    expect(detectFomo(txs.slice(0, 1), prices).status).toBe('INSUFFICIENT_DATA');
    const onlyOneQualifying: Transaction[] = [
      txs[0],
      { ...txs[1], price: 110 },
      txs[2],
    ];
    expect(detectFomo(onlyOneQualifying, prices).status).toBe('NOT_DETECTED');
  });

  test('panic-selling requires historical observations before the sell step', () => {
    const txs: Transaction[] = [
      { id: '1', symbol: 'TECHX', side: 'BUY', quantity: 1, price: 100, charges: 1, marketStep: 1 },
      { id: '2', symbol: 'TECHX', side: 'BUY', quantity: 1, price: 98, charges: 1, marketStep: 2 },
      { id: '3', symbol: 'TECHX', side: 'SELL', quantity: 1, price: 90, charges: 1, marketStep: 4 },
    ];
    const insufficientPrices: PricePoint[] = [
      { symbol: 'TECHX', marketStep: 3, price: 100 },
      { symbol: 'TECHX', marketStep: 4, price: 120 },
    ];
    expect(detectPanicSelling(txs, insufficientPrices).status).toBe('INSUFFICIENT_DATA');
    expect(detectPanicSelling(txs, [
      { symbol: 'TECHX', marketStep: 2, price: 100 },
      { symbol: 'TECHX', marketStep: 3, price: 98 },
    ]).status).toBe('DETECTED');
  });

  test('overtrading detects clustered trades and rejects insufficient history', () => {
    const txs: Transaction[] = [1, 2, 3].map((n) => ({
      id: String(n), symbol: 'TECHX', side: 'BUY' as const,
      quantity: 1, price: 100, charges: 0, marketStep: 2,
    }));
    const report = detectOvertrading(txs, 100);
    expect(report.status).toBe('DETECTED');
    expect(report.evidence.maxTradesInSingleStep).toBe(3);
    expect(detectOvertrading(txs, 0).status).toBe('INSUFFICIENT_DATA');
  });

  test('concentration aggregates duplicate symbols', () => {
    const holdings: Holding[] = [
      { symbol: 'AERO', sector: 'Industrials', quantity: 2, averagePrice: 100, currentPrice: 100 },
      { symbol: 'aero', sector: 'Industrials', quantity: 2, averagePrice: 100, currentPrice: 100 },
      { symbol: 'FINB', sector: 'Finance', quantity: 6, averagePrice: 100, currentPrice: 100 },
    ];
    const report = detectConcentration(holdings);
    expect(report.status).toBe('DETECTED');
  });
});
