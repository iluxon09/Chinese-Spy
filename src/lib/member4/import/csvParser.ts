/**
 * CSV Transaction Import
 * Maps supported columns into the exact shared Transaction format.
 * Invalid rows are never silently imported.
 * Zero external dependencies — pure TypeScript parser.
 */

import type { Transaction, OrderSide } from '../types/shared';

/** Documented minimum columns the parser accepts */
export const REQUIRED_COLUMNS = [
  'date',      // or timestamp / datetime
  'symbol',
  'side',      // BUY / SELL
  'quantity',
  'price',
] as const;

export const OPTIONAL_COLUMNS = ['charges', 'note', 'id'] as const;

export interface CsvParseOptions {
  /** If true, first row is treated as header (default true) */
  header?: boolean;
  /** Custom column name mapping, e.g. { Date: 'date', Qty: 'quantity' } */
  columnMap?: Record<string, string>;
}

export interface CsvRowError {
  rowIndex: number; // 1-based data row (header = 0)
  raw: Record<string, string>;
  messages: string[];
}

export interface CsvParseResult {
  /** Successfully mapped transactions (ready for preview / confirmation) */
  valid: Transaction[];
  /** Rows that failed validation — never imported */
  invalid: CsvRowError[];
  /** Normalised header names that were recognised */
  recognisedColumns: string[];
  /** Original header names that were ignored */
  ignoredColumns: string[];
}

const SIDE_MAP: Record<string, OrderSide> = {
  buy: 'BUY',
  b: 'BUY',
  purchase: 'BUY',
  sell: 'SELL',
  s: 'SELL',
  sale: 'SELL',
};

/** Canonicalise a header cell to one of our internal field names */
function normaliseHeader(raw: string, columnMap?: Record<string, string>): string {
  const trimmed = raw.trim();
  if (columnMap && columnMap[trimmed]) {
    return columnMap[trimmed].toLowerCase();
  }
  const lower = trimmed.toLowerCase().replace(/[\s_\-]+/g, '');
  const aliases: Record<string, string> = {
    date: 'date',
    datetime: 'date',
    timestamp: 'date',
    time: 'date',
    tradedate: 'date',
    symbol: 'symbol',
    ticker: 'symbol',
    scrip: 'symbol',
    stock: 'symbol',
    side: 'side',
    type: 'side',
    action: 'side',
    transactiontype: 'side',
    quantity: 'quantity',
    qty: 'quantity',
    shares: 'quantity',
    units: 'quantity',
    price: 'price',
    rate: 'price',
    tradeprice: 'price',
    avgprice: 'price',
    charges: 'charges',
    brokerage: 'charges',
    fees: 'charges',
    cost: 'charges',
    note: 'note',
    remarks: 'note',
    comments: 'note',
    id: 'id',
    tradeid: 'id',
  };
  return aliases[lower] ?? trimmed.toLowerCase();
}

/**
 * Minimal RFC-4180 style CSV line splitter that respects double-quoted fields.
 */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

function parseNumber(value: string, field: string, messages: string[]): number | null {
  const cleaned = value.replace(/,/g, '').trim();
  if (cleaned === '') {
    messages.push(`${field} is empty`);
    return null;
  }
  const n = Number(cleaned);
  if (!Number.isFinite(n)) {
    messages.push(`${field} is not a valid number: "${value}"`);
    return null;
  }
  return n;
}

function parseSide(value: string, messages: string[]): OrderSide | null {
  const key = value.trim().toLowerCase();
  const side = SIDE_MAP[key];
  if (!side) {
    messages.push(`side must be BUY or SELL (got "${value}")`);
    return null;
  }
  return side;
}

function parseDate(value: string, messages: string[]): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    messages.push('date is empty');
    return null;
  }

  // Parse DD/MM/YYYY and DD-MM-YYYY explicitly before Date.parse so that
  // dates such as 04/05/2026 are not silently interpreted as MM/DD/YYYY.
  const dayFirst = /^(\d{1,2})([\/-])(\d{1,2})\2(\d{4})$/.exec(trimmed);
  if (dayFirst) {
    const day = Number(dayFirst[1]);
    const month = Number(dayFirst[3]);
    const year = Number(dayFirst[4]);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    const isValidCalendarDate =
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day;
    if (isValidCalendarDate) return parsed.toISOString();
    messages.push(`unrecognised date format: "${value}"`);
    return null;
  }

  // ISO timestamps and unambiguous date strings are handled by the platform parser.
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();

  messages.push(`unrecognised date format: "${value}"`);
  return null;
}

/**
 * Parse a CSV string into validated Transaction objects.
 * Invalid rows are collected separately and never returned in `valid`.
 */
export function parseTransactionCsv(
  csvText: string,
  options: CsvParseOptions = {},
): CsvParseResult {
  const useHeader = options.header !== false;
  const lines = csvText
    .replace(/^\uFEFF/, '') // strip BOM
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      valid: [],
      invalid: [{ rowIndex: 0, raw: {}, messages: ['CSV is empty'] }],
      recognisedColumns: [],
      ignoredColumns: [],
    };
  }

  let headers: string[];
  let dataStart = 0;

  if (useHeader) {
    headers = splitCsvLine(lines[0]).map((h) => normaliseHeader(h, options.columnMap));
    dataStart = 1;
  } else {
    // Assume positional order matching REQUIRED_COLUMNS + OPTIONAL
    headers = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];
  }

  const recognised = headers.filter((f) =>
    [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS].includes(f as (typeof REQUIRED_COLUMNS)[number]),
  );
  const ignored = headers.filter((f) => !recognised.includes(f) && f !== '');

  const missingRequired = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missingRequired.length > 0) {
    return {
      valid: [],
      invalid: [
        {
          rowIndex: 0,
          raw: {},
          messages: [`Missing required columns: ${missingRequired.join(', ')}`],
        },
      ],
      recognisedColumns: recognised,
      ignoredColumns: ignored,
    };
  }

  const valid: Transaction[] = [];
  const invalid: CsvRowError[] = [];

  for (let i = dataStart; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? '';
    });

    const messages: string[] = [];
    const rowIndex = i - dataStart + 1; // 1-based data row, excluding the header

    const date = parseDate(row.date ?? '', messages);
    const symbolRaw = (row.symbol ?? '').trim().toUpperCase();
    if (!symbolRaw) {
      messages.push('symbol is empty');
    }
    const side = parseSide(row.side ?? '', messages);
    const quantity = parseNumber(row.quantity ?? '', 'quantity', messages);
    const price = parseNumber(row.price ?? '', 'price', messages);

    let charges: number | undefined;
    if (row.charges !== undefined && row.charges.trim() !== '') {
      const c = parseNumber(row.charges, 'charges', messages);
      if (c !== null) {
        if (c < 0) {
          messages.push('charges cannot be negative');
        } else {
          charges = c;
        }
      }
    }

    if (quantity !== null && quantity <= 0) {
      messages.push('quantity must be positive');
    }
    if (price !== null && price <= 0) {
      messages.push('price must be positive');
    }

    if (messages.length > 0) {
      invalid.push({ rowIndex, raw: { ...row }, messages });
      continue;
    }

    const tx: Transaction = {
      id: (row.id && row.id.trim()) || `import-${rowIndex}-${symbolRaw}-${date}`,
      timestamp: date!,
      symbol: symbolRaw,
      side: side!,
      quantity: quantity!,
      price: price!,
      isImported: true,
    };
    if (charges !== undefined) {
      tx.charges = charges;
    }
    if (row.note && row.note.trim()) {
      tx.note = row.note.trim();
    }

    valid.push(tx);
  }

  return {
    valid,
    invalid,
    recognisedColumns: recognised,
    ignoredColumns: ignored,
  };
}

/**
 * Documented CSV template string for users.
 */
export function getCsvTemplate(): string {
  return [
    'date,symbol,side,quantity,price,charges,note',
    '2026-03-01,ASTE,BUY,50,120.50,15.00,First purchase',
    '2026-03-05,ASTE,SELL,20,135.00,12.00,',
  ].join('\n');
}
