/**
 * Finance Academy — 5 concise lessons with stable IDs.
 * Lesson IDs must stay in sync with Member 3 recommendation.lessonId values.
 */

import type { Lesson, LessonId, IndicatorId } from '../types/shared.js';

export const LESSONS: readonly Lesson[] = [
  {
    id: 'volatility',
    title: 'Understanding Market Volatility',
    summary: 'Why prices swing and how to avoid panic-selling.',
    explanation:
      'Volatility measures how much and how quickly prices move. A 5–10 % drop in a single day feels dramatic, yet historically Indian equity indices have recovered from far larger declines. Panic-selling locks in losses and removes the chance to participate in the recovery. The goal is not to predict every swing but to decide in advance how much short-term pain you can tolerate.',
    practicalExample:
      'Riya held a fictional tech stock that fell 12 % after a negative news event. She sold everything at the bottom. Two simulation steps later the stock recovered most of the loss. Had she sized the position so a 15 % draw-down was tolerable, she could have held through the noise.',
    keyTakeaway:
      'Decide your maximum acceptable loss *before* you buy. Volatility is the price of long-term equity returns; panic is optional.',
    quiz: {
      question: 'A stock you own drops 9 % in one day on broad market news. What is the most process-oriented response?',
      options: [
        'Sell immediately to stop further losses',
        'Double the position to average down',
        'Check whether the drop exceeds your pre-defined risk limit and only act if it does',
        'Ignore the portfolio completely for a month',
      ],
      correctIndex: 2,
      explanation:
        'Pre-defined risk limits turn emotional reactions into rule-based decisions. Blind selling or doubling often amplifies the original bias.',
    },
    relatedIndicators: ['panic_selling'],
    estimatedMinutes: 4,
  },
  {
    id: 'diversification',
    title: 'Why Diversification Matters',
    summary: 'Concentration risk and how to spread exposure across sectors.',
    explanation:
      'Putting most of your capital into one or two stocks (or one sector) means a single company-specific event can wipe out months of gains. Diversification does not eliminate risk, but it reduces the impact of any one failure. For a starter portfolio the practical rule is: no single stock above 15–20 % of total equity, and exposure across at least 3–4 different sectors.',
    practicalExample:
      'In the simulator a user allocated 70 % of capital to a single banking stock. When a regulatory event hit that bank, portfolio value fell 18 %. The same capital split across four sectors limited the hit to under 6 %.',
    keyTakeaway:
      'Diversification is the only free lunch in investing. Concentration may feel bold; it is usually just undiversified risk.',
    quiz: {
      question: 'Which portfolio shows the highest concentration risk?',
      options: [
        'Equal weight across 8 stocks in 5 sectors',
        '60 % in one pharmaceutical stock, rest in index funds',
        'Four stocks each at 25 %, different sectors',
        'A pure Nifty 50 index fund',
      ],
      correctIndex: 1,
      explanation:
        'A single 60 % position dominates the outcome of the whole portfolio. Even a “good” stock can suffer company-specific shocks.',
    },
    relatedIndicators: ['concentration'],
    estimatedMinutes: 4,
  },
  {
    id: 'transaction_costs',
    title: 'The Hidden Cost of Overtrading',
    summary: 'Brokerage, taxes and how frequent trading erodes returns.',
    explanation:
      'Every trade carries explicit costs (brokerage, STT, exchange fees, GST) and implicit costs (bid-ask spread, market impact). SEBI data shows that costs alone push a large share of retail F&O traders from break-even into loss. High turnover also correlates with emotional decision-making. The simplest defence is a trading-frequency budget: decide in advance how many discretionary trades you allow per month.',
    practicalExample:
      'A simulator user placed 18 round-trips in two weeks. After charges the net P&L was −₹4,200 even though the gross price moves were almost flat. Reducing to 3–4 intentional trades cut the cost drag by more than 70 %.',
    keyTakeaway:
      'Turnover is not a virtue. Measure net P&L after *all* charges; if activity is not adding edge, reduce it.',
    quiz: {
      question: 'Why can two traders with identical entry and exit prices end up with different net results?',
      options: [
        'Luck',
        'Different brokerage plans and frequency of trading (charges compound)',
        'One used technical analysis',
        'Market makers favoured one of them',
      ],
      correctIndex: 1,
      explanation:
        'Charges scale with number of trades and notional value. High-frequency retail activity is structurally disadvantaged once costs are included.',
    },
    relatedIndicators: ['overtrading'],
    estimatedMinutes: 5,
  },
  {
    id: 'risk_management',
    title: 'Position Sizing & Risk Limits',
    summary: 'How much to risk on any single idea so one loss cannot sink you.',
    explanation:
      'Risk management answers two questions: (1) How large can this position be before a normal adverse move becomes painful? (2) What is the maximum loss I will accept on the whole portfolio this month? A practical starter rule is the 1–2 % rule: risk no more than 1–2 % of total capital on any single trade’s stop-loss distance. Position size then follows from the stop distance, not from conviction.',
    practicalExample:
      'With ₹10 lakh capital and a 2 % risk budget, the maximum loss allowed on one idea is ₹20,000. If the planned stop is 8 % below entry, the largest position is ₹20,000 / 0.08 = ₹2.5 lakh, not “as much as I feel confident about”.',
    keyTakeaway:
      'Size positions from the stop-loss, not from optimism. Survival first; returns second.',
    quiz: {
      question: 'You have ₹5 lakh capital and will risk 1.5 % per trade. Your stop is 6 % below entry. Maximum position value?',
      options: [
        '₹5 lakh (full capital)',
        '₹75,000',
        '₹1.25 lakh',
        '₹30,000',
      ],
      correctIndex: 2,
      explanation:
        'Risk amount = 0.015 × 5,00,000 = ₹7,500. Position = 7,500 / 0.06 = ₹1,25,000.',
    },
    relatedIndicators: ['panic_selling', 'concentration'],
    estimatedMinutes: 5,
  },
  {
    id: 'decision_discipline',
    title: 'FOMO, Momentum Chasing & Decision Discipline',
    summary: 'Recognising the urge to chase rising prices and building rules that stop it.',
    explanation:
      'FOMO (fear of missing out) shows up as repeated buys after a sharp recent rise, often with larger size than usual and little fresh analysis. Momentum can be real, but buying *because* something has already gone up is a different behaviour from buying a pre-planned breakout with a defined risk. The antidote is a written checklist: thesis, entry trigger, position size, and invalidation level — completed *before* the order is placed.',
    practicalExample:
      'In the demo scenario a stock rallied 14 % in three steps. The user bought three successive lots, each larger than the last, with no stop defined. When the stock retraced 9 %, the concentrated late entries produced a painful unrealised loss. A single pre-planned entry with a 7 % stop would have limited damage and removed the emotional cascade.',
    keyTakeaway:
      'If the only reason to buy is “it is going up”, you are transferring decision-making to the crowd. Write the plan first; then execute.',
    quiz: {
      question: 'Which behaviour is the clearest observable sign of FOMO-style chasing?',
      options: [
        'Rebalancing a portfolio once a quarter',
        'Buying additional shares of a stock that has already risen sharply in the last few sessions, with increasing size and no written stop',
        'Selling a loser that hit a pre-defined stop',
        'Holding an index fund through a correction',
      ],
      correctIndex: 1,
      explanation:
        'Repeated buys after a sharp rise, especially with rising size and no risk plan, is the classic behavioural pattern the indicator looks for.',
    },
    relatedIndicators: ['fomo'],
    estimatedMinutes: 5,
  },
] as const;

/** Lookup by stable id */
export function getLessonById(id: LessonId): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

/** All lessons that Market Mirror may recommend for a given indicator */
export function getLessonsForIndicator(indicator: IndicatorId): Lesson[] {
  return LESSONS.filter((l) => l.relatedIndicators.includes(indicator));
}

/** Primary (first) lesson recommended for each indicator — used by Member 3 mapping */
export const INDICATOR_TO_PRIMARY_LESSON: Record<IndicatorId, LessonId> = {
  fomo: 'decision_discipline',
  overtrading: 'transaction_costs',
  concentration: 'diversification',
  panic_selling: 'volatility',
};

export function getPrimaryLessonId(indicator: IndicatorId): LessonId {
  return INDICATOR_TO_PRIMARY_LESSON[indicator];
}

export function getAllLessons(): readonly Lesson[] {
  return LESSONS;
}
