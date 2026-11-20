import type { ImportedTrade, Side } from "../domain/types";

export const REQUIRED_COLUMNS = ["date", "symbol", "side", "quantity", "price"] as const;
export const OPTIONAL_COLUMNS = ["charges", "note", "id"] as const;

export interface CsvParseOptions {
  header?: boolean;
  columnMap?: Record<string, string>;
  /** Default true: price/charges columns are rupees → converted to paise. */
  priceInRupees?: boolean;
}

export interface CsvRowError {
  rowIndex: number;
  raw: Record<string, string>;
  messages: string[];
}

export interface CsvParseResult {
  valid: ImportedTrade[];
  invalid: CsvRowError[];
  recognisedColumns: string[];
  ignoredColumns: string[];
}

const SIDE_MAP: Record<string, Side> = {
  buy: "BUY", b: "BUY", purchase: "BUY",
  sell: "SELL", s: "SELL", sale: "SELL",
};

function normaliseHeader(raw: string, columnMap?: Record<string, string>): string {
  const trimmed = raw.trim();
  if (columnMap?.[trimmed]) return columnMap[trimmed].toLowerCase();
  const lower = trimmed.toLowerCase().replace(/[\s_\-]+/g, "");
  const aliases: Record<string, string> = {
    date: "date", datetime: "date", timestamp: "date", time: "date", tradedate: "date",
    symbol: "symbol", ticker: "symbol", scrip: "symbol", stock: "symbol",
    side: "side", type: "side", action: "side", transactiontype: "side",
    quantity: "quantity", qty: "quantity", shares: "quantity", units: "quantity",
    price: "price", rate: "price", tradeprice: "price", avgprice: "price",
    charges: "charges", brokerage: "charges", fees: "charges", cost: "charges",
    note: "note", remarks: "note", comments: "note",
    id: "id", tradeid: "id",
  };
  return aliases[lower] ?? trimmed.toLowerCase();
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = false;
      } else current += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { result.push(current); current = ""; }
    else current += ch;
  }
  result.push(current);
  return result;
}

function parseNumber(value: string, field: string, messages: string[]): number | null {
  const cleaned = value.replace(/,/g, "").trim();
  if (cleaned === "") { messages.push(`${field} is empty`); return null; }
  const n = Number(cleaned);
  if (!Number.isFinite(n)) { messages.push(`${field} is not a valid number: "${value}"`); return null; }
  return n;
}

function parseSide(value: string, messages: string[]): Side | null {
  const side = SIDE_MAP[value.trim().toLowerCase()];
  if (!side) { messages.push(`side must be BUY or SELL (got "${value}")`); return null; }
  return side;
}

function parseDate(value: string, messages: string[]): string | null {
  const trimmed = value.trim();
  if (!trimmed) { messages.push("date is empty"); return null; }
  const d = new Date(trimmed);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  const m = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const d2 = new Date(Date.UTC(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10)));
    if (!Number.isNaN(d2.getTime())) return d2.toISOString();
  }
  messages.push(`unrecognised date format: "${value}"`);
  return null;
}

function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function parseTransactionCsv(csvText: string, options: CsvParseOptions = {}): CsvParseResult {
  const useHeader = options.header !== false;
  const priceInRupees = options.priceInRupees !== false;
  const lines = csvText.replace(/^\uFEFF/, "").split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { valid: [], invalid: [{ rowIndex: 0, raw: {}, messages: ["CSV is empty"] }], recognisedColumns: [], ignoredColumns: [] };
  }

  let headers: string[];
  let dataStart = 0;
  if (useHeader) {
    headers = splitCsvLine(lines[0]).map((h) => normaliseHeader(h, options.columnMap));
    dataStart = 1;
  } else {
    headers = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];
  }

  const recognised = headers.filter((f) => [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS].includes(f as (typeof REQUIRED_COLUMNS)[number]));
  const ignored = headers.filter((f) => !recognised.includes(f) && f !== "");
  const missingRequired = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missingRequired.length > 0) {
    return {
      valid: [],
      invalid: [{ rowIndex: 0, raw: {}, messages: [`Missing required columns: ${missingRequired.join(", ")}`] }],
      recognisedColumns: recognised,
      ignoredColumns: ignored,
    };
  }

  const valid: ImportedTrade[] = [];
  const invalid: CsvRowError[] = [];

  for (let i = dataStart; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = cells[idx] ?? ""; });
    const messages: string[] = [];
    const rowIndex = i;

    const date = parseDate(row.date ?? "", messages);
    const symbolRaw = (row.symbol ?? "").trim().toUpperCase();
    if (!symbolRaw) messages.push("symbol is empty");
    const side = parseSide(row.side ?? "", messages);
    const quantity = parseNumber(row.quantity ?? "", "quantity", messages);
    const priceRaw = parseNumber(row.price ?? "", "price", messages);

    let chargesPaise: number | undefined;
    if (row.charges !== undefined && row.charges.trim() !== "") {
      const c = parseNumber(row.charges, "charges", messages);
      if (c !== null) {
        if (c < 0) messages.push("charges cannot be negative");
        else chargesPaise = priceInRupees ? rupeesToPaise(c) : Math.round(c);
      }
    }
    if (quantity !== null && quantity <= 0) messages.push("quantity must be positive");
    if (priceRaw !== null && priceRaw <= 0) messages.push("price must be positive");

    if (messages.length > 0) {
      invalid.push({ rowIndex, raw: { ...row }, messages });
      continue;
    }

    const executionPricePaise = priceInRupees ? rupeesToPaise(priceRaw!) : Math.round(priceRaw!);
    if (!Number.isSafeInteger(executionPricePaise) || executionPricePaise <= 0) {
      invalid.push({ rowIndex, raw: { ...row }, messages: ["price could not be converted to valid positive paise"] });
      continue;
    }

    const trade: ImportedTrade = {
      id: (row.id && row.id.trim()) || `import-${rowIndex}-${symbolRaw}-${Date.now()}`,
      timestamp: date!,
      symbol: symbolRaw,
      side: side!,
      quantity: quantity!,
      executionPricePaise,
      isImported: true,
    };
    if (chargesPaise !== undefined) trade.chargesPaise = chargesPaise;
    if (row.note?.trim()) trade.note = row.note.trim();
    valid.push(trade);
  }

  return { valid, invalid, recognisedColumns: recognised, ignoredColumns: ignored };
}

export function getCsvTemplate(): string {
  return [
    "date,symbol,side,quantity,price,charges,note",
    "2026-03-01,ASTE,BUY,50,100.00,15.00,First purchase",
    "2026-03-05,ASTE,SELL,20,108.00,12.00,",
  ].join("\n");
}

/** Format paise as Indian-rupee string for UI. */
export function formatPaiseAsRupees(paise: number): string {
  return "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
