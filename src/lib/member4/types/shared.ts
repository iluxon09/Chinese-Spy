/**
 * TILT Shared Types
 * Agreed contracts for Member 1–4 integration.
 * Do not invent parallel frontend schemas.
 */

/** Buy or Sell side of a trade */
export type OrderSide = 'BUY' | 'SELL';

/**
 * Shared rupee-denominated transaction shape for educational simulator modules.
 */
export interface Transaction {
  /** Unique id (uuid or deterministic string) */
  id: string;
  /** ISO 8601 datetime or simulation timestamp */
  timestamp: string;
  /** Company symbol, uppercase (e.g. "AQUA") */
  symbol: string;
  side: OrderSide;
  quantity: number;
  /** Price per unit at which the order filled */
  price: number;
  /** Optional brokerage / STT / other charges for this leg */
  charges?: number;
  /** Market step when this trade occurred (simulator clock) */
  marketStep?: number;
  /** Optional free-text note */
  note?: string;
}

export interface Holding {
  symbol: string;
  quantity: number;
  /** Volume-weighted average purchase price */
  averagePrice: number;
  /** Current mark-to-market price */
  currentPrice: number;
  /** Unrealised P&L = (currentPrice - averagePrice) * quantity */
  unrealisedPnL: number;
}

export interface PricePoint {
  symbol: string;
  marketStep: number;
  /** ISO or simulation time */
  timestamp: string;
  price: number;
  /** Optional volume for the step */
  volume?: number;
}

/** Behaviour pattern keys used by Behavioral Analysis */
export type IndicatorId =
  | 'fomo'
  | 'overtrading'
  | 'concentration'
  | 'panic_selling';

export type IndicatorStatus = 'detected' | 'not_detected' | 'insufficient_data';

/**
 * Report object returned by Behaviour Engine (Member 3).
 * Member 4 lesson IDs must match the recommendation.lessonId values.
 */
export interface BehaviourReport {
  indicator: IndicatorId;
  status: IndicatorStatus;
  /** Numerical evidence that supports the status */
  evidence: Record<string, number | string | boolean>;
  explanation: string;
  potentialImplication: string;
  confidence?: number;
  limitations?: string;
  /** Maps to a Finance Academy lesson id */
  recommendation: {
    lessonId: string;
    title: string;
  };
}

/** Stable lesson identifiers used across Academy and Market Mirror */
export type LessonId =
  | 'volatility'
  | 'diversification'
  | 'transaction_costs'
  | 'risk_management'
  | 'decision_discipline';

export interface LessonQuiz {
  question: string;
  options: string[];
  /** Zero-based index of the correct option */
  correctIndex: number;
  explanation: string;
}

export interface Lesson {
  id: LessonId;
  title: string;
  /** Short one-line summary for cards */
  summary: string;
  explanation: string;
  practicalExample: string;
  keyTakeaway: string;
  quiz?: LessonQuiz;
  /** Which Behavioral Analysis patterns recommend this lesson */
  relatedIndicators: IndicatorId[];
  /** Estimated reading time in minutes */
  estimatedMinutes: number;
}

/** Fictional company used by the simulator */
export interface FictionalCompany {
  symbol: string;
  name: string;
  sector: string;
  description: string;
  initialPrice: number;
}

/** Scripted market event definition */
export interface MarketEvent {
  id: string;
  /** Market step at which the event fires */
  marketStep: number;
  headline: string;
  narrative: string;
  /** Symbols affected and the multiplicative price impact (e.g. 0.92 = -8 %) */
  impacts: Array<{ symbol: string; priceMultiplier: number }>;
}

/** Starting state + action sequence for a reproducible demo */
export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  /** Which indicator this scenario is designed to trigger */
  targetIndicator: IndicatorId;
  startingCash: number;
  startingHoldings: Array<{ symbol: string; quantity: number; averagePrice: number }>;
  /** Ordered list of trades the demo user places */
  actions: Array<{
    marketStep: number;
    side: OrderSide;
    symbol: string;
    quantity: number;
    /** Optional explicit fill price; otherwise use market price at that step */
    price?: number;
  }>;
  /** Event IDs that fire during this scenario */
  eventIds: string[];
  /** Expected Behavioral Analysis outcome after the scenario */
  expectedReport: {
    indicator: IndicatorId;
    status: IndicatorStatus;
    lessonId: LessonId;
  };
}
