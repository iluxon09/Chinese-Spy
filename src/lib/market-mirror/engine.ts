import type {
  Company,
  HoldingValuation,
  Transaction as DomainTransaction,
} from "@/lib/domain/types";
import type {
  BehaviourReport,
  Holding,
  PricePoint,
  Transaction,
} from "./types";
import { detectPanicSelling } from "./panicSelling";
import { detectFomo } from "./fomo";
import { detectOvertrading } from "./overtrading";
import { detectConcentration } from "./concentration";

type SourceTransaction = Pick<
  DomainTransaction,
  | "id"
  | "symbol"
  | "side"
  | "quantity"
  | "executionPricePaise"
  | "chargesPaise"
  | "marketStep"
  | "timestamp"
>;

/**
 * Adapter from the live TILT API/domain contract to Member 3's
 * Market Mirror contract. API money fields are integer paise;
 * detectors intentionally operate on rupees.
 */
export type MarketHistoryBySymbol = Readonly<
  Record<
    string,
    readonly {
      symbol: string;
      market_step: number;
      pricePaise: number;
      timestamp?: string;
    }[]
  >
>;

export interface AnalysePortfolioInput {
  transactions: readonly SourceTransaction[];
  holdings: readonly HoldingValuation[];
  companies: readonly Pick<Company, "symbol" | "sector">[];
  histories: MarketHistoryBySymbol;
  currentMarketStep: number;
}

export const INDICATOR_LESSONS = {
  PANIC_SELLING: "volatility",
  FOMO: "decision_discipline",
  OVERTRADING: "transaction_costs",
  CONCENTRATION: "diversification",
} as const;

function rupeesFromPaise(value: number): number {
  return Number.isFinite(value) ? value / 100 : Number.NaN;
}

export function adaptTransactions(
  transactions: readonly SourceTransaction[],
): Transaction[] {
  return transactions.map((transaction) => ({
    id: transaction.id,
    symbol: transaction.symbol,
    side: transaction.side,
    quantity: transaction.quantity,
    price: rupeesFromPaise(transaction.executionPricePaise),
    charges: rupeesFromPaise(transaction.chargesPaise),
    marketStep: transaction.marketStep,
    timestamp: transaction.timestamp,
  }));
}

export function adaptHoldings(
  holdings: readonly HoldingValuation[],
  companies: readonly Pick<Company, "symbol" | "sector">[],
): Holding[] {
  const sectors = new Map(companies.map((company) => [company.symbol, company.sector]));
  return holdings.map((holding) => ({
    symbol: holding.symbol,
    sector: sectors.get(holding.symbol) ?? "",
    quantity: holding.quantity,
    averagePrice: rupeesFromPaise(holding.averagePurchasePricePaise),
    currentPrice: rupeesFromPaise(holding.currentPricePaise),
  }));
}

export function adaptPriceHistory(histories: MarketHistoryBySymbol): PricePoint[] {
  return Object.values(histories).flat().map((point) => ({
    symbol: point.symbol,
    marketStep: point.market_step,
    price: rupeesFromPaise(point.pricePaise),
    timestamp: point.timestamp,
  }));
}

/**
 * Analyse one authenticated user's current simulation snapshot.
 * This function is pure and does not persist or mutate trading data.
 */
export function analyzePortfolioBehaviour(
  input: AnalysePortfolioInput,
): BehaviourReport[] {
  const transactions = adaptTransactions(input.transactions);
  const holdings = adaptHoldings(input.holdings, input.companies);
  const priceHistory = adaptPriceHistory(input.histories);
  const totalMarketSteps = Number.isSafeInteger(input.currentMarketStep) &&
      input.currentMarketStep >= 0
    ? input.currentMarketStep + 1
    : 0;

  return [
    detectPanicSelling(
      transactions,
      priceHistory,
      INDICATOR_LESSONS.PANIC_SELLING,
    ),
    detectFomo(
      transactions,
      priceHistory,
      INDICATOR_LESSONS.FOMO,
    ),
    detectOvertrading(
      transactions,
      totalMarketSteps,
      INDICATOR_LESSONS.OVERTRADING,
    ),
    detectConcentration(
      holdings,
      INDICATOR_LESSONS.CONCENTRATION,
    ),
  ];
}
