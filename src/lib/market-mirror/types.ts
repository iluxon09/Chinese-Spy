export interface Transaction {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  charges: number;
  marketStep: number;
  timestamp?: string;
}

export interface Holding {
  symbol: string;
  sector: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
}

export interface PricePoint {
  symbol: string;
  marketStep: number;
  price: number;
  timestamp?: string;
}

export type IndicatorType = 'PANIC_SELLING' | 'FOMO' | 'OVERTRADING' | 'CONCENTRATION';
export type IndicatorStatus = 'DETECTED' | 'NOT_DETECTED' | 'INSUFFICIENT_DATA';
export type IndicatorSeverity = 'LOW' | 'MODERATE' | 'HIGH';

export interface BehaviourReport {
  indicator: IndicatorType;
  status: IndicatorStatus;
  severity: IndicatorSeverity;
  evidence: Record<string, number | string>;
  explanation: string;
  implication: string;
  limitations: string;
  lessonId: string;
}

export type Report = BehaviourReport;