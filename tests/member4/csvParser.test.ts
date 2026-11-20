import { describe, it, expect } from 'vitest';
import { parseTransactionCsv, getCsvTemplate, REQUIRED_COLUMNS } from '../../src/lib/member4/import/csvParser.js';

describe('parseTransactionCsv', () => {
  it('parses a well-formed CSV into valid transactions', () => {
    const csv = [
      'date,symbol,side,quantity,price,charges,note',
      '2026-03-01,AQUA,BUY,50,120.50,15.00,First buy',
      '2026-03-05,AQUA,SELL,20,135.00,12.00,',
    ].join('\n');

    const result = parseTransactionCsv(csv);
    expect(result.invalid).toHaveLength(0);
    expect(result.valid).toHaveLength(2);

    const first = result.valid[0];
    expect(first.symbol).toBe('AQUA');
    expect(first.side).toBe('BUY');
    expect(first.quantity).toBe(50);
    expect(first.price).toBe(120.5);
    expect(first.charges).toBe(15);
    expect(first.isImported).toBe(true);
    expect(first.note).toBe('First buy');
    expect(first.timestamp).toMatch(/2026-03-01/);
  });

  it('rejects rows with missing required fields without importing them', () => {
    const csv = [
      'date,symbol,side,quantity,price',
      '2026-03-01,AQUA,BUY,,120.50', // missing quantity
      '2026-03-02,GREEN,SELL,10,90',
    ].join('\n');

    const result = parseTransactionCsv(csv);
    expect(result.valid).toHaveLength(1);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].messages.some((m) => /quantity/i.test(m))).toBe(true);
  });

  it('rejects non-positive quantity and price', () => {
    const csv = [
      'date,symbol,side,quantity,price',
      '2026-03-01,AQUA,BUY,0,120',
      '2026-03-02,AQUA,BUY,10,-5',
    ].join('\n');

    const result = parseTransactionCsv(csv);
    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(2);
  });

  it('accepts common side aliases (buy/sell/b/s)', () => {
    const csv = [
      'date,symbol,side,quantity,price',
      '2026-03-01,AQUA,buy,10,100',
      '2026-03-02,AQUA,S,5,110',
    ].join('\n');

    const result = parseTransactionCsv(csv);
    expect(result.valid).toHaveLength(2);
    expect(result.valid[0].side).toBe('BUY');
    expect(result.valid[1].side).toBe('SELL');
  });

  it('fails clearly when required columns are missing', () => {
    const csv = 'date,symbol,qty,price\n2026-01-01,AQUA,10,100';
    const result = parseTransactionCsv(csv);
    expect(result.valid).toHaveLength(0);
    expect(result.invalid[0].messages[0]).toMatch(/Missing required columns/);
  });

  it('supports custom column mapping', () => {
    const csv = [
      'Trade Date,Ticker,Action,Qty,Rate',
      '2026-04-01,MEDIX,BUY,20,210',
    ].join('\n');

    const result = parseTransactionCsv(csv, {
      columnMap: {
        'Trade Date': 'date',
        Ticker: 'symbol',
        Action: 'side',
        Qty: 'quantity',
        Rate: 'price',
      },
    });
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].symbol).toBe('MEDIX');
  });

  it('marks all imported rows with isImported: true', () => {
    const csv = getCsvTemplate();
    const result = parseTransactionCsv(csv);
    expect(result.valid.every((t) => t.isImported === true)).toBe(true);
  });

  it('exposes the documented template', () => {
    const template = getCsvTemplate();
    expect(template).toContain('date,symbol,side,quantity,price');
    const result = parseTransactionCsv(template);
    expect(result.valid.length).toBeGreaterThan(0);
  });
});

describe('REQUIRED_COLUMNS', () => {
  it('contains the documented minimum set', () => {
    expect(REQUIRED_COLUMNS).toEqual(
      expect.arrayContaining(['date', 'symbol', 'side', 'quantity', 'price']),
    );
  });
});
