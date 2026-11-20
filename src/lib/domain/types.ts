/**
 * Shared domain contracts for TILT.
 * All monetary values are integer paise (₹1 = 100 paise).
 * Keep these types stable and review them with Members 2–4 before integration.
 */

export type MoneyPaise = number;
export type Quantity = number;
export type Side = "BUY" | "SELL";

export interface Company {
  symbol: string;
  name: string;
  sector: string;
  description: string;
  initialPricePaise: MoneyPaise;
}

export interface SimulationSession {
  id: string;
  userId: string;
  scenarioId: string;
  startingCapitalPaise: MoneyPaise;
  cashBalancePaise: MoneyPaise;
  marketStep: number;
}

/** Total cost basis includes buy-side transaction charges. */
export interface Holding {
  symbol: string;
  quantity: Quantity;
  totalCostPaise: MoneyPaise;
}

export interface Transaction {
  id: string;
  sessionId: string;
  symbol: string;
  side: Side;
  quantity: Quantity;
  executionPricePaise: MoneyPaise;
  grossAmountPaise: MoneyPaise;
  chargesPaise: MoneyPaise;
  /** Negative for BUY, positive for SELL. */
  cashDeltaPaise: MoneyPaise;
  /** Zero for BUY; net realised P&L for SELL. */
  realisedPnlPaise: MoneyPaise;
  marketStep: number;
  timestamp: string;
}

export interface PricePoint {
  symbol: string;
  marketStep: number;
  pricePaise: MoneyPaise;
  timestamp: string;
}

export type MarketEvent = {
  id: string;
  scenarioId: string;
  marketStep: number;
  title: string;
  description: string;
  /** Positive values increase price; negative values decrease price. */
  effectBps: number;
} & (
  | { symbol: string; sector?: never }
  | { sector: string; symbol?: never }
);

export interface PortfolioState {
  session: SimulationSession;
  /** Keyed by stock symbol. */
  holdings: Record<string, Holding>;
  transactions: Transaction[];
}

export interface ChargePolicy {
  /** 10 basis points = 0.10%. */
  rateBps: number;
  /** Minimum fee in paise. Keep 0 unless the team agrees otherwise. */
  minimumChargePaise: MoneyPaise;
}

export interface MarketOrderCommand {
  id: string;
  symbol: string;
  side: Side;
  quantity: Quantity;
  timestamp: string;
}

export interface HoldingValuation {
  symbol: string;
  quantity: Quantity;
  currentPricePaise: MoneyPaise;
  averagePurchasePricePaise: number;
  totalCostPaise: MoneyPaise;
  marketValuePaise: MoneyPaise;
  unrealisedPnlPaise: MoneyPaise;
}

export interface PortfolioSnapshot {
  cashBalancePaise: MoneyPaise;
  investedAmountPaise: MoneyPaise;
  holdingsValuePaise: MoneyPaise;
  portfolioValuePaise: MoneyPaise;
  realisedPnlPaise: MoneyPaise;
  unrealisedPnlPaise: MoneyPaise;
  totalPnlPaise: MoneyPaise;
  returnPercent: number;
  holdings: HoldingValuation[];
  allocation: Array<{ symbol: string; marketValuePaise: MoneyPaise; weightBps: number }>;
  sectorAllocation: Array<{ sector: string; marketValuePaise: MoneyPaise; weightBps: number }>;
}
