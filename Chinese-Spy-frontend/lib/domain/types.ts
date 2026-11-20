/** Shared Member 4 contracts used by Academy, calculators and CSV import. */

export type Side = "BUY" | "SELL";

export type IndicatorId =
  | "fomo"
  | "overtrading"
  | "concentration"
  | "panic_selling";

export type LessonId =
  | "volatility"
  | "diversification"
  | "transaction_costs"
  | "risk_management"
  | "decision_discipline";

export interface LessonQuiz {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Lesson {
  id: LessonId;
  title: string;
  summary: string;
  category: string;
  level: "Beginner" | "Intermediate";
  explanation: string;
  practicalExample: string;
  keyTakeaway: string;
  quiz?: LessonQuiz;
  relatedIndicators: IndicatorId[];
  estimatedMinutes: number;
  topics: string[];
}

export interface ImportedTrade {
  id: string;
  timestamp: string;
  symbol: string;
  side: Side;
  quantity: number;
  /** Execution price in paise (₹1 = 100 paise). */
  executionPricePaise: number;
  chargesPaise?: number;
  note?: string;
  isImported: true;
}
