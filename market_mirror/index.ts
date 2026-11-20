import { Transaction, Holding, PricePoint, BehaviourReport } from './types';
import { detectPanicSelling } from './panicSelling';
import { detectFomo } from './fomo';
import { detectOvertrading } from './overtrading';
import { detectConcentration } from './concentration';

export * from './types';
export { detectPanicSelling, detectFomo, detectOvertrading, detectConcentration };

export function analyzeBehaviour(
  transactions: Transaction[],
  holdings: Holding[],
  priceHistory: PricePoint[],
  totalMarketSteps: number
): BehaviourReport[] {
  return [
    detectPanicSelling(transactions, priceHistory),
    detectFomo(transactions, priceHistory),
    detectOvertrading(transactions, totalMarketSteps),
    detectConcentration(holdings),
  ];
}